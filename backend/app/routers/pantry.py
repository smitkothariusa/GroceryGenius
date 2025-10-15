# backend/app/routers/pantry.py
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

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