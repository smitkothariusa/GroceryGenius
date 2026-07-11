"""
Validation tests for audit batch 3: request models must reject empty
strings, out-of-range numbers, and oversized lists with 422 — not pass
them through to OpenAI calls or in-memory storage.
"""
import base64

import pytest
from unittest.mock import MagicMock, patch
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


def test_vision_barcode_lookup_rejects_non_base64_image(client):
    """Not valid base64 at all -- decoding itself fails."""
    response = client.post("/barcode/vision-lookup", json={"image": "not-valid-base64!!!"})
    assert response.status_code == 400


def test_vision_barcode_lookup_rejects_non_image_bytes(client):
    """Valid base64, but the decoded bytes have no recognizable image
    signature (e.g. a text file base64-encoded and passed off as a photo).
    No OpenAI call should be made."""
    fake_text = base64.b64encode(b"this is plain text, not an image").decode()
    with patch("app.routers.barcode._openai_client") as mock_openai_client:
        response = client.post("/barcode/vision-lookup", json={"image": fake_text})
    assert response.status_code == 400
    mock_openai_client.assert_not_called()


def test_vision_barcode_lookup_accepts_valid_image_and_reaches_openai(client):
    """A real JPEG-signed payload passes validation and proceeds to the
    GPT-4o vision fallback (no zxingcpp match on junk bytes)."""
    fake_jpeg = base64.b64encode(b"\xff\xd8\xff" + b"fake-jpeg-body").decode()

    mock_message = MagicMock()
    mock_message.content = "unreadable"
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_vision_response = MagicMock()
    mock_vision_response.choices = [mock_choice]
    mock_vision_response.model = "gpt-4o"
    mock_vision_response.usage = MagicMock(prompt_tokens=50, completion_tokens=5)

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_vision_response

    with patch("app.routers.barcode._openai_client", return_value=mock_client):
        response = client.post("/barcode/vision-lookup", json={"image": fake_jpeg})

    assert response.status_code == 200
    mock_client.chat.completions.create.assert_called_once()
    assert response.json()["barcode"] == "unreadable"


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
