# backend/routes/barcode.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from openai import OpenAI

router = APIRouter()

class BarcodeRequest(BaseModel):
    barcode: str

@router.post("/barcode/ai-lookup")
async def ai_barcode_lookup(request: BarcodeRequest):
    """
    Use OpenAI to identify a product from its barcode when other APIs fail.
    This is a last-resort fallback that uses AI to make an educated guess.
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
                        "category": "produce|dairy|meat|canned|grains|breakfast|other"
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