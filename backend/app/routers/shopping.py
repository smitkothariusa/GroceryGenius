# backend/app/routers/shopping.py
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import uuid

router = APIRouter()

class ShoppingItem(BaseModel):
    id: Optional[str] = None
    name: str
    quantity: int = 1
    unit: str = "pc"
    category: str = "other"
    checked: bool = False

class ShoppingList(BaseModel):
    items: List[ShoppingItem]
    total_items: int
    checked_items: int

# In-memory storage
shopping_storage = []

@router.get("/", response_model=ShoppingList)
def get_shopping_list():
    """Get shopping list with statistics"""
    items = [ShoppingItem(**item) for item in shopping_storage]
    checked_count = sum(1 for item in shopping_storage if item.get("checked", False))
    
    return ShoppingList(
        items=items,
        total_items=len(items),
        checked_items=checked_count
    )

@router.post("/", response_model=ShoppingItem)
def add_shopping_item(item: ShoppingItem):
    """Add item to shopping list"""
    item_dict = item.dict()
    item_dict["id"] = str(uuid.uuid4())
    
    shopping_storage.append(item_dict)
    return ShoppingItem(**item_dict)

@router.put("/{item_id}", response_model=ShoppingItem)
def update_shopping_item(item_id: str, item: ShoppingItem):
    """Update shopping item (for checking off)"""
    for i, stored_item in enumerate(shopping_storage):
        if stored_item["id"] == item_id:
            item_dict = item.dict()
            item_dict["id"] = item_id
            shopping_storage[i] = item_dict
            return ShoppingItem(**item_dict)
    
    raise HTTPException(status_code=404, detail="Item not found")

@router.delete("/{item_id}")
def delete_shopping_item(item_id: str):
    """Delete shopping item"""
    global shopping_storage
    shopping_storage = [item for item in shopping_storage if item["id"] != item_id]
    return {"message": "Item deleted successfully"}

@router.post("/batch")
def add_batch_items(items: List[ShoppingItem]):
    """Add multiple items to shopping list"""
    added_items = []
    
    for item in items:
        item_dict = item.dict()
        item_dict["id"] = str(uuid.uuid4())
        shopping_storage.append(item_dict)
        added_items.append(ShoppingItem(**item_dict))
    
    return {"added_items": added_items, "count": len(added_items)}