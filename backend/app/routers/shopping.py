# backend/app/routers/shopping.py
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import uuid
import json
from app.services.openai_client import call_chat_completion

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

# ============================================
# NEW: AI-POWERED PRICE COMPARISON
# ============================================

class PriceComparisonRequest(BaseModel):
    items: List[dict]  # [{name: str, quantity: int, unit: str}, ...]

@router.post("/ai-price-comparison")
async def ai_price_comparison(request: PriceComparisonRequest):
    """
    AI-powered price comparison for Amazon vs Walmart using GPT-4o-mini.
    Returns estimated total prices for the shopping list.
    """
    items = request.items
    
    if not items:
        return {"amazon_total": 0, "walmart_total": 0}
    
    # Format items for AI prompt
    items_list = ", ".join([
        f"{item['quantity']} {item['unit']} {item['name']}" 
        for item in items
    ])
    
    try:
        # System prompt for price estimation
        system_prompt = """You are a grocery pricing expert with real-time knowledge of Amazon Fresh and Walmart grocery prices.

PRICING RULES:
1. Price each item individually based on realistic 2025 market rates
2. Consider the quantity AND unit (e.g., 2 lbs is different from 2 pieces)
3. Amazon Fresh is typically 15-25% more expensive than Walmart
4. Add ALL individual item prices together for the TOTAL
5. Think step-by-step: calculate each item's price, then sum them

CRITICAL: Do NOT give cumulative totals. Calculate the COMPLETE sum of ALL items every time.

Respond ONLY with valid JSON: {"amazon": number, "walmart": number}
No markdown, no explanations, just the JSON object."""

        # User prompt with the shopping list
        user_prompt = f"""Calculate the TOTAL grocery cost for these items at Amazon Fresh and Walmart.

SHOPPING LIST:
{items_list}

INSTRUCTIONS:
1. Price each item individually at both stores
2. Sum ALL prices for the grand total
3. Amazon should be 15-25% higher than Walmart

Return ONLY: {{"amazon": total_price, "walmart": total_price}}"""

        # Call OpenAI API using existing client
        response_text = await call_chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=150,
            temperature=0.8
        )

        # Parse the response
        # Remove any markdown code blocks if present
        clean_response = response_text.replace('```json', '').replace('```', '').strip()
        
        try:
            prices = json.loads(clean_response)
            amazon_total = float(prices.get("amazon", 0))
            walmart_total = float(prices.get("walmart", 0))
        except (json.JSONDecodeError, ValueError) as e:
            print(f"⚠️ Failed to parse AI response: {clean_response}")
            print(f"Error: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse price estimation")
        
        return {
            "amazon_total": round(amazon_total, 2),
            "walmart_total": round(walmart_total, 2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in AI price comparison: {e}")
        # Fallback to simple estimation
        item_count = sum(item.get('quantity', 1) for item in items)
        return {
            "amazon_total": round(item_count * 3.5, 2),
            "walmart_total": round(item_count * 2.8, 2)
        }