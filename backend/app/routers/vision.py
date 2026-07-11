# backend/app/routers/vision.py
from fastapi import APIRouter, File, Request, UploadFile, HTTPException
from typing import List
import base64
import json
import logging
import os
import re
import time
from openai import OpenAI
from app.services.auth import limiter, AI_HEAVY_LIMIT
from app.services.openai_client import log_openai_usage

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB
MAX_RECEIPT_ITEMS = 40

VALID_CATEGORIES = {
    "produce", "dairy", "meat", "canned", "grains", "breakfast",
    "beverages", "snacks", "frozen", "bakery", "condiments", "other",
}
VALID_CONFIDENCE = {"high", "medium", "low"}

@router.post("/analyze-ingredients")
@limiter.limit(AI_HEAVY_LIMIT)
async def analyze_ingredients(request: Request, file: UploadFile = File(...)):
    """
    Analyze an image and extract visible ingredients using GPT-4 Vision
    """
    try:
        # Read the uploaded file
        contents = await file.read()
        if len(contents) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image too large (max 8 MB)")

        # Convert to base64
        base64_image = base64.b64encode(contents).decode('utf-8')

        # Call GPT-4 Vision API
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), timeout=90.0, max_retries=2)
        start = time.perf_counter()
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this image and identify ONLY edible food ingredients that can be used in cooking.

        CRITICAL RULES:
        - ONLY list ingredients you would actually use in a recipe
        - IGNORE: leaves, stems, peels, packaging, plates, bowls, utensils, backgrounds
        - For fruits/vegetables: list the FOOD ITEM itself, not its parts (e.g., "apple" not "apple leaf")
        - Use common cooking names (e.g., "bell pepper" not "capsicum")
        - Be specific about types when visible (e.g., "red apple", "yellow onion")
        - Remove duplicates - if you see multiple of the same item, list it once
        - Maximum 15 ingredients

        Return ONLY a JSON array of ingredient names, nothing else.
        Format: ["ingredient1", "ingredient2", "ingredient3"]

        Examples:
        - Good: ["red apple", "banana", "carrot", "chicken breast"]
        - Bad: ["apple", "apple leaf", "apple stem", "table", "bowl"]

        If the image contains NO food ingredients, return an empty array: []"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300
        )
        log_openai_usage(response.model, (time.perf_counter() - start) * 1000, response.usage)

        # Extract ingredients from response
        content = response.choices[0].message.content
        
        # Try to parse as JSON
        import json
        import re
        
        # Find JSON array in response
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            ingredients = json.loads(json_match.group())
        else:
            # Fallback: split by commas or newlines
            ingredients = [i.strip().strip('"\'') for i in re.split(r'[,\n]', content) if i.strip()]
        
        # Clean up ingredients
        # Clean up ingredients
        cleaned_ingredients = []
        unwanted_words = ['leaf', 'leaves', 'stem', 'stems', 'peel', 'skin', 'package', 'packaging', 
                        'bowl', 'plate', 'dish', 'table', 'background', 'wrapper', 'bag']

        for ing in ingredients:
            # Remove quotes, numbers at start, extra spaces
            cleaned = re.sub(r'^\d+\.?\s*', '', ing).strip().strip('"\'').lower()
            
            # Skip if empty or too short
            if not cleaned or len(cleaned) < 2:
                continue
            
            # Skip if contains unwanted words
            if any(word in cleaned for word in unwanted_words):
                continue
            
            # Skip if it's just a color or descriptor without food
            if cleaned in ['red', 'green', 'yellow', 'white', 'fresh', 'raw', 'whole']:
                continue
                
            cleaned_ingredients.append(cleaned)

        return {
            "success": True,
            "ingredients": cleaned_ingredients[:15],
            "raw_response": content
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Vision API error", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze image: {str(e)}")


def _clean_receipt_item(raw: dict) -> dict | None:
    """Validate/normalize one item GPT-4o extracted from a receipt. Returns None to drop it."""
    name = (raw.get("name") or "").strip()
    if not name or len(name) < 2:
        return None

    try:
        quantity = float(raw.get("quantity", 1))
    except (TypeError, ValueError):
        quantity = 1.0
    if quantity <= 0:
        quantity = 1.0

    unit = (raw.get("unit") or "ea").strip().lower() or "ea"

    category = (raw.get("category") or "other").strip().lower()
    if category not in VALID_CATEGORIES:
        category = "other"

    confidence = (raw.get("confidence") or "low").strip().lower()
    if confidence not in VALID_CONFIDENCE:
        confidence = "low"

    return {
        "name": name,
        "quantity": quantity,
        "unit": unit,
        "category": category,
        "confidence": confidence,
        "raw_text": (raw.get("raw_text") or "").strip(),
    }


@router.post("/analyze-receipt")
@limiter.limit(AI_HEAVY_LIMIT)
async def analyze_receipt(request: Request, file: UploadFile = File(...)):
    """
    Analyze a grocery receipt photo with GPT-4o vision and extract purchased
    grocery line items (name, inferred quantity/unit, category, confidence).
    Tax, subtotal/total, discount/coupon, and non-grocery lines are filtered out.
    """
    try:
        contents = await file.read()
        if len(contents) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image too large (max 8 MB)")

        base64_image = base64.b64encode(contents).decode('utf-8')

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), timeout=90.0, max_retries=2)
        start = time.perf_counter()
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You read grocery store receipts and extract ONLY the purchased "
                        "grocery items as structured data. Receipts are noisy OCR targets — "
                        "be careful to exclude non-item lines.\n\n"
                        "EXCLUDE these line types entirely:\n"
                        "- Tax, subtotal, total, balance due, change, payment/card lines\n"
                        "- Discounts, coupons, loyalty rewards, promo/savings lines\n"
                        "- Store header/footer text, addresses, phone numbers, receipt/order IDs\n"
                        "- Non-grocery items (bags, gift cards, lottery, pharmacy, gas)\n\n"
                        "For each remaining grocery line item, infer:\n"
                        '- "name": a clean, generic grocery name expanded from any store '
                        'abbreviation (e.g. "ORG BANANA" -> "Organic Banana", '
                        '"GV 2% MLK GAL" -> "2% Milk"). Remove brand/store-brand prefixes '
                        "when a generic name is clear, but keep it recognizable.\n"
                        '- "quantity": a number. Receipts rarely spell out quantity/weight — '
                        "if not stated, default to 1. If the line shows a multiplier "
                        "(e.g. \"3 @ 1.50\") or a weight (e.g. \"1.24 lb\"), use that value.\n"
                        '- "unit": a short unit string. Default to "ea" (each) when the '
                        'receipt gives no unit. Use "lb", "oz", "gal", "pk", etc. when the '
                        "receipt implies one.\n"
                        '- "category": one of produce|dairy|meat|canned|grains|breakfast|'
                        "beverages|snacks|frozen|bakery|condiments|other\n"
                        '- "confidence": "high" if the item name and quantity are clearly '
                        'readable and unambiguous, "medium" if the name is a reasonable '
                        'guess from an abbreviation, "low" if you are largely guessing at '
                        "what the item is.\n"
                        '- "raw_text": the original receipt line text as read, unmodified.\n\n'
                        f"Return at most {MAX_RECEIPT_ITEMS} items. Return ONLY a JSON object:\n"
                        "{\n"
                        '  "items": [\n'
                        '    {"name": "...", "quantity": 1, "unit": "ea", "category": "...", '
                        '"confidence": "high", "raw_text": "..."}\n'
                        "  ],\n"
                        '  "rejected_lines_count": 0\n'
                        "}\n"
                        '"rejected_lines_count" is how many non-item lines you excluded '
                        "(tax, subtotal, discounts, etc). If no grocery items are found, "
                        'return {"items": [], "rejected_lines_count": 0}.'
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract the grocery line items from this receipt photo."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "high",
                            },
                        },
                    ],
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=3000,
        )
        log_openai_usage(response.model, (time.perf_counter() - start) * 1000, response.usage)

        content = response.choices[0].message.content
        try:
            parsed = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            json_match = re.search(r'\{.*\}', content or "", re.DOTALL)
            parsed = json.loads(json_match.group()) if json_match else {}

        raw_items = parsed.get("items") or []
        items = []
        for raw in raw_items[:MAX_RECEIPT_ITEMS]:
            cleaned = _clean_receipt_item(raw)
            if cleaned:
                items.append(cleaned)

        try:
            rejected_lines_count = int(parsed.get("rejected_lines_count", 0))
        except (TypeError, ValueError):
            rejected_lines_count = 0

        return {
            "success": True,
            "items": items,
            "rejected_lines_count": max(0, rejected_lines_count),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Receipt vision API error", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze receipt: {str(e)}")
