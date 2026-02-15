# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import recipes, pantry, shopping, vision, donation
# Add this import at the top
from routers.barcode import router as barcode_router
# Add this route registration with your other routers
app = FastAPI(
    title="GroceryGenius API",
    description="AI-powered grocery assistant API",
    version="1.0.0"
)
app.include_router(barcode_router)

# CORS middleware for PWA
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://grocery-genius-hj3w6xvnt-smit-kotharis-projects.vercel.app",
        "https://*.vercel.app",
        "*"  # Temporarily allow all for demo
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(recipes.router, prefix="/recipes", tags=["recipes"])
app.include_router(pantry.router, prefix="/pantry", tags=["pantry"])
app.include_router(shopping.router, prefix="/shopping", tags=["shopping"])
app.include_router(vision.router, prefix="/vision", tags=["vision"])  # ← Add this
app.include_router(donation.router, prefix="/donation", tags=["donation"])
@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}