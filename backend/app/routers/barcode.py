# backend/app/routers/barcode.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import base64
import json
import httpx
from openai import OpenAI

try:
    import zxingcpp
    from PIL import Image
    import io
    ZXING_AVAILABLE = True
except Exception:
    # zxingcpp is optional — falls back to GPT-4o vision for digit reading
    ZXING_AVAILABLE = False

router = APIRouter()


class BarcodeImageRequest(BaseModel):
    image: str  # base64 encoded image


class BarcodeRequest(BaseModel):
    barcode: str


def _map_off_category(categories_tags: list) -> str:
    cats = [c.lower() for c in categories_tags]
    if any("meat" in c or "poultry" in c or "beef" in c or "chicken" in c for c in cats):
        return "meat"
    if any("dairy" in c or "milk" in c or "cheese" in c or "yogurt" in c for c in cats):
        return "dairy"
    if any("fruit" in c or "vegetable" in c or "produce" in c for c in cats):
        return "produce"
    if any("beverage" in c or "drink" in c or "juice" in c or "water" in c for c in cats):
        return "beverages"
    if any("snack" in c or "chip" in c or "cookie" in c or "cracker" in c for c in cats):
        return "snacks"
    if any("frozen" in c for c in cats):
        return "frozen"
    if any("breakfast" in c or "cereal" in c for c in cats):
        return "breakfast"
    if any("bakery" in c or "baked" in c or "bread" in c for c in cats):
        return "bakery"
    if any("condiment" in c or "sauce" in c or "dressing" in c for c in cats):
        return "condiments"
    if any("grain" in c or "pasta" in c or "rice" in c for c in cats):
        return "grains"
    if any("can" in c or "preserved" in c for c in cats):
        return "canned"
    return "other"


async def _ai_clean_name(barcode: str, raw_name: str = None) -> dict:
    """Use GPT-4o to identify or clean a product name from a barcode number."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    if raw_name:
        user_msg = (
            f"Barcode: {barcode}\n"
            f"Product database returned: \"{raw_name}\"\n\n"
            f"Extract just the generic food item name from this."
        )
    else:
        user_msg = f"Barcode: {barcode}\n\nWhat grocery product is this?"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a grocery product identifier. Return a JSON object:\n"
                    "{\n"
                    '    "name": "generic food name",\n'
                    '    "category": "produce|dairy|meat|canned|grains|breakfast|beverages|snacks|frozen|bakery|condiments|other",\n'
                    '    "confidence": "high|medium|low"\n'
                    "}\n\n"
                    "Name rules — be brief and generic:\n"
                    '- Remove brand names: "Kraft Mac & Cheese" → "Mac & Cheese"\n'
                    '- Remove size/weight/count: "Campbell\'s Tomato Soup 10.75oz" → "Tomato Soup"\n'
                    '- Remove packaging words: "can", "box", "bag", "bottle"\n'
                    '- Good examples: "Macaroni and Cheese", "Tomato Soup", "Whole Milk", "Cherry Tomatoes", "Granola Bar"\n'
                    '- If unknown: {"name": "Unknown Product", "category": "other", "confidence": "low"}'
                ),
            },
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=100,
    )

    return json.loads(response.choices[0].message.content)


async def _lookup_product_by_number(barcode: str) -> dict:
    """
    Look up a product by its barcode number.
    1. Try Open Food Facts (free, no key, huge food database)
    2. Fall back to GPT-4o using its training data
    """
    # --- Open Food Facts ---
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
            )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == 1 and data.get("product"):
                product = data["product"]
                raw_name = (
                    product.get("product_name")
                    or product.get("product_name_en")
                    or product.get("generic_name")
                )
                if raw_name and raw_name.strip():
                    ai = await _ai_clean_name(barcode, raw_name)
                    category = ai.get("category") or _map_off_category(
                        product.get("categories_tags") or []
                    )
                    clean = ai.get("name") or raw_name
                    print(f"✅ OFF: '{raw_name}' → '{clean}'")
                    return {
                        "barcode": barcode,
                        "name": clean,
                        "category": category,
                        "confidence": "high",
                    }
    except Exception as e:
        print(f"⚠️ Open Food Facts failed: {e}")

    # --- GPT-4o fallback ---
    try:
        ai = await _ai_clean_name(barcode)
        print(f"✅ GPT-4o identified: '{ai.get('name')}' (confidence: {ai.get('confidence')})")
        return {
            "barcode": barcode,
            "name": ai.get("name", "Unknown Product"),
            "category": ai.get("category", "other"),
            "confidence": ai.get("confidence", "low"),
        }
    except Exception as e:
        print(f"❌ GPT-4o identification failed: {e}")
        return {
            "barcode": barcode,
            "name": "Unknown Product",
            "category": "other",
            "confidence": "low",
        }


@router.post("/barcode/vision-lookup")
async def vision_barcode_lookup(request: BarcodeImageRequest):
    """
    Decode a barcode from an image, then look up the product.

    Stage 1 — read the digits:
      a. pyzbar (decodes the barcode symbology directly — most reliable)
      b. GPT-4o vision (reads the printed digits as text — fallback)

    Stage 2 — identify the product:
      Uses _lookup_product_by_number (Open Food Facts → GPT-4o)
    """
    try:
        base64_image = request.image
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]

        barcode_number = None

        # --- Stage 1a: zxingcpp (decodes barcode lines directly, Windows-friendly) ---
        if ZXING_AVAILABLE:
            try:
                image_bytes = base64.b64decode(base64_image)
                img = Image.open(io.BytesIO(image_bytes))
                results = zxingcpp.read_barcodes(img)
                for r in results:
                    data = r.text
                    if data.isdigit() and len(data) >= 8:
                        barcode_number = data
                        print(f"✅ zxingcpp decoded: {barcode_number}")
                        break
            except Exception as e:
                print(f"⚠️ zxingcpp failed: {e}")

        # --- Stage 1b: GPT-4o vision — read digits only, not identify product ---
        if not barcode_number:
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            vision_resp = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Find the barcode in this image (the parallel black and white stripes). "
                                    "Read ONLY the digits printed directly below those stripes. "
                                    "Reply with ONLY those digits — no spaces, no other text. "
                                    "If you cannot read them clearly, reply with 'unreadable'."
                                ),
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=30,
                temperature=0,
            )
            raw = vision_resp.choices[0].message.content.strip()
            digits_only = "".join(c for c in raw if c.isdigit())
            if len(digits_only) >= 8:
                barcode_number = digits_only
                print(f"✅ GPT-4o vision read digits: {barcode_number}")
            else:
                print(f"⚠️ GPT-4o could not read digits from image: '{raw}'")

        if not barcode_number:
            return {
                "barcode": "unreadable",
                "name": "Unknown Product",
                "category": "other",
                "confidence": "low",
                "source": "vision",
            }

        # --- Stage 2: Look up product by the decoded number ---
        result = await _lookup_product_by_number(barcode_number)
        result["source"] = "vision"
        return result

    except Exception as e:
        print(f"❌ Vision barcode lookup error: {e}")
        raise HTTPException(status_code=500, detail=f"Vision lookup failed: {str(e)}")


@router.post("/barcode/ai-lookup")
async def ai_barcode_lookup(request: BarcodeRequest):
    """Look up a product by its barcode number (Open Food Facts → GPT-4o)."""
    try:
        result = await _lookup_product_by_number(request.barcode)
        result["source"] = "ai"
        return result
    except Exception as e:
        print(f"❌ AI barcode lookup error: {e}")
        raise HTTPException(status_code=500, detail=f"AI lookup failed: {str(e)}")
