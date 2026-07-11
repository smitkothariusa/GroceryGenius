# backend/app/main.py
import logging
import os
import time
import uuid

import httpx

from app.services.logging_config import request_id_var, setup_logging

# Configure logging before anything else imports/logs (routers log at import time).
setup_logging()

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.routers import recipes, pantry, shopping, vision, donation, profile
from app.routers.barcode import router as barcode_router
from app.services.auth import get_current_user, limiter

logger = logging.getLogger("app.request")

app = FastAPI(
    title="GroceryGenius API",
    description="AI-powered grocery assistant API",
    version="1.0.0"
)

# Per-user rate limiting (slowapi) — limits are declared on the AI routes
app.state.limiter = limiter


def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    user_id = getattr(request.state, "user_id", None) or "-"
    logger.warning(
        "rate limit exceeded: %s %s user=%s limit=%s",
        request.method, request.url.path, user_id, exc.detail,
    )
    return _rate_limit_exceeded_handler(request, exc)


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Strip "input" so oversized/invalid payloads are never echoed back.
    errors = [
        {k: v for k, v in err.items() if k in ("type", "loc", "msg")}
        for err in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = str(uuid.uuid4())
    token = request_id_var.set(request_id)
    start = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        duration_ms = (time.perf_counter() - start) * 1000
        # user_id is stashed on request.state by get_current_user
        user_id = getattr(request.state, "user_id", None) or "-"
        logger.info(
            "%s %s status=%s duration_ms=%.0f user=%s",
            request.method, request.url.path, status_code, duration_ms, user_id,
        )
        request_id_var.reset(token)


# All routers require a valid Supabase JWT except /health.
# profile attaches auth per-route (dietary-label and account validate the same way).
auth_required = [Depends(get_current_user)]
app.include_router(barcode_router, dependencies=auth_required)

# CORS middleware for PWA
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://grocerygenius.org",
        "https://www.grocerygenius.org",
        "https://app.grocerygenius.org",
        "https://dev.grocerygenius.org",
    ],
    # Vercel preview deployments get per-deploy hostnames
    allow_origin_regex=r"https://grocery-genius-[a-z0-9]+-smit-kotharis-projects\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Include routers
app.include_router(recipes.router, prefix="/recipes", tags=["recipes"], dependencies=auth_required)
app.include_router(pantry.router, prefix="/pantry", tags=["pantry"], dependencies=auth_required)
app.include_router(shopping.router, prefix="/shopping", tags=["shopping"], dependencies=auth_required)
app.include_router(vision.router, prefix="/vision", tags=["vision"], dependencies=auth_required)
app.include_router(donation.router, prefix="/donation", tags=["donation"], dependencies=auth_required)
app.include_router(profile.router, prefix="/profile", tags=["profile"])


# Short timeout so one flaky dependency can't hang the health endpoint. Uptime
# monitors poll this frequently, so every check here must be cheap and side-effect-free.
HEALTH_CHECK_TIMEOUT = httpx.Timeout(3.0)


def _check_supabase() -> str:
    """
    Lightweight Supabase reachability probe: hit the PostgREST base with the anon
    apikey. Not a full auth round-trip (no token validation) and read-only.

    Per the CLAUDE.md gotcha, no client is created at import time — the HTTP client
    is created here, per call. Returns "ok" or "error"; never raises.
    """
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    if not supabase_url or not supabase_anon_key:
        return "error"
    try:
        with httpx.Client(timeout=HEALTH_CHECK_TIMEOUT) as client:
            resp = client.get(
                f"{supabase_url.rstrip('/')}/rest/v1/",
                headers={"apikey": supabase_anon_key},
            )
        # PostgREST answers the base path with 2xx/3xx/4xx once it's reachable;
        # a 5xx means the backing service is unhealthy.
        return "ok" if resp.status_code < 500 else "error"
    except Exception:
        logger.warning("health check: supabase unreachable", exc_info=False)
        return "error"


def _check_openai() -> str:
    """
    Lightweight OpenAI reachability probe: list models (cheap GET), never a real
    completion — this is polled frequently and must not spend quota. Returns
    "ok" or "error"; never raises.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return "error"
    try:
        with httpx.Client(timeout=HEALTH_CHECK_TIMEOUT) as client:
            resp = client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
        return "ok" if resp.status_code < 500 else "error"
    except Exception:
        logger.warning("health check: openai unreachable", exc_info=False)
        return "error"


@app.get("/health")
def health():
    """
    Public, unauthenticated health check polled by uptime monitors.

    Reports app liveness plus downstream dependency reachability. A failing
    dependency is reported as "error" in the body but never 500s the endpoint,
    so uptime monitors keep getting a parseable response.
    """
    # Each sub-check is defensively wrapped: even an unexpected error in a helper
    # is reported as "error" rather than failing the whole endpoint.
    try:
        supabase_status = _check_supabase()
    except Exception:
        supabase_status = "error"
    try:
        openai_status = _check_openai()
    except Exception:
        openai_status = "error"

    return {
        "status": "ok",
        "version": "1.0.0",
        "checks": {
            "supabase": supabase_status,
            "openai": openai_status,
            # TODO: Redis check once tasks 7/8 land
            "redis": "not_configured",
        },
    }
