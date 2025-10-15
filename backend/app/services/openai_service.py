import openai
import json
import os
import re
from typing import List, Dict

openai.api_key = os.getenv("OPENAI_API_KEY")

def parse_recipes_from_text(text: str, expect_n: int = 3) -> List[Dict[str, str]]:
    text = text.strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return [{"name": r.get("name", "Recipe"), "instructions": r.get("instructions", "")} for r in parsed][:expect_n]
    except Exception:
        pass

    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    results = []
    for i, block in enumerate(blocks):
        lines = block.splitlines()
        if lines:
            name = lines[0].strip()
            instr = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""
            results.append({"name": name, "instructions": instr})
    return results[:expect_n] or [{"name": "Recipe", "instructions": text}]

def generate_recipes(ingredients: List[str], n: int = 3) -> List[Dict[str, str]]:
    if not ingredients:
        return [{"name": "No ingredients", "instructions": "Please provide at least one ingredient."}]
    
    prompt = (
        f"Ingredients: {', '.join(ingredients)}.\n"
        f"Generate {n} recipes in JSON: "
        '[{"name":"...","instructions":"..."}]'
    )
    try:
        resp = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.7,
        )
        text = resp.choices[0].message.content
        return parse_recipes_from_text(text, expect_n=n)
    except Exception as e:
        print("OpenAI error:", e)
        return [{"name": "Error", "instructions": "Failed to generate recipes."}]
