# backend/app/routers/recipes.py
import json
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from app.services.openai_client import call_chat_completion
from app.services.recipe_parser import parse_recipes_text

router = APIRouter()

class Ingredients(BaseModel):
    ingredients: List[str]
    strict: bool = False

LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French",
    "de": "German", "zh": "Chinese", "ja": "Japanese",
}

@router.post("/", response_model=List[dict])
async def generate_recipes(payload: Ingredients, dietary: Optional[str] = Query(None), language: Optional[str] = Query(None)):
    ingredients = [i.strip() for i in payload.ingredients if i.strip()]
    if not ingredients:
        return [{"name": "No ingredients provided", "instructions": "Please provide at least one ingredient."}]

    # Check if first ingredient is a specific recipe request (longer text)
    specific_recipe = None
    ingredient_list = ingredients
    
    if len(ingredients) > 0 and len(ingredients[0].split()) > 3:
        specific_recipe = ingredients[0]
        ingredient_list = ingredients[1:] if len(ingredients) > 1 else []

    # Resolve language name for the prompt
    lang_code = (language or "en").split("-")[0].lower()
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")

    # Enhanced system message for health and budget focus
    system_prompt = f"""You are a professional nutritionist and chef assistant. You create detailed recipes with exact measurements and nutritional information.
IMPORTANT: You MUST write ALL recipe text (name, ingredients, instructions, health_benefits, budget_tip, difficulty) in {lang_name}.

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
            if payload.strict:
                recipe_request += f"\nUse ONLY these exact ingredients (no substitutions or additions): {', '.join(ingredient_list)}"
            else:
                recipe_request += f"\nIncorporate these ingredients when possible: {', '.join(ingredient_list)}"
    else:
        if payload.strict:
            recipe_request = f"Using ONLY these exact ingredients (no substitutions, additions, or extra pantry staples): {', '.join(ingredient_list)}"
        else:
            recipe_request = f"Using these ingredients: {', '.join(ingredient_list)}"

    dietary_text = f"\nDietary preference: {dietary}" if dietary else ""

    user_prompt = f"""{recipe_request}{dietary_text}

Create EXACTLY 3 different recipes (DO NOT number the recipe names).
Write ALL text in {lang_name}.

For EACH recipe provide:
- Recipe name (WITHOUT numbering like "1.", "Recipe 1:", etc.)
- Complete ingredient list with exact measurements (format: "quantity unit ingredient")
- Step-by-step cooking instructions (numbered steps)
- Prep time and cook time
- Difficulty level (in {lang_name})
- Serving size (default 2 servings)
- Nutrition per serving (calories, protein, carbs, fat, fiber, sodium — numbers only)
- Health benefits (in {lang_name})
- Budget-saving tip (in {lang_name})

CRITICAL: Return ONLY a valid JSON array with this exact structure:
[
  {{
    "name": "Recipe Name in {lang_name}",
    "ingredients": "2 cups rice\\n1 tbsp olive oil\\n...",
    "instructions": "1. First step...\\n2. Second step...",
    "prep_time": "15 min",
    "cook_time": "20 min",
    "difficulty": "Easy",
    "servings": 2,
    "nutrition": {{"calories": 350, "protein": 20, "carbs": 45, "fat": 10, "fiber": 6, "sodium": 400}},
    "health_benefits": "Benefits in {lang_name}...",
    "budget_tip": "Tip in {lang_name}..."
  }},
  {{second recipe}},
  {{third recipe}}
]"""

    try:
        raw = await call_chat_completion(system_prompt, user_prompt, max_tokens=4000, temperature=0.7)
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


class TranslateNamesRequest(BaseModel):
    names: List[str]
    language: str

@router.post("/translate-names", response_model=List[str])
async def translate_recipe_names(payload: TranslateNamesRequest):
    """Translate a list of recipe names to the target language using OpenAI."""
    if not payload.names:
        return []
    lang_code = payload.language.split("-")[0].lower()
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")

    names_list = "\n".join(f"{i+1}. {name}" for i, name in enumerate(payload.names))
    system = f"You are a translator. Translate recipe names to {lang_name}. Keep them as proper recipe names (not literal translations if that sounds unnatural). Return ONLY a numbered list in the same order, one name per line, with no extra text."
    user = f"Translate these recipe names to {lang_name}:\n{names_list}"
    try:
        raw = await call_chat_completion(system, user, max_tokens=500, temperature=0.3)
        lines = [l.strip() for l in raw.strip().splitlines() if l.strip()]
        # Strip numbering from lines like "1. Nombre"
        translated = []
        for line in lines:
            clean = line.lstrip("0123456789. ").strip()
            if clean:
                translated.append(clean)
        # Pad with originals if count mismatch
        while len(translated) < len(payload.names):
            translated.append(payload.names[len(translated)])
        return translated[:len(payload.names)]
    except Exception as e:
        print("Translation error:", e)
        return payload.names


class TranslateFullRecipesRequest(BaseModel):
    recipes: List[dict]
    language: str

@router.post("/translate-full")
async def translate_full_recipes(payload: TranslateFullRecipesRequest):
    """Translate all text fields of recipe objects to the target language."""
    if not payload.recipes:
        return []
    lang_code = payload.language.split("-")[0].lower()
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")

    translated_recipes = []
    for recipe in payload.recipes:
        fields_to_translate = {
            k: v for k, v in recipe.items()
            if k in ("name", "ingredients", "instructions", "difficulty", "health_benefits", "budget_tip")
            and isinstance(v, str) and v.strip()
        }
        if not fields_to_translate:
            translated_recipes.append(recipe)
            continue
        system = (
            f"You are a professional translator. Translate ONLY the provided JSON field values to {lang_name}. "
            "Return ONLY valid JSON with exactly the same keys. Do not add or remove keys. "
            "Preserve numbers, units, and formatting (newlines, numbering in steps)."
        )
        user = f"Translate these recipe fields to {lang_name}:\n{json.dumps(fields_to_translate, ensure_ascii=False)}"
        try:
            raw = await call_chat_completion(system, user, max_tokens=2000, temperature=0.3)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            translated_fields = json.loads(raw)
            translated_recipes.append({**recipe, **translated_fields})
        except Exception as e:
            print("Full recipe translation error:", e)
            translated_recipes.append(recipe)
    return translated_recipes