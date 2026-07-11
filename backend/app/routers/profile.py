import json
import logging
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from app.services.auth import get_current_user, limiter, AI_LIGHT_LIMIT
from app.services.openai_client import call_chat_completion
from supabase import create_client

logger = logging.getLogger(__name__)

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

DIETARY_LABEL_SYSTEM_PROMPT = (
    "You are a dietary preference labeler for a recipe app. "
    "Given a user's free-text dietary preference, return a JSON object with two fields: "
    "`label` (2–4 words, title case, suitable as a dropdown option) and "
    "`description` (one sentence, used as a tooltip/filter hint in a recipe generator). "
    "Return only valid JSON, no markdown."
)


class DietaryLabelRequest(BaseModel):
    text: str = Field(max_length=500)


class DietaryLabelResponse(BaseModel):
    label: str
    description: str


@router.post("/dietary-label", response_model=DietaryLabelResponse)
@limiter.limit(AI_LIGHT_LIMIT)
async def generate_dietary_label(request: Request, payload: DietaryLabelRequest, user=Depends(get_current_user)):
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
async def delete_account(user=Depends(get_current_user)):
    """
    Delete all user data from all tables, then delete the Supabase auth user.
    The shared auth dependency verifies the Bearer token and identifies the user.
    Requires SUPABASE_SERVICE_ROLE_KEY env var (not the anon key).
    """
    user_id = user.id

    if not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase service credentials not configured")

    sb_service = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    tables = ["calorie_log", "meal_plans", "shopping_items", "pantry_items", "saved_recipes"]
    for table in tables:
        try:
            sb_service.table(table).delete().eq("user_id", user_id).execute()
            logger.debug("delete_account: deleted from %s user=%s", table, user_id)
        except Exception as exc:
            logger.error("delete_account: failed on %s user=%s", table, user_id, exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to delete rows from {table}: {exc}")

    # profiles uses 'id' as the user identifier, not 'user_id'
    try:
        sb_service.table("profiles").delete().eq("id", user_id).execute()
        logger.debug("delete_account: deleted from profiles user=%s", user_id)
    except Exception as exc:
        logger.error("delete_account: failed on profiles user=%s", user_id, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete rows from profiles: {exc}")

    try:
        sb_service.auth.admin.delete_user(user_id)
    except Exception as exc:
        logger.error("delete_account: failed deleting auth user user=%s", user_id, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete auth user: {exc}")

    # Audit trail: one INFO line per completed account deletion.
    logger.info("account deleted user=%s", user_id)
    return {"deleted": True}
