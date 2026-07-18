"""The app-wide recipes_generated counter is a best-effort impact metric — it
must never affect (or break) a user's recipe request. These tests lock that
contract on the helper that the /recipes route schedules as a background task.
"""
from unittest.mock import patch, MagicMock

from app.routers.recipes import _increment_recipes_generated


def test_noop_without_service_key():
    """No service credentials → do nothing, never touch Supabase."""
    with patch("app.routers.recipes.SUPABASE_SERVICE_KEY", ""), \
         patch("app.routers.recipes.SUPABASE_URL", "http://x.supabase.co"), \
         patch("app.routers.recipes.create_client") as mk:
        _increment_recipes_generated(3)
        mk.assert_not_called()


def test_noop_for_nonpositive_count():
    with patch("app.routers.recipes.SUPABASE_SERVICE_KEY", "svc"), \
         patch("app.routers.recipes.SUPABASE_URL", "http://x.supabase.co"), \
         patch("app.routers.recipes.create_client") as mk:
        _increment_recipes_generated(0)
        mk.assert_not_called()


def test_calls_rpc_with_count_when_configured():
    sb = MagicMock()
    with patch("app.routers.recipes.SUPABASE_SERVICE_KEY", "svc"), \
         patch("app.routers.recipes.SUPABASE_URL", "http://x.supabase.co"), \
         patch("app.routers.recipes.create_client", return_value=sb):
        _increment_recipes_generated(3)
        sb.rpc.assert_called_once_with("increment_recipes_generated", {"n": 3})
        sb.rpc.return_value.execute.assert_called_once()


def test_swallows_errors_never_raises():
    """A failing counter write must not propagate — the user's recipes already
    succeeded by the time this background task runs."""
    with patch("app.routers.recipes.SUPABASE_SERVICE_KEY", "svc"), \
         patch("app.routers.recipes.SUPABASE_URL", "http://x.supabase.co"), \
         patch("app.routers.recipes.create_client", side_effect=Exception("supabase down")):
        # Must not raise.
        _increment_recipes_generated(3)
