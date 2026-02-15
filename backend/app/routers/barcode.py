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
                    "content": """You are a product identification expert. You will be shown an image containing a barcode on a product.
                    
Your task (CRITICAL - FOLLOW THESE STEPS IN ORDER):
1. FIRST: Locate and read the barcode numbers in the image (typically 8, 12, 13, or 14 digits)
2. SECOND: Use those barcode numbers to identify the exact product (you have knowledge of UPC/EAN databases)
3. THIRD: Verify the identification by looking at the packaging, labels, text, and logos visible in the image
4. Include the full brand name, product variant, and size in your response (e.g., "Coca-Cola Classic 12oz Can" not just "Soda")

IMPORTANT: The barcode number is your PRIMARY identification method. Use the visual packaging information to CONFIRM and enhance your answer.

Return ONLY a JSON object with this structure:
{
    "barcode": "the 12-digit barcode you read from the image",
    "name": "Brand Product Name with Variant/Size",
    "category": "produce|dairy|meat|canned|grains|breakfast|beverages|snacks|frozen|bakery|condiments|other",
    "confidence": "high|medium|low"
}

If you cannot read the barcode clearly, return:
{
    "barcode": "unreadable",
    "name": "Unknown Product",
    "category": "other",
    "confidence": "low"
}"""
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
        
        print(f"✅ Vision API read barcode: {barcode_read}")
        print(f"✅ Vision API identified: {product_name} (confidence: {result.get('confidence', 'unknown')})")
        
        return {
            "barcode": barcode_read,
            "name": product_name,
            "category": result.get("category", "other"),
            "confidence": result.get("confidence", "low"),
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
            max_tokens=150
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