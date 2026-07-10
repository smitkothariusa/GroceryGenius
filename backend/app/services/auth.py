# backend/app/services/auth.py
import os
from typing import Optional

from fastapi import Header, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")


def get_current_user(request: Request, authorization: Optional[str] = Header(None)):
    """
    Validate the Supabase JWT from the Authorization header and return the user.

    Sync on purpose: supabase-py's auth.get_user() is a blocking network call,
    so FastAPI runs this dependency in its threadpool instead of the event loop.
    Stashes user_id on request.state for the rate limiter key.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    token = authorization[7:].strip()

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")

    sb_anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        user_response = sb_anon.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    request.state.user_id = user_response.user.id
    return user_response.user


def rate_limit_key(request: Request) -> str:
    """Rate-limit per authenticated user; fall back to client IP."""
    user_id = getattr(request.state, "user_id", None)
    return user_id or get_remote_address(request)


limiter = Limiter(key_func=rate_limit_key)

# Per-user budgets for OpenAI-backed routes. Heavy = long/expensive completions;
# light = short completions that legitimately fire in quick succession (scanning).
AI_HEAVY_LIMIT = "10/minute"
AI_LIGHT_LIMIT = "30/minute"
