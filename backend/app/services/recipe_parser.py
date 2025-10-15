# backend/app/services/recipe_parser.py
import json
import re
from typing import List, Dict, Any

def parse_recipes_text(text: str, expected: int = 3) -> List[Dict[str, Any]]:
    """
    Enhanced parser for detailed recipes with nutrition information.
    """
    text = (text or "").strip()
    if not text:
        return []

    # Remove markdown code blocks if present
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()

    # 1) JSON attempt - try to find JSON array
    try:
        # Try direct parse first
        parsed = json.loads(text)
        if isinstance(parsed, list):
            results = []
            for obj in parsed:
                if isinstance(obj, dict):
                    # Enhanced recipe object with nutrition and health data
                    recipe = {
                        "name": str(obj.get("name", "")).strip(),
                        "ingredients": str(obj.get("ingredients", "")).strip(),
                        "instructions": str(obj.get("instructions", "")).strip(),
                        "prep_time": str(obj.get("prep_time", "15 min")).strip(),
                        "cook_time": str(obj.get("cook_time", "20 min")).strip(),
                        "difficulty": str(obj.get("difficulty", "Easy")).strip(),
                        "servings": str(obj.get("servings", "2")).strip(),
                        "nutrition": obj.get("nutrition", {
                            "calories": 300,
                            "protein": 15,
                            "carbs": 35,
                            "fat": 8,
                            "fiber": 5,
                            "sodium": 400
                        }),
                        "health_benefits": str(obj.get("health_benefits", "Nutritious and balanced meal")).strip(),
                        "budget_tip": str(obj.get("budget_tip", "Buy ingredients in bulk to save money")).strip()
                    }
                    results.append(recipe)
            if results:
                return results[:expected]
    except Exception as e:
        print(f"JSON parsing error: {e}")
        pass

    # Try to extract JSON from text if it's embedded
    json_match = re.search(r'\[[\s\S]*\]', text)
    if json_match:
        try:
            parsed = json.loads(json_match.group(0))
            if isinstance(parsed, list):
                results = []
                for obj in parsed:
                    if isinstance(obj, dict):
                        recipe = {
                            "name": str(obj.get("name", "")).strip(),
                            "ingredients": str(obj.get("ingredients", "")).strip(),
                            "instructions": str(obj.get("instructions", "")).strip(),
                            "prep_time": str(obj.get("prep_time", "15 min")).strip(),
                            "cook_time": str(obj.get("cook_time", "20 min")).strip(),
                            "difficulty": str(obj.get("difficulty", "Easy")).strip(),
                            "servings": str(obj.get("servings", "2")).strip(),
                            "nutrition": obj.get("nutrition", {
                                "calories": 300,
                                "protein": 15,
                                "carbs": 35,
                                "fat": 8,
                                "fiber": 5,
                                "sodium": 400
                            }),
                            "health_benefits": str(obj.get("health_benefits", "Nutritious and balanced meal")).strip(),
                            "budget_tip": str(obj.get("budget_tip", "Buy ingredients in bulk to save money")).strip()
                        }
                        results.append(recipe)
                if results:
                    return results[:expected]
        except Exception:
            pass

    # 2) Fallback parsing with estimated nutrition
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    results = []
    
    for i, block in enumerate(blocks):
        if ":" in block:
            lines = block.splitlines()
            first = lines[0]
            if ":" in first:
                name_part, rest = first.split(":", 1)
                name = name_part.strip()
                # Remove any numbering
                name = re.sub(r'^\d+\.\s*', '', name)
                instr = rest.strip() + ("\n" + "\n".join(lines[1:]).strip() if len(lines) > 1 else "")
            else:
                parts = block.split(":", 1)
                if len(parts) == 2:
                    name = re.sub(r'^\d+\.\s*', '', parts[0].strip())
                    instr = parts[1].strip()
                else:
                    name = f"Healthy Recipe {i+1}"
                    instr = block
        else:
            lines = block.splitlines()
            if lines and len(lines[0].split()) <= 6 and len(lines) > 1:
                name = re.sub(r'^\d+\.\s*', '', lines[0].strip())
                instr = "\n".join(lines[1:]).strip()
            else:
                name = f"Healthy Recipe {i+1}"
                instr = block

        # Generate estimated nutrition based on recipe content
        estimated_nutrition = estimate_nutrition(f"{name} {instr}")
        
        recipe = {
            "name": name,
            "ingredients": "See instructions for ingredient list",
            "instructions": instr,
            "prep_time": "15 min",
            "cook_time": "20 min",
            "difficulty": "Easy",
            "servings": "2",
            "nutrition": estimated_nutrition,
            "health_benefits": generate_health_benefits(f"{name} {instr}"),
            "budget_tip": "Use seasonal ingredients and buy in bulk for savings"
        }
        results.append(recipe)
    
    if results:
        return results[:expected]

    # 3) Final fallback - single recipe
    return [{
        "name": "Healthy Recipe",
        "ingredients": "See instructions",
        "instructions": text,
        "prep_time": "15 min",
        "cook_time": "20 min",
        "difficulty": "Easy",
        "servings": "2",
        "nutrition": {
            "calories": 300,
            "protein": 15,
            "carbs": 35,
            "fat": 8,
            "fiber": 5,
            "sodium": 400
        },
        "health_benefits": "Nutritious and balanced meal with quality ingredients",
        "budget_tip": "Choose seasonal ingredients for better prices"
    }]

def estimate_nutrition(recipe_text: str) -> Dict[str, int]:
    """
    Estimate nutrition based on ingredients mentioned in recipe.
    """
    text = recipe_text.lower()
    
    # Base nutrition values
    calories = 250
    protein = 12
    carbs = 30
    fat = 6
    fiber = 4
    sodium = 350
    
    # Adjust based on ingredients
    if any(word in text for word in ['chicken', 'beef', 'fish', 'salmon', 'turkey']):
        protein += 15
        calories += 100
    
    if any(word in text for word in ['quinoa', 'rice', 'pasta', 'bread', 'oats']):
        carbs += 20
        calories += 80
        
    if any(word in text for word in ['avocado', 'nuts', 'oil', 'butter', 'cheese']):
        fat += 8
        calories += 70
        
    if any(word in text for word in ['beans', 'lentils', 'broccoli', 'spinach', 'kale']):
        fiber += 6
        protein += 5
        
    if any(word in text for word in ['vegetables', 'salad', 'greens', 'tomato', 'cucumber']):
        fiber += 3
        calories -= 30
        
    return {
        "calories": max(calories, 150),
        "protein": max(protein, 5),
        "carbs": max(carbs, 15),
        "fat": max(fat, 3),
        "fiber": max(fiber, 2),
        "sodium": max(sodium, 200)
    }

def generate_health_benefits(recipe_text: str) -> str:
    """
    Generate health benefits based on ingredients.
    """
    text = recipe_text.lower()
    benefits = []
    
    if any(word in text for word in ['salmon', 'fish', 'omega']):
        benefits.append("Rich in omega-3 fatty acids for heart health")
        
    if any(word in text for word in ['spinach', 'kale', 'broccoli', 'greens']):
        benefits.append("High in vitamins A, C, and K for immune support")
        
    if any(word in text for word in ['quinoa', 'beans', 'lentils', 'protein']):
        benefits.append("Complete protein source for muscle maintenance")
        
    if any(word in text for word in ['berries', 'antioxidant', 'blueberries']):
        benefits.append("Packed with antioxidants to fight inflammation")
        
    if any(word in text for word in ['fiber', 'whole grain', 'oats']):
        benefits.append("High fiber content supports digestive health")
        
    if any(word in text for word in ['yogurt', 'probiotic', 'fermented']):
        benefits.append("Contains probiotics for gut health")
    
    if not benefits:
        benefits = ["Balanced nutrition with quality ingredients", "Supports overall health and wellness"]
    
    return ". ".join(benefits[:3]) + "."