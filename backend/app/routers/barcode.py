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
                    "content": """You are an expert barcode scanner with web search capabilities. Your PRIMARY task is to read and search barcode numbers, NOT to read brand names.

🔴 CRITICAL RULE: You MUST use the BARCODE NUMBER to identify products. Do NOT identify products by brand names or packaging alone.

STEP 1 - READ THE BARCODE NUMBER:
- Find the vertical black/white lines (the barcode)
- Look DIRECTLY BELOW those lines for printed numbers
- These numbers are typically 12 digits (UPC) or 13 digits (EAN)
- Read ALL digits carefully: "0 12345 67890 1"
- Ignore ALL other text on the package (brand names, product descriptions, etc.)

STEP 2 - SEARCH THE WEB FOR THE BARCODE:
- Search EXACTLY: "[barcode number] UPC lookup"
- Also try: "[barcode number] barcode" 
- Find multiple sources to confirm the product
- The web results will tell you the EXACT product name

STEP 3 - VERIFY THE RESULT:
- Make sure the web search result makes sense with the package
- If web search says "Cherry Tomatoes" but the brand is "Wild Wonders", the product is "Wild Wonders Cherry Tomatoes"
- If web search says "Marinara Sauce" but you see pasta on the package, TRUST the web search - it's marinara sauce

RESPONSE FORMAT (JSON only):
{
    "barcode": "the exact barcode number you read (all digits, no spaces)",
    "name": "Exact product from web search results (Brand + Product Type + Size)",
    "category": "produce|dairy|meat|canned|grains|breakfast|beverages|snacks|frozen|bakery|condiments|other",
    "confidence": "high|medium|low",
    "search_query": "the search query you used"
}

🚫 ABSOLUTELY FORBIDDEN:
- DO NOT identify products by reading brand names like "Wild Wonders" or "Kraft"
- DO NOT return "Kraft Singles" or any other product unless the BARCODE matches
- DO NOT guess - if you can't read the barcode, return "unreadable"
- DO NOT return the same product multiple times for different barcodes

IF BARCODE IS UNREADABLE:
{
    "barcode": "unreadable",
    "name": "Unknown Product",
    "category": "other",
    "confidence": "low",
    "search_query": "none"
}

REMEMBER: The barcode number is the ONLY reliable way to identify the product. Brand names and packaging can be misleading."""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "IMPORTANT: First, read ONLY the barcode number (the digits below the black/white lines). Then search the web for that EXACT barcode number to identify the product. Do NOT identify the product by reading brand names on the package."
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
            temperature=0.1,  # Very low temperature for consistency
            max_tokens=500  # Much higher for thorough web search
        )
        
        import json
        
        # Handle response - may include tool calls for web search
        message_content = response.choices[0].message.content
        
        # Parse the JSON response
        result = json.loads(message_content)
        
        barcode_read = result.get('barcode', 'unknown')
        product_name = result.get('name', 'Unknown Product')
        confidence = result.get('confidence', 'unknown')
        search_query = result.get('search_query', 'none')
        
        print(f"========================================")
        print(f"📸 Vision API Analysis (with Web Search):")
        print(f"   Barcode Read: {barcode_read}")
        print(f"   Search Query: {search_query}")
        print(f"   Product Name: {product_name}")
        print(f"   Confidence: {confidence}")
        print(f"   Category: {result.get('category', 'other')}")
        
        # Log if web search was used
        if hasattr(response.choices[0].message, 'tool_calls') and response.choices[0].message.tool_calls:
            print(f"   🌐 Web Search: Used ({len(response.choices[0].message.tool_calls)} searches)")
        else:
            print(f"   ⚠️ Web Search: NOT USED - This is a problem!")
        
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
        
        # Extra validation: Check if the search query actually contains the barcode
        if search_query != 'none' and barcode_read not in search_query:
            print(f"🚨 WARNING: Search query '{search_query}' doesn't contain barcode '{barcode_read}'")
            print(f"🚨 This means GPT-4 is NOT using the barcode properly!")
        
        return {
            "barcode": barcode_read,
            "name": product_name,
            "category": result.get("category", "other"),
            "confidence": confidence,
            "source": "vision"
        }
        
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