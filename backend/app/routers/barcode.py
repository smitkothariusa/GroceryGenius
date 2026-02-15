# backend/app/routers/barcode.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import base64
from openai import OpenAI

router = APIRouter()

class BarcodeImageRequest(BaseModel):
    image: str  # base64 encoded image

class BarcodeRequest(BaseModel):
    barcode: str

@router.post("/barcode/vision-lookup")
async def vision_barcode_lookup(request: BarcodeImageRequest):
    """
    Use GPT-4 Vision to identify a product from a barcode image.
    This analyzes the actual image of the barcode/product packaging.
    """
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # The image should already be base64 encoded from frontend
        base64_image = request.image
        
        # Remove data URL prefix if present
        if ',' in base64_image:
            base64_image = base64_image.split(',')[1]
        
        response = client.chat.completions.create(
            model="gpt-4o",  # Full GPT-4o for best vision performance
            messages=[
                {
                    "role": "system",
                    "content": """You are a product identification expert specialized in reading barcodes and identifying products.

CRITICAL RULES - VIOLATION WILL RESULT IN FAILURE:
1. You MUST read the actual barcode numbers visible in the image (look for 8, 12, 13, or 14 digits printed below the barcode lines)
2. You MUST use ONLY those specific barcode numbers to identify the product
3. You MUST verify the product name matches what you see on the packaging/label in the image
4. You MUST NOT make up, guess, or hallucinate products
5. You MUST NOT return generic examples or common products unless they actually match the barcode

STEP-BY-STEP PROCESS:
Step 1: Carefully read ALL the digits printed below the barcode (usually 12 digits for UPC)
Step 2: Use those EXACT digits to look up the product in your UPC/EAN database knowledge
Step 3: Check if the product name from the database matches the text/branding visible on the package
Step 4: If there's a mismatch, trust the barcode over the packaging

RESPONSE FORMAT (return ONLY valid JSON):
{
    "barcode": "the complete barcode number you read - ALL digits, no spaces",
    "name": "Exact Brand Name Product Variant Size",
    "category": "produce|dairy|meat|canned|grains|breakfast|beverages|snacks|frozen|bakery|condiments|other",
    "confidence": "high|medium|low"
}

IF YOU CANNOT READ THE BARCODE CLEARLY:
{
    "barcode": "unreadable",
    "name": "Unknown Product",
    "category": "other",
    "confidence": "low"
}

FORBIDDEN RESPONSES (DO NOT RETURN THESE):
- Generic products like "Parle-G Biscuits", "Coca-Cola", "Chips", "Milk" unless the barcode actually matches
- Made-up barcode numbers
- Products that don't match the visible packaging
- Example products from this prompt

ONLY return products you can definitively identify from the barcode numbers AND verify with the packaging."""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Read the barcode numbers from this image, then identify the product using those numbers. Verify your identification using any visible packaging, labels, or text."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "high"  # High detail for better barcode reading
                            }
                        }
                    ]
                }
            ],
            response_format={ "type": "json_object" },
            temperature=0.2,  # Lower temperature for more consistent results
            max_tokens=150
        )
        
        import json
        result = json.loads(response.choices[0].message.content)
        
        barcode_read = result.get('barcode', 'unknown')
        product_name = result.get('name', 'Unknown Product')
        confidence = result.get('confidence', 'unknown')
        
        print(f"========================================")
        print(f"📸 Vision API Analysis:")
        print(f"   Barcode Read: {barcode_read}")
        print(f"   Product Name: {product_name}")
        print(f"   Confidence: {confidence}")
        print(f"   Category: {result.get('category', 'other')}")
        print(f"========================================")
        
        # Validation: Reject if barcode is unreadable or too short
        if barcode_read == 'unreadable' or (barcode_read != 'unknown' and len(barcode_read) < 8):
            print(f"⚠️ Invalid barcode detected, marking as unreadable")
            return {
                "barcode": "unreadable",
                "name": "Unknown Product",
                "category": "other",
                "confidence": "low",
                "source": "vision"
            }
        
        return {
            "barcode": barcode_read,
            "name": product_name,
            "category": result.get("category", "other"),
            "confidence": confidence,
            "source": "vision"
        }
        
    except Exception as e:
        print(f"❌ Vision barcode lookup error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Vision lookup failed: {str(e)}"
        )

@router.post("/barcode/ai-lookup")
async def ai_barcode_lookup(request: BarcodeRequest):
    """
    Use OpenAI to identify a product from its barcode number.
    This is a fallback when vision lookup is not available.
    """
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using mini for cost efficiency
            messages=[
                {
                    "role": "system",
                    "content": """You are a product identification expert. Given a barcode/UPC number, 
                    identify the most likely product name. Be concise and accurate.
                    
                    Return ONLY a JSON object with this structure:
                    {
                        "name": "Product Name",
                        "category": "produce|dairy|meat|canned|grains|breakfast|beverages|snacks|frozen|bakery|condiments|other"
                    }
                    
                    If you cannot identify the product with confidence, return:
                    {
                        "name": "Unknown Product",
                        "category": "other"
                    }"""
                },
                {
                    "role": "user",
                    "content": f"Identify this barcode: {request.barcode}"
                }
            ],
            response_format={ "type": "json_object" },
            temperature=0.3,
            max_tokens=100
        )
        
        import json
        result = json.loads(response.choices[0].message.content)
        
        return {
            "name": result.get("name", f"Item {request.barcode[-6:]}"),
            "category": result.get("category", "other"),
            "source": "ai"
        }
        
    except Exception as e:
        print(f"❌ AI barcode lookup error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI lookup failed: {str(e)}"
        )