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
                    "content": """You are an expert barcode reader and product identifier with web search capabilities.

YOUR TASK:
1. Read the barcode number from the image (look for 8-14 digits printed below the barcode lines)
2. SEARCH THE WEB for that barcode number to find the exact product
3. Verify the search results match the product packaging visible in the image

HOW TO READ THE BARCODE:
- Look for vertical black and white lines (the barcode)
- BELOW those lines, find the printed numbers (usually 12 digits)
- Read ALL digits from left to right
- Example format: "0 12345 67890 1" (might have spaces)

AFTER READING THE BARCODE:
- Use web search to look up: "[barcode number] UPC" or "[barcode number] product"
- Get the exact product name from search results
- Verify it matches the branding/text on the package

RESPONSE FORMAT (JSON only):
{
    "barcode": "complete barcode number with all digits, no spaces",
    "name": "Exact Brand Product Variant Size from web search",
    "category": "produce|dairy|meat|canned|grains|breakfast|beverages|snacks|frozen|bakery|condiments|other",
    "confidence": "high|medium|low"
}

IF YOU CANNOT READ THE BARCODE OR FIND IT ONLINE:
{
    "barcode": "unreadable",
    "name": "Unknown Product",
    "category": "other",
    "confidence": "low"
}

CRITICAL: Use web search to verify the product name. Don't rely on memory - search for the barcode online!"""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Read the barcode number from this image, then search the web for that barcode to identify the exact product. Verify the results match the packaging."
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
            tools=[
                {
                    "type": "web_search_20250305",
                    "name": "web_search"
                }
            ],
            response_format={ "type": "json_object" },
            temperature=0.2,  # Lower temperature for more consistent results
            max_tokens=300  # Increased for web search results
        )
        
        import json
        
        # Handle response - may include tool calls for web search
        message_content = response.choices[0].message.content
        
        # If GPT-4 used web search, the final content will still be in message.content
        # Parse the JSON response
        result = json.loads(message_content)
        
        barcode_read = result.get('barcode', 'unknown')
        product_name = result.get('name', 'Unknown Product')
        confidence = result.get('confidence', 'unknown')
        
        print(f"========================================")
        print(f"📸 Vision API Analysis (with Web Search):")
        print(f"   Barcode Read: {barcode_read}")
        print(f"   Product Name: {product_name}")
        print(f"   Confidence: {confidence}")
        print(f"   Category: {result.get('category', 'other')}")
        
        # Log if web search was used
        if hasattr(response.choices[0].message, 'tool_calls') and response.choices[0].message.tool_calls:
            print(f"   🌐 Web Search: Used ({len(response.choices[0].message.tool_calls)} searches)")
        
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