# backend/app/routers/recipes.py
import json
import logging
import os
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from typing import List, Optional
from typing_extensions import Annotated
from pydantic import BaseModel, Field, field_validator
from supabase import create_client
from app.services.auth import limiter, AI_HEAVY_LIMIT, AI_LIGHT_LIMIT
from app.services.openai_client import call_chat_completion
from app.services.recipe_parser import parse_recipes_text
from app.services.ingredient_parsing import clean_ingredient_lines, strip_json_code_fences

logger = logging.getLogger(__name__)

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _increment_recipes_generated(n: int) -> None:
    """Best-effort bump of the app-wide `recipes_generated` counter
    (public.app_stats). Runs as a background task after the response is sent,
    with the service role — the increment_recipes_generated RPC is restricted to
    service_role so clients can't inflate the number. Never raises: an
    impact-metric write must not affect the user's recipe request."""
    if n <= 0 or not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    try:
        sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        sb.rpc("increment_recipes_generated", {"n": n}).execute()
    except Exception:
        logger.warning("failed to increment recipes_generated counter", exc_info=True)

class Ingredients(BaseModel):
    # 30 was an outlier vs. every other list-of-strings field in this codebase
    # (pantry.py's ingredient_lines: 100, shopping.py's items: 100,
    # donation.py's items: 500) — routine "Add Pantry Items"/"Cook What's
    # Expiring" usage populates this from a user's full pantry, which easily
    # exceeds 30 for anyone with a moderately stocked pantry, causing a 422
    # that surfaced to users as a generic "failed to generate recipes" error.
    ingredients: List[Annotated[str, Field(max_length=200)]] = Field(max_length=100)
    strict: bool = False

LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French",
    "de": "German", "zh": "Chinese", "ja": "Japanese",
}

# Registered at BOTH "" (/recipes) and "/" (/recipes/) so that neither path
# 307-redirects to the other. Starlette's redirect_slashes would otherwise send
# /recipes -> /recipes/, and browsers drop the Authorization header when
# following that redirect, so the retried request arrives tokenless and 401s.
# That broke recipe generation for clients posting to /recipes (see the
# trailing-slash comment in frontend RecipeSection.tsx). The frontend now
# requests the canonical path, but this alias is what rescues clients still
# running an older cached bundle — they keep posting to /recipes and, without
# it, would stay broken until their bundle updated. This is the only
# collection-root route in the API; every other route has a named sub-path and
# so never redirects.
@router.post("", include_in_schema=False, response_model=List[dict])
@router.post("/", response_model=List[dict])
@limiter.limit(AI_HEAVY_LIMIT)
async def generate_recipes(request: Request, payload: Ingredients, background_tasks: BackgroundTasks, dietary: Optional[str] = Query(None), language: Optional[str] = Query(None), difficulty: Optional[str] = Query(None)):
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
    difficulty_requirement = f"\nIMPORTANT: ALL 3 recipes MUST be {difficulty.capitalize()} difficulty. Set the \"difficulty\" field to \"{difficulty.capitalize()}\" for every recipe." if difficulty else ""
    system_prompt = f"""You are a professional nutritionist and chef assistant. You create detailed recipes with exact measurements and nutritional information.
IMPORTANT: You MUST write ALL recipe text (name, ingredients, instructions, health_benefits, budget_tip, difficulty) in {lang_name}.{difficulty_requirement}

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
    difficulty_text = f"\nDifficulty level: ALL 3 recipes MUST be {difficulty.capitalize()} difficulty" if difficulty else ""

    user_prompt = f"""{recipe_request}{dietary_text}{difficulty_text}

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
    "difficulty": "{difficulty.capitalize() if difficulty else 'Easy'}",
    "servings": 2,
    "nutrition": {{"calories": 350, "protein": 20, "carbs": 45, "fat": 10, "fiber": 6, "sodium": 400}},
    "health_benefits": "Benefits in {lang_name}...",
    "budget_tip": "Tip in {lang_name}..."
  }},
  {{second recipe}},
  {{third recipe}}
]"""

    try:
        raw = await call_chat_completion(system_prompt, user_prompt, max_tokens=4000, temperature=0.7, route="recipes.generate_recipes")
        recipes = parse_recipes_text(raw, expected=3)

        # Count the real recipes parsed (before any placeholder padding below)
        # toward the app-wide recipes_generated impact counter. Fires after the
        # response is sent, so it adds no latency.
        real_recipe_count = min(len(recipes), 3)
        background_tasks.add_task(_increment_recipes_generated, real_recipe_count)

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
        logger.error("OpenAI call or parsing error", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate recipes: {str(e)}")


class TranslateNamesRequest(BaseModel):
    names: List[Annotated[str, Field(max_length=200)]] = Field(max_length=50)
    language: str = Field(min_length=1, max_length=10)

@router.post("/translate-names", response_model=List[str])
@limiter.limit(AI_LIGHT_LIMIT)
async def translate_recipe_names(request: Request, payload: TranslateNamesRequest):
    """Translate a list of recipe names to the target language using OpenAI."""
    if not payload.names:
        return []
    lang_code = payload.language.split("-")[0].lower()
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")

    names_list = "\n".join(f"{i+1}. {name}" for i, name in enumerate(payload.names))
    system = f"You are a translator. Translate recipe names to {lang_name}. Keep them as proper recipe names (not literal translations if that sounds unnatural). Return ONLY a numbered list in the same order, one name per line, with no extra text."
    user = f"Translate these recipe names to {lang_name}:\n{names_list}"
    try:
        raw = await call_chat_completion(system, user, max_tokens=500, temperature=0.3, route="recipes.translate_recipe_names")
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
    except Exception:
        logger.error("Translation error", exc_info=True)
        return payload.names


class TranslateFullRecipesRequest(BaseModel):
    recipes: List[dict] = Field(max_length=10)
    language: str = Field(min_length=1, max_length=10)

    @field_validator("recipes")
    @classmethod
    def _cap_recipe_size(cls, recipes: List[dict]) -> List[dict]:
        # recipes are arbitrary dicts (round-tripped as-is), so per-field Field()
        # limits don't apply here — guard against oversized/abusive payloads directly.
        for recipe in recipes:
            if len(recipe) > 30:
                raise ValueError("recipe object has too many fields")
            if len(json.dumps(recipe, ensure_ascii=False)) > 20_000:
                raise ValueError("recipe object is too large")
        return recipes

@router.post("/translate-full")
@limiter.limit(AI_HEAVY_LIMIT)
async def translate_full_recipes(request: Request, payload: TranslateFullRecipesRequest):
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
            raw = await call_chat_completion(system, user, max_tokens=2000, temperature=0.3, route="recipes.translate_full_recipes")
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            translated_fields = json.loads(raw)
            translated_recipes.append({**recipe, **translated_fields})
        except Exception:
            logger.error("Full recipe translation error", exc_info=True)
            translated_recipes.append(recipe)
    return translated_recipes


class IngredientParseRequest(BaseModel):
    lines: List[Annotated[str, Field(max_length=300)]] = Field(min_length=1, max_length=100)

@router.post("/parse-ingredients")
@limiter.limit(AI_LIGHT_LIMIT)
async def parse_ingredients(request: Request, payload: IngredientParseRequest):
    """Use AI to parse raw ingredient lines into structured name/quantity/unit objects."""
    lines = clean_ingredient_lines(payload.lines)
    if not lines:
        return []

    system_prompt = (
        "You are an ingredient parser. Convert each ingredient line into structured data.\n"
        "Rules:\n"
        "- name: the ingredient only — no preparation notes, descriptors, or parenthetical info "
        "(e.g. 'apples, diced' → 'apples', 'fresh garlic (optional)' → 'garlic')\n"
        "- quantity: decimal number — convert fractions (1/4 → 0.25, 1/2 → 0.5, 1 1/2 → 1.5). "
        "Use 1 if no quantity given.\n"
        "- unit: measurement unit (cup, tbsp, tsp, oz, lb, g, kg, ml, clove, slice, etc.). "
        "Use 'pc' if no unit.\n"
        "- SKIP items that are not bought at a grocery store: water, ice, boiling water, tap water, "
        "hot water, cold water, ice cubes, ice water. These should be omitted entirely.\n"
        "Return ONLY a valid JSON array with no markdown: "
        '[{"name": "...", "quantity": 0.0, "unit": "..."}]'
    )
    user_prompt = "\n".join(lines)

    try:
        raw = await call_chat_completion(system_prompt, user_prompt, max_tokens=2000, temperature=0.1, route="recipes.parse_ingredients")
        raw = strip_json_code_fences(raw)
        items = json.loads(raw)
        return items
    except Exception:
        logger.error("Ingredient parse error", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to parse ingredients")