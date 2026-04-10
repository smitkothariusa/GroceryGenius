import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient


def test_dietary_label_returns_label_and_description():
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


def test_dietary_label_fallback_on_openai_failure():
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


def test_delete_account_valid_token_returns_deleted():
    """DELETE /profile/account with a valid token deletes all user data and returns {deleted: True}."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "test-user-uuid-1234"

    mock_user_response = MagicMock()
    mock_user_response.user = mock_user

    mock_anon_auth = MagicMock()
    mock_anon_auth.get_user.return_value = mock_user_response

    mock_anon_client = MagicMock()
    mock_anon_client.auth = mock_anon_auth

    mock_table = MagicMock()
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.execute.return_value = MagicMock()

    mock_service_auth = MagicMock()
    mock_service_auth.admin.delete_user.return_value = MagicMock()

    mock_service_client = MagicMock()
    mock_service_client.table.return_value = mock_table
    mock_service_client.auth = mock_service_auth

    def fake_create_client(url, key):
        if key == "test-anon-key":
            return mock_anon_client
        return mock_service_client

    with patch("app.routers.profile.create_client", side_effect=fake_create_client), \
         patch("app.routers.profile.SUPABASE_ANON_KEY", "test-anon-key"), \
         patch("app.routers.profile.SUPABASE_SERVICE_KEY", "test-service-key"):
        response = client.delete(
            "/profile/account",
            headers={"Authorization": "Bearer valid-token-abc"}
        )

    assert response.status_code == 200
    assert response.json() == {"deleted": True}
    mock_anon_auth.get_user.assert_called_once_with("valid-token-abc")
    mock_service_auth.admin.delete_user.assert_called_once_with("test-user-uuid-1234")


def test_delete_account_missing_service_key_returns_500():
    """DELETE /profile/account returns 500 if SUPABASE_SERVICE_ROLE_KEY is not set."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "test-user-uuid-1234"

    mock_user_response = MagicMock()
    mock_user_response.user = mock_user

    mock_anon_auth = MagicMock()
    mock_anon_auth.get_user.return_value = mock_user_response

    mock_anon_client = MagicMock()
    mock_anon_client.auth = mock_anon_auth

    def fake_create_client(url, key):
        return mock_anon_client

    with patch("app.routers.profile.create_client", side_effect=fake_create_client), \
         patch("app.routers.profile.SUPABASE_ANON_KEY", "test-anon-key"), \
         patch("app.routers.profile.SUPABASE_SERVICE_KEY", ""):
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

    # Mock create_client so get_user returns a response with user=None
    mock_user_response = MagicMock()
    mock_user_response.user = None
    mock_sb = MagicMock()
    mock_sb.auth.get_user.return_value = mock_user_response

    with patch("app.routers.profile.create_client", return_value=mock_sb):
        response = client.delete(
            "/profile/account",
            headers={"Authorization": "Bearer invalid-token"}
        )

    assert response.status_code == 401
