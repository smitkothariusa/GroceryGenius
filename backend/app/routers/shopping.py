# backend/app/routers/shopping.py
from fastapi import APIRouter, HTTPException, Request
from typing import List
from pydantic import BaseModel, Field
import logging
import json
from app.services.auth import limiter, AI_HEAVY_LIMIT
from app.services.openai_client import call_chat_completion

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================
# AI-POWERED PRICE COMPARISON
# ============================================

class PriceItem(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    quantity: float = Field(ge=0, le=100_000)
    unit: str = Field(default="pc", max_length=20)


class PriceComparisonRequest(BaseModel):
    items: List[PriceItem] = Field(max_length=100)

@router.post("/ai-price-comparison")
@limiter.limit(AI_HEAVY_LIMIT)
async def ai_price_comparison(request: Request, payload: PriceComparisonRequest):
    """
    AI-powered price comparison for Amazon vs Walmart using GPT-4o-mini.
    Returns estimated total prices for the shopping list.
    """
    items = payload.items
    
    if not items:
        return {"amazon_total": 0, "walmart_total": 0}
    
    # Format items for AI prompt
    items_list = ", ".join([
        f"{item.quantity} {item.unit} {item.name}"
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
            # Response body only at DEBUG, truncated — it can echo user item names.
            logger.debug("unparseable AI price response: %.200s", clean_response)
            logger.error("Failed to parse AI price estimation: %s", e)
            raise HTTPException(status_code=500, detail="Failed to parse price estimation")
        
        return {
            "amazon_total": round(amazon_total, 2),
            "walmart_total": round(walmart_total, 2)
        }
        
    except HTTPException:
        raise
    except Exception:
        logger.error("Error in AI price comparison, using fallback estimate", exc_info=True)
        # Fallback to simple estimation
        item_count = sum(item.quantity for item in items)
        return {
            "amazon_total": round(item_count * 3.5, 2),
            "walmart_total": round(item_count * 2.8, 2)
        }