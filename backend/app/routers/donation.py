# backend/app/routers/donation.py
from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
import os
from openai import OpenAI

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class DonationItem(BaseModel):
    name: str
    quantity: float
    unit: str

class DonationImpactRequest(BaseModel):
    items: List[DonationItem]

@router.post("/calculate-impact")
async def calculate_donation_impact(payload: DonationImpactRequest):
    """
    Calculate accurate meal estimates and environmental impact using AI
    """
    try:
        items_text = "\n".join([
            f"- {item.quantity} {item.unit} {item.name}" 
            for item in payload.items
        ])
        
        prompt = f"""You are a food waste and nutrition expert. Calculate the donation impact for these food items:

{items_text}

CRITICAL: You must return EXACTLY {len(payload.items)} entries in items_breakdown, one for each item listed above. Even if items are duplicates, calculate and return each one separately.

CONVERSION RULES (FOLLOW EXACTLY):

PROTEINS (assume typical grocery portions):
- Chicken breast (1 pc) = 8oz = 0.5 lbs = 2 meals
- Turkey breast (1 pc) = 8oz = 0.5 lbs = 2 meals  
- Ground beef/turkey (1 lb) = 4 meals
- Eggs (1 pc) = 2oz = 0.125 lbs = 0.25 meals
- Canned tuna/chicken (1 can, 5oz) = 1.5 meals

GRAINS & STARCHES:
- Rice (1 lb dry) = 8 meals (as side dish)
- Pasta (1 lb dry) = 8 meals (as main dish)
- Bread (1 loaf, 20oz) = 10 meals (2 slices per meal)
- Cereal (1 box, 18oz) = 6 meals

CANNED GOODS:
- Beans (1 can, 15oz) = 2 meals
- Vegetables (1 can, 15oz) = 2 meals
- Soup (1 can, 10oz) = 1 meal
- Tomato sauce (1 can, 15oz) = 3 meals (as ingredient)

FRESH PRODUCE:
- Apple (1 pc, medium 6oz) = 0.5 meals (snack)
- Banana (1 pc, 4oz) = 0.5 meals (snack)
- Potato (1 pc, 8oz) = 0.5 meals (side dish)
- Carrots (1 lb) = 4 meals (as side)
- Lettuce (1 head, 1 lb) = 4 meals (salad)

DAIRY:
- Milk (1 gallon) = 16 meals (1 cup servings)
- Cheese (1 lb) = 8 meals (2oz servings)
- Yogurt (1 container, 6oz) = 1 meal

WEIGHT CONVERSIONS:
- If unit is "pc" (piece), use the specific item rules above
- If unit is "lbs", calculate directly using meal-per-pound ratios
- If unit is "oz", convert to pounds first (oz / 16)
- If unit is "can", use canned goods rules above
- If item type is unclear, estimate conservatively

CALCULATION PROCESS:
1. Identify the food item and unit
2. Convert to pounds using rules above
3. Calculate meals based on typical serving sizes
4. For items not listed, use these defaults:
   - Fruits/vegetables: 0.5 lbs = 1 meal
   - Proteins: 0.25 lbs (4oz) = 1 meal
   - Grains/pasta: 1 lb = 8 meals
   - Canned goods: 1 can = 2 meals

IMPORTANT: Return one breakdown entry for EACH item in the input list, even if items are identical.

Return ONLY a JSON object with this exact structure:
{{
  "total_meals": <number>,
  "total_pounds": <number>,
  "co2_saved_lbs": <number>,
  "items_breakdown": [
    {{
      "name": "<item name>",
      "meals": <number>,
      "pounds": <number>,
      "reasoning": "<brief explanation>"
    }}
  ]
}}

Example for "1 pc apple":
{{
  "total_meals": 0.5,
  "total_pounds": 0.375,
  "co2_saved_lbs": 1.43,
  "items_breakdown": [
    {{
      "name": "apple",
      "meals": 0.5,
      "pounds": 0.375,
      "reasoning": "One medium apple (~6oz) is typically a snack portion, about half a meal equivalent"
    }}
  ]
}}"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a food waste and nutrition calculation expert. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,  # Changed from 0.3 to 0.0 for consistent results
            max_tokens=800,
            seed=42  # Added seed for even more consistency
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        import re
        
        # Extract JSON from response (in case there's extra text)
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            raise ValueError("No JSON found in response")
        
        # Round values for cleaner display
        result['total_meals'] = round(result['total_meals'], 1)
        result['total_pounds'] = round(result['total_pounds'], 2)
        result['co2_saved_lbs'] = round(result['co2_saved_lbs'], 2)
        
        return result
        
    except Exception as e:
        print(f"Error calculating impact: {str(e)}")
        # Fallback to simple calculation if AI fails
        total_meals = 0
        total_pounds = 0
        
        for item in payload.items:
            # Improved fallback logic with food-specific estimates
            item_name_lower = item.name.lower()
            
            # Convert to pounds
            if item.unit == 'lbs':
                pounds = item.quantity
            elif item.unit == 'oz':
                pounds = item.quantity / 16
            elif item.unit == 'g':
                pounds = item.quantity / 453.592
            elif item.unit == 'can':
                pounds = item.quantity * 0.9375  # Assume 15oz can
            elif item.unit == 'pc':
                # Estimate weight per piece based on item type
                if any(word in item_name_lower for word in ['apple', 'orange', 'fruit']):
                    pounds = item.quantity * 0.375  # 6oz fruit
                elif any(word in item_name_lower for word in ['chicken', 'turkey', 'meat', 'breast']):
                    pounds = item.quantity * 0.5  # 8oz protein
                elif any(word in item_name_lower for word in ['egg']):
                    pounds = item.quantity * 0.125  # 2oz egg
                elif any(word in item_name_lower for word in ['potato', 'vegetable']):
                    pounds = item.quantity * 0.5  # 8oz vegetable
                else:
                    pounds = item.quantity * 0.5  # Default 8oz
            else:  # cup, etc
                pounds = item.quantity * 0.5
            
            # Calculate meals based on food type
            if any(word in item_name_lower for word in ['rice', 'pasta', 'grain']):
                meals = pounds * 8  # 1 lb = 8 meals
            elif any(word in item_name_lower for word in ['meat', 'chicken', 'turkey', 'beef', 'protein', 'fish']):
                meals = pounds * 4  # 1 lb = 4 meals
            elif any(word in item_name_lower for word in ['apple', 'banana', 'fruit', 'snack']):
                meals = pounds * 1.33  # 6oz = 0.5 meals, so 1 lb ≈ 1.33 meals
            elif any(word in item_name_lower for word in ['can', 'bean', 'soup']):
                meals = pounds * 2  # 15oz can ≈ 2 meals
            else:
                meals = pounds * 2  # Default: 8oz = 1 meal
            
            total_pounds += pounds
            total_meals += meals
        
        return {
            "total_meals": round(total_meals, 1),
            "total_pounds": round(total_pounds, 2),
            "co2_saved_lbs": round(total_pounds * 3.8, 2),
            "items_breakdown": [
                {
                    "name": item.name,
                    "meals": round(item.quantity * 0.5, 1),
                    "pounds": round(item.quantity * 0.5, 2),
                    "reasoning": "Fallback calculation"
                }
                for item in payload.items
            ]
        }