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
                    "content": """You are an expert barcode reader and product identifier. Your task is to read UPC/EAN barcodes from product images.

HOW TO READ A BARCODE FROM AN IMAGE:
1. Look for the barcode - it's usually a series of vertical black and white lines
2. BELOW the barcode lines, you'll see a row of numbers printed in a clear font
3. This number is typically 12 digits (UPC-A) or 13 digits (EAN-13)
4. The numbers are usually printed like: "0 12345 67890 1" (with spaces for readability)
5. Read ALL the digits from left to right - do NOT skip any digits

CRITICAL READING RULES:
- Read ONLY the numbers that are printed DIRECTLY BELOW the barcode lines
- Do NOT read numbers from elsewhere on the package
- Do NOT guess or make up digits if you can't see them clearly
- If the image is blurry or numbers are unclear, return "unreadable"

AFTER READING THE BARCODE:
- Use the EXACT barcode number to identify the product from your UPC/EAN database
- Verify the product name matches the branding/text visible on the package
- Include the brand name, product variant, and size in your response

RESPONSE FORMAT (JSON only):
{
    "barcode": "complete barcode number with all digits, no spaces",
    "name": "Exact Brand Product Variant Size",
    "category": "produce|dairy|meat|canned|grains|breakfast|beverages|snacks|frozen|bakery|condiments|other",
    "confidence": "high|medium|low"
}

IF BARCODE NUMBERS ARE UNCLEAR/UNREADABLE:
{
    "barcode": "unreadable",
    "name": "Unknown Product",
    "category": "other",
    "confidence": "low"
}

ABSOLUTELY FORBIDDEN:
- Do NOT return "Parle-G", "Coca-Cola", or any other product unless the barcode ACTUALLY matches
- Do NOT make up barcode numbers
- Do NOT guess products based only on packaging without reading the barcode
- Do NOT return example products from this prompt"""
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