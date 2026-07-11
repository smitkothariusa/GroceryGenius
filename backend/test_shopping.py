from unittest.mock import patch, AsyncMock, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.services.auth import get_current_user
from app.routers.shopping import router


def make_app(user_id="test-user-uuid-1234"):
    """App with the shopping router, auth dependency overridden to a fixed user."""
    app = FastAPI()
    app.include_router(router, prefix="/shopping")
    mock_user = MagicMock()
    mock_user.id = user_id
    app.dependency_overrides[get_current_user] = lambda: mock_user
    return app


def test_ai_price_comparison_returns_totals():
    client = TestClient(make_app())

    with patch("app.routers.shopping.call_chat_completion", new_callable=AsyncMock, return_value='{"amazon": 12.5, "walmart": 10.0}'):
        response = client.post(
            "/shopping/ai-price-comparison",
            json={"items": [{"name": "Apples", "quantity": 2, "unit": "pc"}]},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["amazon_total"] == 12.5
    assert data["walmart_total"] == 10.0


def test_ai_price_comparison_strips_markdown_code_fences():
    client = TestClient(make_app())

    fenced = '```json\n{"amazon": 8.0, "walmart": 6.5}\n```'
    with patch("app.routers.shopping.call_chat_completion", new_callable=AsyncMock, return_value=fenced):
        response = client.post(
            "/shopping/ai-price-comparison",
            json={"items": [{"name": "Bread", "quantity": 1, "unit": "pc"}]},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["amazon_total"] == 8.0
    assert data["walmart_total"] == 6.5


def test_ai_price_comparison_empty_items_skips_openai_call():
    client = TestClient(make_app())

    with patch("app.routers.shopping.call_chat_completion", new_callable=AsyncMock) as mock_call:
        response = client.post("/shopping/ai-price-comparison", json={"items": []})

    assert response.status_code == 200
    data = response.json()
    assert data == {"amazon_total": 0, "walmart_total": 0}
    mock_call.assert_not_called()


def test_ai_price_comparison_unparseable_json_returns_500():
    client = TestClient(make_app())

    with patch("app.routers.shopping.call_chat_completion", new_callable=AsyncMock, return_value="not valid json"):
        response = client.post(
            "/shopping/ai-price-comparison",
            json={"items": [{"name": "Apples", "quantity": 2, "unit": "pc"}]},
        )

    assert response.status_code == 500
    assert "Failed to parse price estimation" in response.json()["detail"]


def test_ai_price_comparison_openai_exception_falls_back_to_estimate():
    """When the OpenAI call itself raises, the route falls back to a simple
    quantity-based estimate instead of erroring out."""
    client = TestClient(make_app())

    with patch("app.routers.shopping.call_chat_completion", new_callable=AsyncMock, side_effect=Exception("OpenAI down")):
        response = client.post(
            "/shopping/ai-price-comparison",
            json={"items": [{"name": "Apples", "quantity": 2, "unit": "pc"}]},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["amazon_total"] == round(2 * 3.5, 2)
    assert data["walmart_total"] == round(2 * 2.8, 2)


def test_ai_price_comparison_uses_low_temperature():
    """Guards against a regression back to the old temperature=0.8 (task 05
    lowered this to 0.3 for deterministic estimates)."""
    client = TestClient(make_app())

    captured = {}

    async def fake_call_chat_completion(**kwargs):
        captured.update(kwargs)
        return '{"amazon": 5.0, "walmart": 4.0}'

    with patch("app.routers.shopping.call_chat_completion", new=fake_call_chat_completion):
        response = client.post(
            "/shopping/ai-price-comparison",
            json={"items": [{"name": "Milk", "quantity": 1, "unit": "gallon"}]},
        )

    assert response.status_code == 200
    assert captured["temperature"] == 0.3


def test_ai_price_comparison_requires_auth():
    """POST /shopping/ai-price-comparison without a token returns 401 (auth applied at app.main inclusion)."""
    from app.main import app as main_app
    client = TestClient(main_app)

    response = client.post("/shopping/ai-price-comparison", json={"items": []})
    assert response.status_code == 401
