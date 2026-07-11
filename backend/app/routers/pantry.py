# backend/app/routers/pantry.py
from fastapi import APIRouter, HTTPException, Request
from typing import List
from typing_extensions import Annotated
from pydantic import BaseModel, Field
import logging
import json
from app.services.auth import limiter, AI_LIGHT_LIMIT
from app.services.openai_client import call_chat_completion
from app.services.ingredient_parsing import clean_ingredient_lines, strip_json_code_fences

logger = logging.getLogger(__name__)

router = APIRouter()


class PantryItemInput(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    quantity: float = Field(ge=0, le=100_000)
    unit: str = Field(min_length=1, max_length=20)


class MatchIngredientsRequest(BaseModel):
    ingredient_lines: List[Annotated[str, Field(max_length=300)]] = Field(max_length=100)
    pantry_items: List[PantryItemInput] = Field(max_length=200)

@router.post("/match-ingredients")
@limiter.limit(AI_LIGHT_LIMIT)
async def match_ingredients(request: Request, payload: MatchIngredientsRequest):
    """AI-match recipe ingredient lines against pantry items."""
    lines = clean_ingredient_lines(payload.ingredient_lines)
    if not lines or not payload.pantry_items:
        # Still parse ingredients even with no pantry
        return [{"ingredient_name": l, "quantity": None, "unit": None,
                 "pantry_id": None, "pantry_name": None,
                 "pantry_quantity": None, "pantry_unit": None, "remainder": None}
                for l in lines]

    pantry_text = "\n".join(
        f"- id:{item.id} name:\"{item.name}\" qty:{item.quantity} unit:{item.unit}"
        for item in payload.pantry_items
    )
    ingredients_text = "\n".join(f"- {l}" for l in lines)

    system_prompt = (
        "You are a pantry matcher. Parse recipe ingredients and match them to pantry items.\n"
        "Rules:\n"
        "1. Parse each ingredient line: extract name (strip descriptors/parentheticals), "
        "quantity (convert fractions: 1/4→0.25, 1/2→0.5, 1 1/2→1.5), unit.\n"
        "2. Skip water, ice, and non-grocery items — omit them entirely from output.\n"
        "3. Match each ingredient to the closest pantry item by name. "
        "Handle synonyms (scallions↔green onions, chicken breast↔chicken).\n"
        "4. Only match if units are compatible (same unit, OR both are count-based: "
        "pc/clove/slice/piece/whole count as compatible).\n"
        "5. If no match or incompatible units, set pantry_id to null.\n"
        "6. remainder = pantry_quantity - ingredient_quantity (null if no match).\n"
        "Return ONLY valid JSON array, no markdown:\n"
        '[{"ingredient_name":"...","quantity":0.0,"unit":"...",'
        '"pantry_id":"..." or null,"pantry_name":"..." or null,'
        '"pantry_quantity":0.0 or null,"pantry_unit":"..." or null,'
        '"remainder":0.0 or null}]'
    )
    user_prompt = f"Recipe ingredients:\n{ingredients_text}\n\nPantry items:\n{pantry_text}"

    try:
        raw = await call_chat_completion(system_prompt, user_prompt, max_tokens=2000, temperature=0.1)
        raw = strip_json_code_fences(raw)
        return json.loads(raw)
    except Exception:
        logger.error("match-ingredients error", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to match ingredients")
