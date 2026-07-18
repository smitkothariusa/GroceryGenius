/**
 * calculateHealthGrade must reflect the healthiness of ONE serving, not the
 * scaled total. A user reported (2026-07-18) that raising the serving count
 * dropped the grade, because recipe.nutrition is scaled by servings and the
 * thresholds are per-serving figures.
 */
import { describe, it, expect } from 'vitest';
import { calculateHealthGrade, type Recipe } from './RecipesContext';

/** A recipe whose PER-SERVING nutrition is `perServing`, presented as if the
 *  user scaled it from `originalServings` to `servings` (nutrition scaled by
 *  servings/originalServings, exactly as RecipeSection does). */
function scaledRecipe(
  perServing: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number },
  originalServings: number,
  servings: number,
): Recipe {
  const scale = servings / originalServings;
  return {
    name: 'Test',
    ingredients: '',
    instructions: '',
    servings,
    originalServings,
    nutrition: {
      calories: Math.round(perServing.calories * scale),
      protein: Math.round(perServing.protein * scale),
      carbs: Math.round(perServing.carbs * scale),
      fat: Math.round(perServing.fat * scale),
      fiber: Math.round(perServing.fiber * scale),
      sodium: Math.round(perServing.sodium * scale),
    },
  } as Recipe;
}

const healthyPerServing = { calories: 420, protein: 26, carbs: 45, fat: 12, fiber: 8, sodium: 350 };

describe('calculateHealthGrade — invariant to serving count', () => {
  it('gives the same grade regardless of how many servings the user selects', () => {
    const at2 = calculateHealthGrade(scaledRecipe(healthyPerServing, 2, 2));
    const at4 = calculateHealthGrade(scaledRecipe(healthyPerServing, 2, 4));
    const at8 = calculateHealthGrade(scaledRecipe(healthyPerServing, 2, 8));
    expect(at4).toBe(at2);
    expect(at8).toBe(at2);
  });

  it('a healthy per-serving recipe stays a good (A/B) grade even at 8 servings', () => {
    const grade = calculateHealthGrade(scaledRecipe(healthyPerServing, 2, 8));
    expect(grade[0] === 'A' || grade[0] === 'B').toBe(true);
  });

  it('still penalises a genuinely unhealthy per-serving recipe', () => {
    const junk = { calories: 850, protein: 8, carbs: 90, fat: 40, fiber: 1, sodium: 1400 };
    expect(calculateHealthGrade(scaledRecipe(junk, 2, 2))).toBe('D');
    // …and that stays bad when scaled up, too (not artificially worse/better).
    expect(calculateHealthGrade(scaledRecipe(junk, 2, 6))).toBe('D');
  });

  it('falls back gracefully when serving metadata is missing (grades as-is)', () => {
    const r = { nutrition: healthyPerServing } as Recipe;
    const grade = calculateHealthGrade(r);
    expect(grade[0] === 'A' || grade[0] === 'B').toBe(true);
  });

  it('returns B when there is no nutrition', () => {
    expect(calculateHealthGrade({} as Recipe)).toBe('B');
  });
});
