import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.openai_client import call_chat_completion

router = APIRouter()

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


class DeleteAccountRequest(BaseModel):
    user_id: str


@router.delete("/account")
async def delete_account(payload: DeleteAccountRequest):
    """
    Delete all user data from all tables, then delete the Supabase auth user.
    Requires SUPABASE_SERVICE_ROLE_KEY env var (not the anon key).
    """
    from supabase import create_client
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        raise HTTPException(status_code=500, detail="Supabase service credentials not configured")

    sb = create_client(url, service_key)
    user_id = payload.user_id

    tables = ["calorie_log", "meal_plans", "shopping_items", "pantry_items", "saved_recipes", "profiles"]
    for table in tables:
        sb.table(table).delete().eq("user_id", user_id).execute()

    sb.auth.admin.delete_user(user_id)

    return {"deleted": True}
