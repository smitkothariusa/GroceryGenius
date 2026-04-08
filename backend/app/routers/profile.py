import json
import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.openai_client import call_chat_completion
from supabase import create_client

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

DIETARY_LABEL_SYSTEM_PROMPT = (
    "You are a dietary preference labeler for a recipe app. "
    "Given a user's free-text dietary preference, return a JSON object with two fields: "
    "`label` (2–4 words, title case, suitable as a dropdown option) and "
    "`description` (one sentence, used as a tooltip/filter hint in a recipe generator). "
    "Return only valid JSON, no markdown."
)


class DietaryLabelRequest(BaseModel):
    text: str


class DietaryLabelResponse(BaseModel):
    label: str
    description: str


@router.post("/dietary-label", response_model=DietaryLabelResponse)
async def generate_dietary_label(payload: DietaryLabelRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text must not be empty")

    try:
        raw = await call_chat_completion(
            system_prompt=DIETARY_LABEL_SYSTEM_PROMPT,
            user_prompt=text,
            max_tokens=120,
            temperature=0.3,
        )
        data = json.loads(raw)
        return DietaryLabelResponse(
            label=str(data.get("label", text[:30])),
            description=str(data.get("description", "")),
        )
    except Exception:
        truncated = text[:30] + ("..." if len(text) > 30 else "")
        return DietaryLabelResponse(label=truncated, description="")


@router.delete("/account")
async def delete_account(authorization: str = Header(...)):
    """
    Delete all user data from all tables, then delete the Supabase auth user.
    Reads the Bearer token from the Authorization header to identify and verify the user.
    Requires SUPABASE_SERVICE_ROLE_KEY env var (not the anon key).
    """
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    token = authorization[7:].strip()

    sb_anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        user_response = sb_anon.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}")
    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = user_response.user.id

    if not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase service credentials not configured")

    sb_service = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    tables = ["calorie_log", "meal_plans", "shopping_items", "pantry_items", "saved_recipes", "profiles"]
    for table in tables:
        try:
            sb_service.table(table).delete().eq("user_id", user_id).execute()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to delete rows from {table}: {exc}")

    try:
        sb_service.auth.admin.delete_user(user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete auth user: {exc}")

    return {"deleted": True}
