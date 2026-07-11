import asyncio
import json
import logging
from unittest.mock import MagicMock, patch

import httpx
from fastapi import Request
from fastapi.testclient import TestClient

from app.services.auth import get_current_user
from app.services.logging_config import RequestIdFilter


def override_user(user_id="observability-test-user"):
    mock_user = MagicMock()
    mock_user.id = user_id

    def _override(request: Request):
        request.state.user_id = mock_user.id
        return mock_user

    return _override


def test_response_carries_request_id_matching_log_line(caplog):
    from app.main import app

    request_filter = RequestIdFilter()
    caplog.handler.addFilter(request_filter)
    try:
        with caplog.at_level(logging.INFO, logger="app.request"):
            client = TestClient(app)
            response = client.get("/health")
    finally:
        caplog.handler.removeFilter(request_filter)

    request_id = response.headers.get("X-Request-ID")
    assert request_id, "X-Request-ID header missing"

    request_logs = [r for r in caplog.records if r.name == "app.request"]
    assert any(
        getattr(r, "request_id", "") == request_id and "GET /health" in r.getMessage()
        for r in request_logs
    ), f"no request log line with req={request_id}: {[r.getMessage() for r in request_logs]}"


def test_oversized_payload_returns_422_without_echoing_it():
    from app.main import app

    app.dependency_overrides[get_current_user] = override_user()
    try:
        client = TestClient(app)
        oversized = "x" * 501
        response = client.post("/profile/dietary-label", json={"text": oversized})
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 422
    assert oversized not in response.text, "422 response echoed the oversized payload"


def test_oversized_image_returns_413():
    from app.main import app

    app.dependency_overrides[get_current_user] = override_user()
    try:
        client = TestClient(app)
        big_image = b"\xff" * (8 * 1024 * 1024 + 1)
        response = client.post(
            "/vision/analyze-ingredients",
            files={"file": ("big.jpg", big_image, "image/jpeg")},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 413


def test_call_chat_completion_retries_connect_error_once():
    from app.services import openai_client

    url = openai_client.OPENAI_CHAT_URL
    calls = {"count": 0}

    class FlakyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, *args, **kwargs):
            calls["count"] += 1
            if calls["count"] == 1:
                raise httpx.ConnectError("connection refused")
            return httpx.Response(
                200,
                json={
                    "model": "gpt-4o-mini",
                    "usage": {"prompt_tokens": 10, "completion_tokens": 5},
                    "choices": [{"message": {"content": "retried ok"}}],
                },
                request=httpx.Request("POST", url),
            )

    async def no_sleep(_seconds):
        return None

    with patch.object(openai_client.httpx, "AsyncClient", FlakyClient), \
         patch.object(openai_client.asyncio, "sleep", no_sleep):
        result = asyncio.run(openai_client.call_chat_completion("system", "user"))

    assert result == "retried ok"
    assert calls["count"] == 2


def test_openai_usage_logged_with_cost(caplog):
    from app.services import openai_client

    with caplog.at_level(logging.INFO, logger="app.services.openai_client"):
        openai_client.log_openai_usage(
            "gpt-4o-mini", 123.4, {"prompt_tokens": 1000, "completion_tokens": 500},
            route="recipes.generate_recipes",
        )

    line = next(r.getMessage() for r in caplog.records if "openai call" in r.getMessage())
    assert "route=recipes.generate_recipes" in line
    assert "model=gpt-4o-mini" in line
    assert "prompt_tokens=1000" in line
    assert "completion_tokens=500" in line
    assert "total_tokens=1500" in line
    # 1000 * 0.15/1M + 500 * 0.60/1M = 0.00045
    assert "est_cost_usd=0.000450" in line


def test_openai_usage_logged_without_route_defaults_to_dash(caplog):
    """route is optional — callers that omit it still produce a valid, parseable log line."""
    from app.services import openai_client

    with caplog.at_level(logging.INFO, logger="app.services.openai_client"):
        openai_client.log_openai_usage(
            "gpt-4o", 50.0, {"prompt_tokens": 10, "completion_tokens": 5}
        )

    line = next(r.getMessage() for r in caplog.records if "openai call" in r.getMessage())
    assert "route=-" in line
    assert "model=gpt-4o" in line


def test_call_chat_completion_logs_calling_route(caplog):
    """call_chat_completion propagates its `route` kwarg through to the usage log line."""
    from app.services import openai_client

    url = openai_client.OPENAI_CHAT_URL

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, *args, **kwargs):
            return httpx.Response(
                200,
                json={
                    "model": "gpt-4o-mini",
                    "usage": {"prompt_tokens": 20, "completion_tokens": 10, "total_tokens": 30},
                    "choices": [{"message": {"content": "ok"}}],
                },
                request=httpx.Request("POST", url),
            )

    with caplog.at_level(logging.INFO, logger="app.services.openai_client"), \
         patch.object(openai_client.httpx, "AsyncClient", FakeClient):
        result = asyncio.run(
            openai_client.call_chat_completion(
                "system", "user", route="pantry.match_ingredients"
            )
        )

    assert result == "ok"
    line = next(r.getMessage() for r in caplog.records if "openai call" in r.getMessage())
    assert "route=pantry.match_ingredients" in line
    assert "model=gpt-4o-mini" in line
    assert "total_tokens=30" in line
