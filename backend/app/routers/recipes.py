# backend/app/routers/recipes.py
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from app.services.openai_client import call_chat_completion
from app.services.recipe_parser import parse_recipes_text

router = APIRouter()

class Ingredients(BaseModel):
    ingredients: List[str]

@router.post("/", response_model=List[dict])
async def generate_recipes(payload: Ingredients, dietary: Optional[str] = Query(None)):
    ingredients = [i.strip() for i in payload.ingredients if i.strip()]
    if not ingredients:
        return [{"name": "No ingredients provided", "instructions": "Please provide at least one ingredient."}]

    # Check if first ingredient is a specific recipe request (longer text)
    specific_recipe = None
    ingredient_list = ingredients
    
    if len(ingredients) > 0 and len(ingredients[0].split()) > 3:
        specific_recipe = ingredients[0]
        ingredient_list = ingredients[1:] if len(ingredients) > 1 else []

    # Enhanced system message for health and budget focus
    system_prompt = """You are a professional nutritionist and chef assistant. You create detailed recipes with exact measurements and nutritional information. 

Key requirements:
1. Provide ONE normal recipe and TWO healthy, budget-friendly recipes
2. Use exact measurements for ALL ingredients (cups, tbsp, tsp, oz, lbs, pieces)
3. List ingredients separately from instructions
4. Include complete nutritional information
5. Focus on affordable, nutritious ingredients
6. Provide practical cooking tips

Output structured JSON format for easy parsing."""

    # Build user prompt based on input
    if specific_recipe:
        recipe_request = f"Create a recipe for: {specific_recipe}"
        if ingredient_list:
            recipe_request += f"\nIncorporate these ingredients when possible: {', '.join(ingredient_list)}"
    else:
        recipe_request = f"Using these ingredients: {', '.join(ingredient_list)}"
    
    dietary_text = f"\nDietary preference: {dietary}" if dietary else ""
    
    user_prompt = f"""{recipe_request}{dietary_text}

Create EXACTLY 3 different recipes (DO NOT number the recipe names):
- First recipe: A normal, delicious recipe
- Second recipe: A healthy, budget-friendly alternative  
- Third recipe: Another healthy, budget-friendly variation

For EACH recipe provide:
- Recipe name (WITHOUT numbering like "1.", "Recipe 1:", etc.)
- Complete ingredient list with exact measurements (format: "quantity unit ingredient")
- Step-by-step cooking instructions (numbered steps)
- Prep time and cook time
- Difficulty level (Easy/Medium/Hard)
- Serving size (default 2 servings)
- Nutrition per serving (calories, protein, carbs, fat, fiber, sodium)
- Health benefits
- Budget-saving tip

CRITICAL: Return as JSON array with this exact structure. DO NOT include numbers in recipe names:
[
  {{
    "name": "Creamy Garlic Pasta",
    "ingredients": "2 cups rice\\n1 tbsp olive oil\\n3 cloves garlic\\n...",
    "instructions": "1. First step...\\n2. Second step...\\n3. Third step...",
    "prep_time": "15 min",
    "cook_time": "20 min", 
    "difficulty": "Easy",
    "servings": 2,
    "nutrition": {{"calories": 350, "protein": 20, "carbs": 45, "fat": 10, "fiber": 6, "sodium": 400}},
    "health_benefits": "Rich in...",
    "budget_tip": "Buy in bulk..."
  }},
  {{second recipe}},
  {{third recipe}}
]

Make sure ALL ingredients mentioned in instructions are listed in the ingredients field with measurements."""

    try:
        raw = await call_chat_completion(system_prompt, user_prompt, max_tokens=1500, temperature=0.7)
        recipes = parse_recipes_text(raw, expected=3)
        
        # Ensure we have exactly 3 recipes
        if len(recipes) < 3:
            # Generate additional recipes if needed
            while len(recipes) < 3:
                recipes.append({
                    "name": f"Recipe {len(recipes) + 1}",
                    "ingredients": "See instructions for ingredients",
                    "instructions": "Recipe generation incomplete. Please try again.",
                    "prep_time": "15 min",
                    "cook_time": "20 min",
                    "difficulty": "Easy",
                    "servings": 2,
                    "nutrition": {"calories": 300, "protein": 15, "carbs": 35, "fat": 8, "fiber": 5, "sodium": 400},
                    "health_benefits": "Nutritious meal",
                    "budget_tip": "Use seasonal ingredients"
                })
        
        return recipes[:3]  # Return exactly 3 recipes
    except Exception as e:
        print("OpenAI call or parsing error:", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate recipes: {str(e)}")