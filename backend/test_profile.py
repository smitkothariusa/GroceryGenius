import pytest
import json
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

def test_dietary_label_returns_label_and_description(monkeypatch):
    """POST /profile/dietary-label returns {label, description} from OpenAI."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    client = TestClient(app)

    mock_response = json.dumps({"label": "Mediterranean (No Shellfish)", "description": "A Mediterranean diet excluding shellfish."})

    with patch("app.routers.profile.call_chat_completion", new_callable=AsyncMock, return_value=mock_response):
        response = client.post("/profile/dietary-label", json={"text": "Mediterranean diet with no shellfish"})

    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "Mediterranean (No Shellfish)"
    assert "shellfish" in data["description"].lower()


def test_dietary_label_fallback_on_openai_failure(monkeypatch):
    """POST /profile/dietary-label falls back gracefully if OpenAI call raises."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    client = TestClient(app)

    with patch("app.routers.profile.call_chat_completion", new_callable=AsyncMock, side_effect=Exception("OpenAI down")):
        response = client.post("/profile/dietary-label", json={"text": "My very long custom diet name that exceeds thirty characters easily"})

    assert response.status_code == 200
    data = response.json()
    assert len(data["label"]) <= 33  # truncated to 30 chars + "..."
    assert data["description"] == ""
