# backend/app/services/ingredient_parsing.py
"""Shared helpers for cleaning ingredient-line input and AI JSON responses.

Extracted from duplicated inline logic that previously lived separately in
routers/pantry.py (match_ingredients), routers/recipes.py (parse_ingredients),
and routers/shopping.py (ai_price_comparison). Pure refactor — behavior is
unchanged; each call site's own system-prompt wording (e.g. the water/ice
skip instructions) is left as-is since it differs subtly between pantry.py
and recipes.py (see module docstring notes in those routers / the PR that
introduced this file for details).
"""
from typing import List


def clean_ingredient_lines(lines: List[str]) -> List[str]:
    """Strip whitespace from each line and drop any that end up empty.

    Mirrors the identical inline logic previously duplicated in
    pantry.match_ingredients and recipes.parse_ingredients:
        [l.strip() for l in lines if l.strip()]
    """
    return [line.strip() for line in lines if line.strip()]


def strip_json_code_fences(raw: str) -> str:
    """Remove ```json / ``` markdown code-fence markers an LLM sometimes wraps
    its JSON response in, and trim surrounding whitespace.

    Mirrors the identical inline logic previously duplicated in
    pantry.match_ingredients, recipes.parse_ingredients, and
    shopping.ai_price_comparison:
        raw.replace("```json", "").replace("```", "").strip()
    """
    return raw.replace("```json", "").replace("```", "").strip()
