# backend/app/routers/pantry.py
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import json
from app.services.openai_client import call_chat_completion

router = APIRouter()

class PantryItem(BaseModel):
    id: Optional[str] = None
    name: str
    quantity: int
    unit: str
    category: str = "other"
    expiry_date: Optional[str] = None
    added_date: Optional[str] = None

class PantryResponse(BaseModel):
    items: List[PantryItem]
    expiring_soon: List[PantryItem]

# In-memory storage (replace with database in production)
pantry_storage = []

@router.get("/", response_model=PantryResponse)
def get_pantry():
    """Get all pantry items with expiry alerts"""
    today = datetime.now()
    expiring_soon = []
    
    for item in pantry_storage:
        if item.get("expiry_date"):
            try:
                expiry_date = datetime.fromisoformat(item["expiry_date"].replace('Z', '+00:00'))
                days_until_expiry = (expiry_date - today).days
                if 0 <= days_until_expiry <= 3:
                    expiring_soon.append(PantryItem(**item))
            except ValueError:
                pass
    
    return PantryResponse(
        items=[PantryItem(**item) for item in pantry_storage],
        expiring_soon=expiring_soon
    )

@router.post("/", response_model=PantryItem)
def add_pantry_item(item: PantryItem):
    """Add item to pantry"""
    item_dict = item.dict()
    item_dict["id"] = str(uuid.uuid4())
    item_dict["added_date"] = datetime.now().isoformat()
    
    pantry_storage.append(item_dict)
    return PantryItem(**item_dict)

@router.delete("/{item_id}")
def delete_pantry_item(item_id: str):
    """Delete pantry item"""
    global pantry_storage
    pantry_storage = [item for item in pantry_storage if item["id"] != item_id]
    return {"message": "Item deleted successfully"}


class PantryItemInput(BaseModel):
    id: str
    name: str
    quantity: float
    unit: str


class MatchIngredientsRequest(BaseModel):
    ingredient_lines: List[str]
    pantry_items: List[PantryItemInput]

@router.post("/match-ingredients")
async def match_ingredients(payload: MatchIngredientsRequest):
    """AI-match recipe ingredient lines against pantry items."""
    lines = [l.strip() for l in payload.ingredient_lines if l.strip()]
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
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"match-ingredients error: {e}")
        raise HTTPException(status_code=500, detail="Failed to match ingredients")
