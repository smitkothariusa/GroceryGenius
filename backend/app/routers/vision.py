# backend/app/routers/vision.py
from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
import base64
import os
from openai import OpenAI

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@router.post("/analyze-ingredients")
async def analyze_ingredients(file: UploadFile = File(...)):
    """
    Analyze an image and extract visible ingredients using GPT-4 Vision
    """
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Convert to base64
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # Call GPT-4 Vision API
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
        
    except Exception as e:
        print(f"Vision API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze image: {str(e)}")

@router.get("/test")
def test_vision():
    """Test endpoint to verify vision router is working"""
    return {"status": "Vision API ready", "model": "gpt-4o"}