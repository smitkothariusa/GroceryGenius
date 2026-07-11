from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


def test_health_all_dependencies_ok():
    """When both downstream checks pass, /health is 200 with everything 'ok'."""
    with patch("app.main._check_supabase", return_value="ok"), \
         patch("app.main._check_openai", return_value="ok"):
        client = TestClient(app)
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "1.0.0"
    assert body["checks"] == {
        "supabase": "ok",
        "openai": "ok",
        "redis": "not_configured",
    }


def test_health_stays_200_when_supabase_check_fails():
    """A failing dependency is reported as 'error' but must NOT 500 the endpoint."""
    with patch("app.main._check_supabase", return_value="error"), \
         patch("app.main._check_openai", return_value="ok"):
        client = TestClient(app)
        response = client.get("/health")

    assert response.status_code == 200
    checks = response.json()["checks"]
    assert checks["supabase"] == "error"
    assert checks["openai"] == "ok"


def test_health_stays_200_when_a_check_raises():
    """Even an unexpected exception in a sub-check must not fail the endpoint."""
    with patch("app.main._check_supabase", side_effect=RuntimeError("boom")), \
         patch("app.main._check_openai", return_value="ok"):
        client = TestClient(app)
        response = client.get("/health")

    assert response.status_code == 200
    checks = response.json()["checks"]
    assert checks["supabase"] == "error"
    assert checks["openai"] == "ok"


def test_health_requires_no_auth():
    """/health is the one public route — no Authorization header needed."""
    with patch("app.main._check_supabase", return_value="ok"), \
         patch("app.main._check_openai", return_value="ok"):
        client = TestClient(app)
        response = client.get("/health")
    assert response.status_code == 200


def test_check_supabase_returns_error_when_unconfigured():
    """Missing Supabase env vars => 'error', with no outbound call attempted."""
    from app.main import _check_supabase

    with patch("app.main.os.getenv", return_value=""):
        assert _check_supabase() == "error"


def test_check_openai_returns_error_when_unreachable():
    """A network failure during the OpenAI probe is swallowed and reported 'error'."""
    from app.main import _check_openai

    with patch("app.main.os.getenv", return_value="sk-test"), \
         patch("app.main.httpx.Client") as mock_client:
        mock_client.return_value.__enter__.return_value.get.side_effect = Exception("no network")
        assert _check_openai() == "error"


def test_check_supabase_ok_on_2xx():
    """A reachable PostgREST (status < 500) reports 'ok'."""
    from app.main import _check_supabase

    class _Resp:
        status_code = 200

    with patch("app.main.os.getenv", return_value="value"), \
         patch("app.main.httpx.Client") as mock_client:
        mock_client.return_value.__enter__.return_value.get.return_value = _Resp()
        assert _check_supabase() == "ok"
