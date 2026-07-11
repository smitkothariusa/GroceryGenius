"""
Validation tests for audit batch 3: request models must reject empty
strings, out-of-range numbers, and oversized lists with 422 — not pass
them through to OpenAI calls or in-memory storage.
"""
import pytest
from unittest.mock import MagicMock
from fastapi import Request
from fastapi.testclient import TestClient

from app.services.auth import get_current_user


@pytest.fixture
def client():
    """TestClient against the real app, auth dependency overridden to a fixed user."""
    from app.main import app

    mock_user = MagicMock()
    mock_user.id = "validation-test-user"

    def override_user(request: Request):
        request.state.user_id = mock_user.id
        return mock_user

    app.dependency_overrides[get_current_user] = override_user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


# ---------------------------------------------------------------------------
# recipes.py
# ---------------------------------------------------------------------------

def test_translate_names_rejects_empty_language(client):
    response = client.post("/recipes/translate-names", json={"names": ["Pasta"], "language": ""})
    assert response.status_code == 422


def test_translate_full_rejects_empty_language(client):
    response = client.post("/recipes/translate-full", json={"recipes": [], "language": ""})
    assert response.status_code == 422


def test_translate_full_rejects_oversized_recipe_dict(client):
    huge_recipe = {"name": "x" * 25_000}
    response = client.post(
        "/recipes/translate-full",
        json={"recipes": [huge_recipe], "language": "es"},
    )
    assert response.status_code == 422


def test_translate_full_rejects_recipe_with_too_many_fields(client):
    bloated_recipe = {f"field{i}": "x" for i in range(31)}
    response = client.post(
        "/recipes/translate-full",
        json={"recipes": [bloated_recipe], "language": "es"},
    )
    assert response.status_code == 422


def test_parse_ingredients_rejects_empty_lines_list(client):
    response = client.post("/recipes/parse-ingredients", json={"lines": []})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# barcode.py
# ---------------------------------------------------------------------------

def test_ai_barcode_lookup_rejects_empty_barcode(client):
    response = client.post("/barcode/ai-lookup", json={"barcode": ""})
    assert response.status_code == 422


def test_ai_barcode_lookup_rejects_non_numeric_barcode(client):
    response = client.post("/barcode/ai-lookup", json={"barcode": "12; DROP TABLE users;"})
    assert response.status_code == 422


def test_ai_barcode_lookup_rejects_too_short_barcode(client):
    response = client.post("/barcode/ai-lookup", json={"barcode": "123"})
    assert response.status_code == 422


def test_vision_barcode_lookup_rejects_empty_image(client):
    response = client.post("/barcode/vision-lookup", json={"image": ""})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# pantry.py
# ---------------------------------------------------------------------------

def test_match_ingredients_rejects_negative_pantry_quantity(client):
    response = client.post(
        "/pantry/match-ingredients",
        json={
            "ingredient_lines": ["1 cup rice"],
            "pantry_items": [{"id": "1", "name": "rice", "quantity": -5, "unit": "cup"}],
        },
    )
    assert response.status_code == 422


def test_match_ingredients_rejects_empty_pantry_item_name(client):
    response = client.post(
        "/pantry/match-ingredients",
        json={
            "ingredient_lines": ["1 cup rice"],
            "pantry_items": [{"id": "1", "name": "", "quantity": 1, "unit": "cup"}],
        },
    )
    assert response.status_code == 422


def test_match_ingredients_rejects_absurdly_large_pantry_quantity(client):
    response = client.post(
        "/pantry/match-ingredients",
        json={
            "ingredient_lines": ["1 cup rice"],
            "pantry_items": [{"id": "1", "name": "rice", "quantity": 999_999_999, "unit": "cup"}],
        },
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# shopping.py
# ---------------------------------------------------------------------------

def test_price_comparison_rejects_negative_quantity(client):
    response = client.post(
        "/shopping/ai-price-comparison",
        json={"items": [{"name": "Apples", "quantity": -3, "unit": "pc"}]},
    )
    assert response.status_code == 422


def test_price_comparison_rejects_empty_item_name(client):
    response = client.post(
        "/shopping/ai-price-comparison",
        json={"items": [{"name": "", "quantity": 2, "unit": "pc"}]},
    )
    assert response.status_code == 422


def test_price_comparison_rejects_oversized_items_list(client):
    items = [{"name": "Apples", "quantity": 1, "unit": "pc"} for _ in range(101)]
    response = client.post("/shopping/ai-price-comparison", json={"items": items})
    assert response.status_code == 422


def test_price_comparison_uses_low_temperature_for_deterministic_estimates(client, monkeypatch):
    """
    Price estimates should be stable across repeated calls for the same
    basket, not the high-variance sampling appropriate for creative text.
    Guards against a regression back to temperature=0.8.
    """
    import app.routers.shopping as shopping_module

    captured = {}

    async def fake_call_chat_completion(**kwargs):
        captured.update(kwargs)
        return '{"amazon": 12.5, "walmart": 10.0}'

    monkeypatch.setattr(shopping_module, "call_chat_completion", fake_call_chat_completion)

    response = client.post(
        "/shopping/ai-price-comparison",
        json={"items": [{"name": "Apples", "quantity": 2, "unit": "pc"}]},
    )

    assert response.status_code == 200
    assert captured["temperature"] <= 0.3
    body = response.json()
    assert body["amazon_total"] == 12.5
    assert body["walmart_total"] == 10.0


# ---------------------------------------------------------------------------
# donation.py
# ---------------------------------------------------------------------------

def test_donation_impact_rejects_negative_quantity(client):
    response = client.post(
        "/donation/calculate-impact",
        json={"items": [{"name": "milk", "quantity": -1, "unit": "gallon"}]},
    )
    assert response.status_code == 422


def test_donation_impact_rejects_empty_unit(client):
    response = client.post(
        "/donation/calculate-impact",
        json={"items": [{"name": "milk", "quantity": 1, "unit": ""}]},
    )
    assert response.status_code == 422


def test_donation_impact_rejects_oversized_items_list(client):
    items = [{"name": "milk", "quantity": 1, "unit": "gallon"} for _ in range(501)]
    response = client.post("/donation/calculate-impact", json={"items": items})
    assert response.status_code == 422


def test_donation_impact_accepts_valid_payload(client):
    response = client.post(
        "/donation/calculate-impact",
        json={"items": [{"name": "milk", "quantity": 1, "unit": "gallon"}]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_meals"] > 0


# ---------------------------------------------------------------------------
# profile.py
# ---------------------------------------------------------------------------

def test_dietary_label_rejects_empty_text(client):
    response = client.post("/profile/dietary-label", json={"text": ""})
    assert response.status_code == 422
