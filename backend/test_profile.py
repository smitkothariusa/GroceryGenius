import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.services.auth import get_current_user


def make_app(user_id="test-user-uuid-1234"):
    """App with the profile router, auth dependency overridden to a fixed user."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    mock_user = MagicMock()
    mock_user.id = user_id
    app.dependency_overrides[get_current_user] = lambda: mock_user
    return app


def test_dietary_label_returns_label_and_description():
    """POST /profile/dietary-label returns {label, description} from OpenAI."""
    client = TestClient(make_app())

    mock_response = json.dumps({"label": "Mediterranean (No Shellfish)", "description": "A Mediterranean diet excluding shellfish."})

    with patch("app.routers.profile.call_chat_completion", new_callable=AsyncMock, return_value=mock_response):
        response = client.post("/profile/dietary-label", json={"text": "Mediterranean diet with no shellfish"})

    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "Mediterranean (No Shellfish)"
    assert "shellfish" in data["description"].lower()


def test_dietary_label_fallback_on_openai_failure():
    """POST /profile/dietary-label falls back gracefully if OpenAI call raises."""
    client = TestClient(make_app())

    with patch("app.routers.profile.call_chat_completion", new_callable=AsyncMock, side_effect=Exception("OpenAI down")):
        response = client.post("/profile/dietary-label", json={"text": "My very long custom diet name that exceeds thirty characters easily"})

    assert response.status_code == 200
    data = response.json()
    assert len(data["label"]) <= 33  # truncated to 30 chars + "..."
    assert data["description"] == ""


def test_dietary_label_requires_auth():
    """POST /profile/dietary-label without a token returns 401 (no dependency override)."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    client = TestClient(app)

    response = client.post("/profile/dietary-label", json={"text": "vegan"})
    assert response.status_code == 401


def test_delete_account_valid_token_returns_deleted():
    """DELETE /profile/account with a valid token deletes all user data and returns {deleted: True}."""
    client = TestClient(make_app())

    mock_table = MagicMock()
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.execute.return_value = MagicMock()

    mock_service_auth = MagicMock()
    mock_service_auth.admin.delete_user.return_value = MagicMock()

    mock_service_client = MagicMock()
    mock_service_client.table.return_value = mock_table
    mock_service_client.auth = mock_service_auth

    with patch("app.routers.profile.create_client", return_value=mock_service_client), \
         patch("app.routers.profile.SUPABASE_SERVICE_KEY", "test-service-key"):
        response = client.delete(
            "/profile/account",
            headers={"Authorization": "Bearer valid-token-abc"}
        )

    assert response.status_code == 200
    assert response.json() == {"deleted": True}
    mock_service_auth.admin.delete_user.assert_called_once_with("test-user-uuid-1234")


def test_delete_account_missing_service_key_returns_500():
    """DELETE /profile/account returns 500 if SUPABASE_SERVICE_ROLE_KEY is not set."""
    client = TestClient(make_app())

    with patch("app.routers.profile.SUPABASE_SERVICE_KEY", ""):
        response = client.delete(
            "/profile/account",
            headers={"Authorization": "Bearer valid-token-abc"}
        )

    assert response.status_code == 500
    assert "service credentials not configured" in response.json()["detail"]


def test_delete_account_invalid_token_returns_401():
    """DELETE /account returns 401 when token is invalid."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    client = TestClient(app)

    # Real dependency in play: mock the Supabase auth client so get_user returns user=None
    mock_user_response = MagicMock()
    mock_user_response.user = None
    mock_sb = MagicMock()
    mock_sb.auth.get_user.return_value = mock_user_response

    with patch("app.services.auth.create_client", return_value=mock_sb), \
         patch("app.services.auth.SUPABASE_URL", "http://test.supabase.co"), \
         patch("app.services.auth.SUPABASE_ANON_KEY", "test-anon-key"):
        response = client.delete(
            "/profile/account",
            headers={"Authorization": "Bearer invalid-token"}
        )

    assert response.status_code == 401
