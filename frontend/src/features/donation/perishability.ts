import { FOOD_DATABASE } from '../../data/foodDatabase';

/**
 * Heuristic donatability classification for a pantry item.
 *
 * - 'perishable': food banks generally reject these (dairy, meat, frozen,
 *   soft produce like bananas/berries/leafy greens...).
 * - 'non-perishable': shelf-stable, generally accepted by food banks (canned, grains...).
 * - 'unknown': not enough signal to classify confidently — never badged, never
 *   excluded by the "Donatable only" filter.
 *
 * Classification is purely client-side (category + shelfLife lookups against
 * `foodDatabase.ts`, plus a keyword fallback for user-typed items not in that
 * database) — no AI/backend calls. See docs/tasks/21-donatable-items-highlighter.md.
 */
export type PerishabilityClass = 'perishable' | 'non-perishable' | 'unknown';

/** Minimal shape needed to classify — matches (a subset of) PantryItem. */
export interface PerishabilityInput {
  name: string;
  category?: string;
}

// Categories present in foodDatabase.ts / vision.py's VALID_CATEGORIES that are
// unambiguous on their own (every item in the category is reliably perishable
// or reliably shelf-stable).
//
// NOTE: 'produce' is deliberately NOT in this set. It's a mixed bag — root
// vegetables like potatoes/onions/garlic/winter squash keep for weeks and are
// routinely accepted by food banks, while soft produce like bananas/berries/
// leafy greens spoils in days. Bucketing all of 'produce' as unambiguously
// perishable meant potatoes (shelfLife 30) were never given the chance to
// fall through to the shelfLife check below and got misclassified as
// perishable right alongside bananas (shelfLife 7). Let shelfLife arbitrate
// instead.
const PERISHABLE_CATEGORIES = new Set(['dairy', 'meat', 'frozen']);
const NON_PERISHABLE_CATEGORIES = new Set([
  'canned', 'grains', 'pantryItems', 'snacks', 'beverages', 'condiments', 'spices',
]);
// 'produce', 'breakfast', 'bakery', 'other', and any unrecognized category
// are ambiguous — items within them range from shelf-stable (potatoes,
// cereal, pancake mix) to highly perishable (bananas, croissants, danishes)
// — fall through to shelfLife/keyword checks.

/** shelfLife (days) at/above which an ambiguous-category item leans non-perishable.
 * 21 days covers hardy produce (potatoes/onions/garlic/winter squash, all
 * shelfLife >= 21 in foodDatabase.ts) while excluding soft produce
 * (bananas/tomatoes/leafy greens/berries, all shelfLife <= 14). */
const SHELF_STABLE_DAYS = 21;
/** shelfLife (days) below which an ambiguous-category item leans perishable. */
const SHORT_SHELF_LIFE_DAYS = 14;

// Keyword fallback for items typed by the user that aren't in foodDatabase.ts.
// Mirrors the ordered, first-match-wins keyword-table style of
// backend/app/routers/donation.py's `_PC_TABLE`/`_LB_TABLE` (checked there, not
// imported — this stays a pure frontend helper per the task spec).
const NON_PERISHABLE_KEYWORDS = [
  'can', 'canned', 'pasta', 'rice', 'cereal', 'bean', 'lentil', 'chickpea',
  'peanut butter', 'nut butter', 'dry', 'dried', 'flour', 'sugar', 'oats',
  'oatmeal', 'honey', 'jam', 'jelly', 'granola', 'cracker', 'chips',
];
const PERISHABLE_KEYWORDS = [
  'milk', 'egg', 'cheese', 'yogurt', 'meat', 'chicken', 'beef', 'pork', 'turkey',
  'fish', 'seafood', 'shrimp', 'salmon', 'fresh', 'frozen', 'produce', 'vegetable',
  'fruit', 'cream', 'butter', 'lettuce', 'spinach',
];

function findFoodEntry(name: string) {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return FOOD_DATABASE.find(entry => {
    const allNames = [
      ...entry.names.en, ...entry.names.es, ...entry.names.fr,
      ...entry.names.de, ...entry.names.zh, ...entry.names.ja,
    ];
    return allNames.some(n => n.toLowerCase() === q);
  });
}

function classifyByKeyword(name: string): PerishabilityClass {
  const lower = name.trim().toLowerCase();
  if (!lower) return 'unknown';
  if (NON_PERISHABLE_KEYWORDS.some(kw => lower.includes(kw))) return 'non-perishable';
  if (PERISHABLE_KEYWORDS.some(kw => lower.includes(kw))) return 'perishable';
  return 'unknown';
}

export function classifyPerishability(item: PerishabilityInput): PerishabilityClass {
  if (item.category) {
    if (PERISHABLE_CATEGORIES.has(item.category)) return 'perishable';
    if (NON_PERISHABLE_CATEGORIES.has(item.category)) return 'non-perishable';
  }

  // Category was missing/ambiguous ('breakfast', 'bakery', 'other', or an
  // unrecognized string) — use shelfLife as a secondary signal when the item
  // is recognized in foodDatabase.ts.
  const entry = findFoodEntry(item.name);
  if (entry) {
    if (entry.shelfLife >= SHELF_STABLE_DAYS) return 'non-perishable';
    if (entry.shelfLife < SHORT_SHELF_LIFE_DAYS) return 'perishable';
  }

  // Not in foodDatabase.ts (or shelfLife itself was ambiguous) — keyword fallback.
  return classifyByKeyword(item.name);
}
