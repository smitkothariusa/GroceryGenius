import json
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.services.auth import get_current_user
from app.routers.pantry import router


def make_app(user_id="test-user-uuid-1234"):
    """App with the pantry router, auth dependency overridden to a fixed user."""
    app = FastAPI()
    app.include_router(router, prefix="/pantry")
    mock_user = MagicMock()
    mock_user.id = user_id
    app.dependency_overrides[get_current_user] = lambda: mock_user
    return app


def test_match_ingredients_returns_matches():
    client = TestClient(make_app())

    mock_result = [
        {
            "ingredient_name": "rice",
            "quantity": 1.0,
            "unit": "cup",
            "pantry_id": "1",
            "pantry_name": "rice",
            "pantry_quantity": 5.0,
            "pantry_unit": "cup",
            "remainder": 4.0,
        }
    ]

    with patch("app.routers.pantry.call_chat_completion", new_callable=AsyncMock, return_value=json.dumps(mock_result)):
        response = client.post(
            "/pantry/match-ingredients",
            json={
                "ingredient_lines": ["1 cup rice"],
                "pantry_items": [{"id": "1", "name": "rice", "quantity": 5, "unit": "cup"}],
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data[0]["pantry_id"] == "1"
    assert data[0]["remainder"] == 4.0


def test_match_ingredients_strips_markdown_code_fences():
    client = TestClient(make_app())

    mock_result = [{
        "ingredient_name": "flour", "quantity": 2.0, "unit": "cup",
        "pantry_id": None, "pantry_name": None,
        "pantry_quantity": None, "pantry_unit": None, "remainder": None,
    }]
    fenced = "```json\n" + json.dumps(mock_result) + "\n```"

    with patch("app.routers.pantry.call_chat_completion", new_callable=AsyncMock, return_value=fenced):
        response = client.post(
            "/pantry/match-ingredients",
            json={
                "ingredient_lines": ["2 cups flour"],
                "pantry_items": [{"id": "1", "name": "sugar", "quantity": 1, "unit": "cup"}],
            },
        )

    assert response.status_code == 200
    assert response.json()[0]["ingredient_name"] == "flour"


def test_match_ingredients_empty_pantry_skips_openai_call():
    """With no pantry items, ingredients are returned unmatched without calling OpenAI."""
    client = TestClient(make_app())

    with patch("app.routers.pantry.call_chat_completion", new_callable=AsyncMock) as mock_call:
        response = client.post(
            "/pantry/match-ingredients",
            json={"ingredient_lines": ["1 cup rice", "2 eggs"], "pantry_items": []},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(item["pantry_id"] is None for item in data)
    mock_call.assert_not_called()


def test_match_ingredients_blank_lines_filtered_before_matching():
    client = TestClient(make_app())

    with patch("app.routers.pantry.call_chat_completion", new_callable=AsyncMock) as mock_call:
        response = client.post(
            "/pantry/match-ingredients",
            json={"ingredient_lines": ["   ", "\t"], "pantry_items": []},
        )

    assert response.status_code == 200
    assert response.json() == []
    mock_call.assert_not_called()


def test_match_ingredients_openai_failure_returns_500():
    client = TestClient(make_app())

    with patch("app.routers.pantry.call_chat_completion", new_callable=AsyncMock, side_effect=Exception("OpenAI down")):
        response = client.post(
            "/pantry/match-ingredients",
            json={
                "ingredient_lines": ["1 cup rice"],
                "pantry_items": [{"id": "1", "name": "rice", "quantity": 5, "unit": "cup"}],
            },
        )

    assert response.status_code == 500
    assert "Failed to match ingredients" in response.json()["detail"]


def test_match_ingredients_invalid_json_returns_500():
    client = TestClient(make_app())

    with patch("app.routers.pantry.call_chat_completion", new_callable=AsyncMock, return_value="not valid json"):
        response = client.post(
            "/pantry/match-ingredients",
            json={
                "ingredient_lines": ["1 cup rice"],
                "pantry_items": [{"id": "1", "name": "rice", "quantity": 5, "unit": "cup"}],
            },
        )

    assert response.status_code == 500


def test_match_ingredients_requires_auth():
    """POST /pantry/match-ingredients without a token returns 401 (auth applied at app.main inclusion)."""
    from app.main import app as main_app
    client = TestClient(main_app)

    response = client.post(
        "/pantry/match-ingredients",
        json={"ingredient_lines": ["1 cup rice"], "pantry_items": []},
    )
    assert response.status_code == 401


def test_match_ingredients_result_independent_of_which_user_calls_it():
    """The endpoint is stateless: two different authenticated users sending the
    same payload get the same result -- there's no per-user pantry data leaking
    into (or out of) the AI matching response."""
    mock_result = [{
        "ingredient_name": "rice", "quantity": 1.0, "unit": "cup",
        "pantry_id": "1", "pantry_name": "rice",
        "pantry_quantity": 5.0, "pantry_unit": "cup", "remainder": 4.0,
    }]
    payload = {
        "ingredient_lines": ["1 cup rice"],
        "pantry_items": [{"id": "1", "name": "rice", "quantity": 5, "unit": "cup"}],
    }

    with patch("app.routers.pantry.call_chat_completion", new_callable=AsyncMock, return_value=json.dumps(mock_result)):
        client_a = TestClient(make_app(user_id="user-a"))
        response_a = client_a.post("/pantry/match-ingredients", json=payload)

        client_b = TestClient(make_app(user_id="user-b"))
        response_b = client_b.post("/pantry/match-ingredients", json=payload)

    assert response_a.status_code == response_b.status_code == 200
    assert response_a.json() == response_b.json()
