from pydantic import BaseModel
from typing import List

class IngredientList(BaseModel):
    ingredients: List[str]

class Recipe(BaseModel):
    name: str
    instructions: str
