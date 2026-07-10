# backend/app/main.py
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.routers import recipes, pantry, shopping, vision, donation, profile
from app.routers.barcode import router as barcode_router
from app.services.auth import get_current_user, limiter

app = FastAPI(
    title="GroceryGenius API",
    description="AI-powered grocery assistant API",
    version="1.0.0"
)

# Per-user rate limiting (slowapi) — limits are declared on the AI routes
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
)

# Include routers
app.include_router(recipes.router, prefix="/recipes", tags=["recipes"], dependencies=auth_required)
app.include_router(pantry.router, prefix="/pantry", tags=["pantry"], dependencies=auth_required)
app.include_router(shopping.router, prefix="/shopping", tags=["shopping"], dependencies=auth_required)
app.include_router(vision.router, prefix="/vision", tags=["vision"], dependencies=auth_required)
app.include_router(donation.router, prefix="/donation", tags=["donation"], dependencies=auth_required)
app.include_router(profile.router, prefix="/profile", tags=["profile"])
@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
