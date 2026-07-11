"""
Tests for the shared ingredient-parsing helpers (app/services/ingredient_parsing.py)
and the router endpoints that were refactored to use them (pantry.match_ingredients,
recipes.parse_ingredients, shopping.ai_price_comparison). These lock in the
pre-refactor behavior of the duplicated inline code (line cleaning + markdown
code-fence stripping) so the extraction is provably behavior-preserving.
"""
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi import Request
from fastapi.testclient import TestClient

from app.services.auth import get_current_user
from app.services.ingredient_parsing import clean_ingredient_lines, strip_json_code_fences


# ---------------------------------------------------------------------------
# Unit tests: clean_ingredient_lines
# ---------------------------------------------------------------------------

def test_clean_ingredient_lines_strips_whitespace():
    assert clean_ingredient_lines(["  apples  ", "1 cup rice"]) == ["apples", "1 cup rice"]


def test_clean_ingredient_lines_drops_blank_and_whitespace_only():
    assert clean_ingredient_lines(["apples", "", "   ", "\t", "rice"]) == ["apples", "rice"]


def test_clean_ingredient_lines_empty_input():
    assert clean_ingredient_lines([]) == []


def test_clean_ingredient_lines_all_blank():
    assert clean_ingredient_lines(["", "  ", "\n"]) == []


# ---------------------------------------------------------------------------
# Unit tests: strip_json_code_fences
# ---------------------------------------------------------------------------

def test_strip_json_code_fences_removes_json_fence():
    raw = '```json\n[{"name": "apple"}]\n```'
    assert strip_json_code_fences(raw) == '[{"name": "apple"}]'


def test_strip_json_code_fences_removes_bare_fence():
    raw = '```\n{"amazon": 1, "walmart": 2}\n```'
    assert strip_json_code_fences(raw) == '{"amazon": 1, "walmart": 2}'


def test_strip_json_code_fences_noop_on_plain_json():
    raw = '[{"name": "apple"}]'
    assert strip_json_code_fences(raw) == '[{"name": "apple"}]'


def test_strip_json_code_fences_trims_surrounding_whitespace():
    raw = '   {"a": 1}   '
    assert strip_json_code_fences(raw) == '{"a": 1}'


# ---------------------------------------------------------------------------
# Router-level tests: lock in end-to-end behavior post-refactor
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """TestClient against the real app, auth dependency overridden to a fixed user."""
    from app.main import app

    mock_user = MagicMock()
    mock_user.id = "ingredient-parsing-test-user"

    def override_user(request: Request):
        request.state.user_id = mock_user.id
        return mock_user

    app.dependency_overrides[get_current_user] = override_user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_parse_ingredients_strips_blank_lines_and_fenced_json(client):
    """recipes.py /parse-ingredients: blank lines are dropped before the AI call,
    and a ```json-fenced response is unwrapped correctly."""
    fenced_response = '```json\n[{"name": "apples", "quantity": 2.0, "unit": "pc"}]\n```'
    with patch("app.routers.recipes.call_chat_completion", return_value=fenced_response) as mock_call:
        response = client.post(
            "/recipes/parse-ingredients",
            json={"lines": ["  2 apples  ", "", "   "]},
        )
    assert response.status_code == 200
    assert response.json() == [{"name": "apples", "quantity": 2.0, "unit": "pc"}]
    # only the non-blank, stripped line should have reached the AI call
    user_prompt = mock_call.call_args.args[1] if len(mock_call.call_args.args) > 1 else mock_call.call_args.kwargs.get("user_prompt")
    assert user_prompt == "2 apples"


def test_parse_ingredients_all_blank_lines_short_circuits(client):
    with patch("app.routers.recipes.call_chat_completion") as mock_call:
        response = client.post("/recipes/parse-ingredients", json={"lines": ["   "]})
    assert response.status_code == 200
    assert response.json() == []
    mock_call.assert_not_called()


def test_match_ingredients_strips_blank_lines_and_fenced_json(client):
    """pantry.py /match-ingredients: blank lines dropped, fenced JSON unwrapped."""
    fenced_response = (
        '```json\n[{"ingredient_name": "apples", "quantity": 2.0, "unit": "pc", '
        '"pantry_id": null, "pantry_name": null, "pantry_quantity": null, '
        '"pantry_unit": null, "remainder": null}]\n```'
    )
    with patch("app.routers.pantry.call_chat_completion", return_value=fenced_response):
        response = client.post(
            "/pantry/match-ingredients",
            json={
                "ingredient_lines": ["  2 apples  ", "", "  "],
                "pantry_items": [
                    {"id": "1", "name": "apples", "quantity": 5, "unit": "pc"}
                ],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body == [
        {
            "ingredient_name": "apples",
            "quantity": 2.0,
            "unit": "pc",
            "pantry_id": None,
            "pantry_name": None,
            "pantry_quantity": None,
            "pantry_unit": None,
            "remainder": None,
        }
    ]


def test_match_ingredients_no_pantry_still_parses_lines(client):
    """With no pantry items, the endpoint short-circuits and echoes back the
    stripped, non-blank lines without calling the AI."""
    with patch("app.routers.pantry.call_chat_completion") as mock_call:
        response = client.post(
            "/pantry/match-ingredients",
            json={"ingredient_lines": ["  2 apples  ", "", "  "], "pantry_items": []},
        )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["ingredient_name"] == "2 apples"
    mock_call.assert_not_called()


def test_ai_price_comparison_strips_fenced_json(client):
    """shopping.py /ai-price-comparison: fenced JSON price response is unwrapped."""
    fenced_response = '```json\n{"amazon": 12.5, "walmart": 10.0}\n```'
    with patch("app.routers.shopping.call_chat_completion", return_value=fenced_response):
        response = client.post(
            "/shopping/ai-price-comparison",
            json={"items": [{"name": "apples", "quantity": 2, "unit": "pc"}]},
        )
    assert response.status_code == 200
    assert response.json() == {"amazon_total": 12.5, "walmart_total": 10.0}
