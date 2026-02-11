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

Analyze each item carefully and provide:
1. Realistic meal estimates (consider portion sizes, nutritional value, and how the food is typically used)
2. Weight in pounds (convert if needed)
3. CO2 emissions prevented (use EPA food waste data: average is 3.8 lbs CO2 per lb of food waste)

RULES:
- 1 apple (medium, ~6oz) = about 0.5 meals (it's a snack/side, not a full meal)
- 1 lb of rice/pasta = about 8 meals
- 1 lb of meat/protein = about 4 meals
- 1 lb of vegetables = about 4 meals
- Canned goods (1 can, ~15oz) = about 2 meals
- Be realistic: don't overestimate small quantities

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
            temperature=0.3,
            max_tokens=800
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
            # Simple fallback logic
            if item.unit == 'lbs':
                pounds = item.quantity
            elif item.unit == 'oz':
                pounds = item.quantity / 16
            elif item.unit == 'g':
                pounds = item.quantity / 453.592
            else:  # pc, cup, etc
                pounds = item.quantity * 0.5
            
            meals = pounds * 2  # Very rough estimate
            
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