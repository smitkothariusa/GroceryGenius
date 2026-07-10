import json
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi import Depends, FastAPI, Request
from fastapi.testclient import TestClient

from app.services.auth import get_current_user


def make_app():
    """Minimal app with one route protected by the shared auth dependency."""
    app = FastAPI()

    @app.get("/protected")
    def protected(user=Depends(get_current_user)):
        return {"user_id": user.id}

    return app


def test_missing_authorization_header_returns_401():
    client = TestClient(make_app())
    response = client.get("/protected")
    assert response.status_code == 401


def test_non_bearer_authorization_returns_401():
    client = TestClient(make_app())
    response = client.get("/protected", headers={"Authorization": "Basic abc123"})
    assert response.status_code == 401


def test_invalid_token_returns_401():
    mock_sb = MagicMock()
    mock_sb.auth.get_user.side_effect = Exception("invalid JWT")

    with patch("app.services.auth.create_client", return_value=mock_sb), \
         patch("app.services.auth.SUPABASE_URL", "http://test.supabase.co"), \
         patch("app.services.auth.SUPABASE_ANON_KEY", "test-anon-key"):
        client = TestClient(make_app())
        response = client.get("/protected", headers={"Authorization": "Bearer bad-token"})

    assert response.status_code == 401


def test_empty_user_response_returns_401():
    mock_user_response = MagicMock()
    mock_user_response.user = None
    mock_sb = MagicMock()
    mock_sb.auth.get_user.return_value = mock_user_response

    with patch("app.services.auth.create_client", return_value=mock_sb), \
         patch("app.services.auth.SUPABASE_URL", "http://test.supabase.co"), \
         patch("app.services.auth.SUPABASE_ANON_KEY", "test-anon-key"):
        client = TestClient(make_app())
        response = client.get("/protected", headers={"Authorization": "Bearer expired-token"})

    assert response.status_code == 401


def test_valid_token_returns_user():
    mock_user = MagicMock()
    mock_user.id = "user-uuid-42"
    mock_user_response = MagicMock()
    mock_user_response.user = mock_user
    mock_sb = MagicMock()
    mock_sb.auth.get_user.return_value = mock_user_response

    with patch("app.services.auth.create_client", return_value=mock_sb), \
         patch("app.services.auth.SUPABASE_URL", "http://test.supabase.co"), \
         patch("app.services.auth.SUPABASE_ANON_KEY", "test-anon-key"):
        client = TestClient(make_app())
        response = client.get("/protected", headers={"Authorization": "Bearer good-token"})

    assert response.status_code == 200
    assert response.json() == {"user_id": "user-uuid-42"}
    mock_sb.auth.get_user.assert_called_once_with("good-token")


def test_ai_routes_reject_tokenless_requests():
    """Every AI router registered in app.main must 401 without a token."""
    from app.main import app
    client = TestClient(app)

    attempts = [
        ("post", "/recipes/", {"json": {"ingredients": ["rice"]}}),
        ("post", "/recipes/translate-names", {"json": {"names": ["x"], "language": "es"}}),
        ("post", "/recipes/translate-full", {"json": {"recipes": [], "language": "es"}}),
        ("post", "/recipes/parse-ingredients", {"json": {"lines": ["1 cup rice"]}}),
        ("post", "/vision/analyze-ingredients", {"files": {"file": ("a.jpg", b"xx", "image/jpeg")}}),
        ("post", "/barcode/vision-lookup", {"json": {"image": "aGk="}}),
        ("post", "/barcode/ai-lookup", {"json": {"barcode": "012345678905"}}),
        ("post", "/pantry/match-ingredients", {"json": {"ingredient_lines": [], "pantry_items": []}}),
        ("post", "/shopping/ai-price-comparison", {"json": {"items": []}}),
        ("post", "/profile/dietary-label", {"json": {"text": "vegan"}}),
        ("delete", "/profile/account", {}),
    ]
    for method, path, kwargs in attempts:
        response = getattr(client, method)(path, **kwargs)
        assert response.status_code == 401, f"{method.upper()} {path} returned {response.status_code}, expected 401"


def test_health_stays_public():
    from app.main import app
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200


def test_rate_limit_returns_429_after_limit():
    """dietary-label allows 30/minute per user; the 31st call must 429."""
    from app.main import app

    mock_user = MagicMock()
    mock_user.id = "rate-limit-test-user"

    def override_user(request: Request):
        request.state.user_id = mock_user.id
        return mock_user

    mock_response = json.dumps({"label": "Vegan", "description": "No animal products."})
    app.dependency_overrides[get_current_user] = override_user
    try:
        client = TestClient(app)
        with patch("app.routers.profile.call_chat_completion", new_callable=AsyncMock, return_value=mock_response):
            statuses = [
                client.post("/profile/dietary-label", json={"text": "vegan"}).status_code
                for _ in range(31)
            ]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert all(s == 200 for s in statuses[:30])
    assert statuses[30] == 429
