# backend/app/routers/donation.py
from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

router = APIRouter()

# One "meal" = 600 calories (standard food-bank meal equivalent)
CALORIES_PER_MEAL = 600

# ---------------------------------------------------------------------------
# Calorie lookup tables
# All meal counts derive from: total_calories / CALORIES_PER_MEAL
# Unknown foods fall back to _CAL_PER_LB_FALLBACK cal/lb
# ---------------------------------------------------------------------------

# unit == "pc": (keywords, cal_per_piece, lbs_per_piece)
# Keywords are checked in order; first match wins.
_PC_TABLE: list[tuple[list[str], float, float]] = [
    # dairy
    (["milk"],                            1192,  4.30),   # half-gallon carton (8 cups × 149 cal)
    (["yogurt"],                           150,  0.375),  # 6 oz container
    (["cheese"],                           900,  0.50),   # 8 oz block
    # eggs
    (["egg"],                               70,  0.125),  # 1 large egg
    # proteins
    (["turkey breast"],                    280,  0.50),   # raw 8 oz breast portion
    (["turkey"],                           280,  0.50),   # default to breast-sized piece
    (["chicken breast", "chicken"],        250,  0.50),   # raw 8 oz breast
    (["ground beef", "ground turkey",
      "ground pork", "ground"],            640,  0.50),   # 8 oz of ground meat
    (["tuna", "canned tuna",
      "canned chicken"],                   150,  0.31),   # 5 oz can
    # produce
    (["banana"],                           105,  0.25),   # medium banana
    (["apple", "pear"],                     95,  0.375),  # medium fruit (~6 oz)
    (["orange", "fruit"],                   85,  0.375),
    (["potato", "sweet potato", "yam"],    165,  0.50),   # medium potato (~8 oz)
    # bread / bakery
    (["bread", "loaf"],                   1200,  1.25),   # 20 oz loaf
    # generic can (fallback for "1 pc can")
    (["can"],                              300,  0.94),
    # catch-all for unknown pc items: assume ~8 oz, 400 cal/lb
    ([],                                   200,  0.50),
]

# unit in lbs / oz / g: (keywords, cal_per_lb)
_LB_TABLE: list[tuple[list[str], float]] = [
    (["peanut butter", "nut butter"],     2640),
    (["cheese"],                          1800),
    (["cereal", "granola"],               1700),
    (["rice", "pasta", "grain", "flour",
      "oat", "oats", "quinoa"],           1640),
    (["bread", "loaf"],                   1200),
    (["ground beef", "ground turkey",
      "ground pork", "ground"],            900),
    (["beef", "pork", "lamb", "steak"],    900),
    (["turkey", "chicken"],                560),
    (["fish", "salmon", "tilapia",
      "shrimp", "cod", "seafood"],         500),
    (["egg"],                              560),
    (["bean", "lentil", "legume"],        1550),  # dry; canned beans handled via 'can' unit
    (["tofu"],                             400),
    (["potato", "yam", "sweet potato"],    350),
    (["banana"],                           400),
    (["apple", "pear", "orange", "fruit"], 240),
    (["carrot", "vegetable", "broccoli",
      "spinach", "lettuce", "cabbage",
      "tomato", "pepper", "zucchini"],     200),
    (["milk"],                             280),
    (["yogurt"],                           270),
    (["sauce", "tomato sauce"],            400),
    (["soup"],                             120),
]
_CAL_PER_LB_FALLBACK = 400   # reasonable average for an unlabeled grocery item

# unit == "can": (keywords, cal_per_can)
# A standard 15 oz can; 10 oz soup cans handled by "soup" keyword.
_CAN_TABLE: list[tuple[list[str], float]] = [
    (["soup"],             200),   # 10 oz soup can
    (["tuna", "chicken"],  150),   # 5 oz protein can
    (["bean", "lentil"],   350),   # 15 oz beans (cooked)
    (["vegetable", "corn",
      "pea", "green bean"],250),   # 15 oz veg
    (["tomato", "sauce"],  150),   # 15 oz tomato/sauce
    ([],                   300),   # generic 15 oz can
]


class DonationItem(BaseModel):
    name: str
    quantity: float
    unit: str


class DonationImpactRequest(BaseModel):
    items: List[DonationItem]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _match(name_lower: str, table: list) -> int:
    """Return index of first matching rule. Catch-all row (empty keywords) always last."""
    for i, row in enumerate(table):
        keywords = row[0]
        if not keywords:
            return i
        if any(kw in name_lower for kw in keywords):
            return i
    return len(table) - 1  # fallback to last row if no catch-all


def _cal_per_lb(name_lower: str) -> float:
    idx = _match(name_lower, _LB_TABLE)
    # _LB_TABLE has no catch-all row, so fall back explicitly
    if idx == len(_LB_TABLE) - 1 and not any(
        kw in name_lower for kw in _LB_TABLE[-1][0]
    ):
        return _CAL_PER_LB_FALLBACK
    return _LB_TABLE[idx][1]


def _calculate_item(item: DonationItem) -> tuple[float, float, str]:
    """Return (pounds, calories, description_for_reasoning)."""
    name = item.name.lower()
    qty = item.quantity
    unit = item.unit.lower().strip()

    if unit == "pc":
        idx = _match(name, _PC_TABLE)
        _, cal_per_pc, lbs_per_pc = _PC_TABLE[idx]
        pounds = qty * lbs_per_pc
        calories = qty * cal_per_pc
        desc = f"{qty} piece(s) × {cal_per_pc} cal"

    elif unit == "lbs":
        pounds = qty
        cpl = _cal_per_lb(name)
        calories = qty * cpl
        desc = f"{qty} lbs × {cpl} cal/lb"

    elif unit == "oz":
        pounds = qty / 16
        cpl = _cal_per_lb(name)
        calories = pounds * cpl
        desc = f"{qty} oz × {cpl} cal/lb"

    elif unit == "g":
        pounds = qty / 453.592
        cpl = _cal_per_lb(name)
        calories = pounds * cpl
        desc = f"{qty} g × {cpl} cal/lb"

    elif unit == "can":
        pounds = qty * 0.9375   # ~15 oz can
        idx = _match(name, _CAN_TABLE)
        cal_per_can = _CAN_TABLE[idx][1]
        calories = qty * cal_per_can
        desc = f"{qty} can(s) × {cal_per_can} cal/can"

    elif unit in ("gallon", "gal"):
        pounds = qty * 8.6
        # 1 gallon whole milk ≈ 2400 cal; use cal/lb for other liquids
        if "milk" in name:
            calories = qty * 2400
        else:
            cpl = _cal_per_lb(name)
            calories = pounds * cpl
        desc = f"{qty} gal"

    elif unit in ("cup", "cups"):
        pounds = qty * 0.5
        cpl = _cal_per_lb(name)
        calories = pounds * cpl
        desc = f"{qty} cup(s) × {cpl} cal/lb"

    else:
        # Unknown unit — treat as rough weight equivalent
        pounds = qty * 0.5
        cpl = _CAL_PER_LB_FALLBACK
        calories = pounds * cpl
        desc = f"{qty} {unit} (unknown unit, estimated)"

    return pounds, calories, desc


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/calculate-impact")
async def calculate_donation_impact(payload: DonationImpactRequest):
    """
    Calculate meal estimates using a calorie-based lookup table.
    meals = total_calories / CALORIES_PER_MEAL (600 cal).
    Unknown foods fall back to 400 cal/lb so all items produce a reasonable result.
    """
    total_meals = 0.0
    total_pounds = 0.0
    breakdown = []

    for item in payload.items:
        pounds, calories, desc = _calculate_item(item)
        meals = calories / CALORIES_PER_MEAL
        total_pounds += pounds
        total_meals += meals
        breakdown.append({
            "name": item.name,
            "meals": round(meals, 1),
            "pounds": round(pounds, 2),
            "reasoning": f"{desc} = {round(calories)} cal ÷ {CALORIES_PER_MEAL} cal/meal = {round(meals, 1)} meals",
        })

    return {
        "total_meals": round(total_meals, 1),
        "total_pounds": round(total_pounds, 2),
        "co2_saved_lbs": round(total_pounds * 3.8, 2),
        "items_breakdown": breakdown,
    }
