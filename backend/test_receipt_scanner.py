import json
from unittest.mock import patch, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.services.auth import get_current_user
from app.routers.vision import router


def make_app(user_id="test-user-uuid-1234"):
    """App with the vision router, auth dependency overridden to a fixed user."""
    app = FastAPI()
    app.include_router(router, prefix="/vision")
    mock_user = MagicMock()
    mock_user.id = user_id
    app.dependency_overrides[get_current_user] = lambda: mock_user
    return app


def _mock_openai_response(payload: dict):
    mock_message = MagicMock()
    mock_message.content = json.dumps(payload)
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model = "gpt-4o"
    mock_response.usage = MagicMock(prompt_tokens=100, completion_tokens=50)
    return mock_response


def test_analyze_receipt_returns_parsed_items():
    client = TestClient(make_app())

    payload = {
        "items": [
            {"name": "Organic Banana", "quantity": 1.24, "unit": "lb", "category": "produce", "confidence": "high", "raw_text": "ORG BANANA 1.24 lb"},
            {"name": "2% Milk", "quantity": 1, "unit": "gal", "category": "dairy", "confidence": "medium", "raw_text": "GV 2% MLK GAL"},
        ],
        "rejected_lines_count": 3,
    }
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_openai_response(payload)

    with patch("app.routers.vision.OpenAI", return_value=mock_client):
        response = client.post(
            "/vision/analyze-receipt",
            files={"file": ("receipt.jpg", b"fake-image-bytes", "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["items"]) == 2
    assert data["items"][0]["name"] == "Organic Banana"
    assert data["items"][0]["confidence"] == "high"
    assert data["rejected_lines_count"] == 3


def test_analyze_receipt_drops_invalid_items_and_normalizes_fields():
    client = TestClient(make_app())

    payload = {
        "items": [
            {"name": "", "quantity": 1, "unit": "ea", "category": "other", "confidence": "high"},  # dropped: empty name
            {"name": "Cereal", "quantity": "bad-number", "unit": "", "category": "not-a-real-category", "confidence": "unsure"},
        ],
        "rejected_lines_count": -5,
    }
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_openai_response(payload)

    with patch("app.routers.vision.OpenAI", return_value=mock_client):
        response = client.post(
            "/vision/analyze-receipt",
            files={"file": ("receipt.jpg", b"fake-image-bytes", "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["name"] == "Cereal"
    assert item["quantity"] is None  # unparseable quantity becomes null, not a guessed 1
    assert item["unit"] == "ea"  # empty unit fell back to "ea"
    assert item["category"] == "other"  # invalid category fell back to "other"
    assert item["confidence"] == "low"  # invalid confidence fell back to "low"
    assert data["rejected_lines_count"] == 0  # negative clamped to 0


def test_analyze_receipt_null_quantity_stays_null():
    """A line with no stated quantity/weight should stay null, not default to 1."""
    client = TestClient(make_app())

    payload = {
        "items": [
            {"name": "Mystery Snack", "quantity": None, "unit": "ea", "category": "snacks", "confidence": "medium", "raw_text": "MYSTERY SNACK"},
            {"name": "Organic Banana", "quantity": 0, "unit": "lb", "category": "produce", "confidence": "high"},  # zero treated as unstated
        ],
        "rejected_lines_count": 0,
    }
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_openai_response(payload)

    with patch("app.routers.vision.OpenAI", return_value=mock_client):
        response = client.post(
            "/vision/analyze-receipt",
            files={"file": ("receipt.jpg", b"fake-image-bytes", "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["quantity"] is None
    assert data["items"][1]["quantity"] is None


def test_analyze_receipt_no_items_found():
    client = TestClient(make_app())

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_openai_response(
        {"items": [], "rejected_lines_count": 0}
    )

    with patch("app.routers.vision.OpenAI", return_value=mock_client):
        response = client.post(
            "/vision/analyze-receipt",
            files={"file": ("receipt.jpg", b"fake-image-bytes", "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []


def test_analyze_receipt_image_too_large_returns_413():
    client = TestClient(make_app())

    oversized = b"x" * (8 * 1024 * 1024 + 1)
    response = client.post(
        "/vision/analyze-receipt",
        files={"file": ("receipt.jpg", oversized, "image/jpeg")},
    )

    assert response.status_code == 413


def test_analyze_receipt_openai_failure_returns_500():
    client = TestClient(make_app())

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("OpenAI down")

    with patch("app.routers.vision.OpenAI", return_value=mock_client):
        response = client.post(
            "/vision/analyze-receipt",
            files={"file": ("receipt.jpg", b"fake-image-bytes", "image/jpeg")},
        )

    assert response.status_code == 500


def test_analyze_receipt_requires_auth():
    """POST /vision/analyze-receipt without a token returns 401 (auth applied at app.main inclusion)."""
    from app.main import app as main_app
    client = TestClient(main_app)

    response = client.post(
        "/vision/analyze-receipt",
        files={"file": ("receipt.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert response.status_code == 401
