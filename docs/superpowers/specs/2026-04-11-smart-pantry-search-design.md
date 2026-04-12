# Smart Pantry Search — Design Spec
**Date:** 2026-04-11  
**Status:** Approved

---

## Overview

Replace the manual name-text-input in the pantry "Add Item" flow with a smart search bar that auto-suggests foods, pre-fills unit, suggests an expiry date, and attaches a food-specific emoji to every item added via search.

---

## Goals

- Reduce manual input friction when adding pantry items
- Auto-populate unit, smart expiry date, and emoji for known foods
- Support all 6 languages (en, es, fr, de, zh, ja) including localized search terms
- Work seamlessly on mobile and desktop

---

## Non-Goals

- No barcode/AI scanner changes
- No backend API calls for search (static client-side only)
- No fuzzy matching library — simple substring ranking is sufficient
- No new React component files unless App.tsx grow untenable (extracted later if needed)

---

## Data File

**Path:** `frontend/src/data/foodDatabase.ts`

**Size:** ~500–800 entries

**Entry shape:**

```ts
export interface FoodEntry {
  id: string;           // unique slug, e.g. "milk"
  emoji: string;        // food-specific emoji, e.g. "🥛"
  defaultUnit: string;  // unit key matching pantry.units translations, e.g. "carton"
  shelfLife: number;    // days to add to today for smart expiry suggestion
  category: string;     // maps to existing pantry category keys
  names: {
    en: string[];       // first element is canonical display name
    es: string[];
    fr: string[];
    de: string[];
    zh: string[];
    ja: string[];
  };
}
```

**Example entries:**

```ts
{
  id: "milk",
  emoji: "🥛",
  defaultUnit: "carton",
  shelfLife: 7,
  category: "dairy",
  names: {
    en: ["Milk", "whole milk", "skim milk", "2% milk"],
    es: ["Leche", "leche entera", "leche desnatada"],
    fr: ["Lait", "lait entier", "lait écrémé"],
    de: ["Milch", "Vollmilch", "Magermilch"],
    zh: ["牛奶", "全脂牛奶", "脱脂牛奶"],
    ja: ["牛乳", "全脂牛乳", "低脂肪乳"]
  }
},
{
  id: "eggs",
  emoji: "🥚",
  defaultUnit: "pieces",
  shelfLife: 30,
  category: "dairy",
  names: {
    en: ["Eggs", "egg", "chicken eggs"],
    es: ["Huevos", "huevo"],
    fr: ["Œufs", "oeuf"],
    de: ["Eier", "Ei"],
    zh: ["鸡蛋", "蛋"],
    ja: ["卵", "たまご"]
  }
},
{
  id: "canned_tomatoes",
  emoji: "🥫",
  defaultUnit: "cans",
  shelfLife: 365,
  category: "canned",
  names: {
    en: ["Canned Tomatoes", "tomato can", "diced tomatoes"],
    es: ["Tomates en lata", "tomate enlatado"],
    fr: ["Tomates en boîte", "tomates concassées"],
    de: ["Dosentomaten", "gehackte Tomaten"],
    zh: ["番茄罐头", "罐装番茄"],
    ja: ["缶詰トマト", "ホールトマト"]
  }
}
```

**Shelf life reference values (non-exhaustive):**

| Category | shelfLife |
|---|---|
| Fresh milk, yogurt | 7 days |
| Fresh meat, fish | 3–5 days |
| Fresh produce (leafy) | 5–7 days |
| Fresh produce (hard) | 14–21 days |
| Eggs | 30 days |
| Cheese (hard) | 30 days |
| Bread | 7 days |
| Frozen foods | 180 days |
| Canned goods | 365 days |
| Dry pantry staples (rice, pasta) | 730 days |
| Condiments/sauces | 180 days |

---

## Search Algorithm

- Triggered on every keystroke (no debounce needed — client-side)
- Query matches against `names[currentLanguage]`, falling back to `names.en`
- Ranking: starts-with match ranked above contains match
- Show up to **8 suggestions** in the dropdown
- Minimum **2 characters** before suggestions appear
- If query matches nothing in the database, no dropdown shows — user proceeds with manual entry (no emoji, no auto-fill)

---

## UI Flow

### Smart Search Bar
- Replaces the current name `<input>` in the add-pantry form
- Placeholder text: `t('pantry.smartSearch')` (e.g. "Search foods…")
- Dropdown appears below input, full-width, with up to 8 results
- Each result row: `[emoji] [display name in current language]`
- Tap/click a result → dropdown closes → compact card confirm snaps in

### Compact Card Confirm (after selection)
```
┌─────────────────────────────────────────┐
│ 🥛 Milk                           [dairy]│
├─────────────────────────────────────────┤
│ Quantity: [          ]  Unit: [carton ▾] │
│                                         │
│ ✨ Smart expiry: Apr 18, 2026 (+7 days) │
│ Or enter date: [date picker            ]│
│                                         │
│        [    Add to Pantry    ]          │
└─────────────────────────────────────────┘
```

- **Quantity:** blank, required. "Add to Pantry" button disabled until filled.
- **Unit:** pre-filled with `defaultUnit` (translated). Shown as a `<select>` dropdown containing all existing unit options — user can change it.
- **Smart expiry chip:** displays suggested date = today + `shelfLife` days. Tapping/clicking the chip copies the suggested date into the date field — the field remains fully editable after being filled.
- **Date field:** always visible. User can type or pick their own date. Smart expiry chip is a suggestion only — never forced.
- **Add to Pantry button:** submits with emoji stored on the item.

### Manual fallback (food not in database)
- No dropdown appears
- Form stays as the normal text input
- No emoji, no unit auto-fill, no smart expiry — identical to current behavior

### Mobile
- Dropdown is full-width, min 44px tap targets per row
- Compact card uses single-column stacked layout
- Unit selector is a native `<select>` for best mobile UX

### Desktop
- Dropdown appears as a popover below the input with slight box-shadow
- Compact card uses a 2-column grid for quantity + unit side by side

---

## Database Change

**Migration:** Add `emoji` column to `pantry_items` table in Supabase.

```sql
ALTER TABLE pantry_items ADD COLUMN emoji text;
```

Applied via Supabase MCP during implementation.

---

## Type Changes

**`frontend/src/lib/supabase.ts` — `PantryItem` interface:**
```ts
export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date?: string;
  added_date: string;
  updated_at: string;
  emoji?: string;       // NEW
}
```

**`frontend/src/App.tsx` — local `PantryItem` interface** (mirrors above):
```ts
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  emoji?: string;       // NEW
}
```

---

## i18n — New Translation Keys

Added under `pantry` namespace in all 6 locale files:

| Key | English value |
|---|---|
| `pantry.smartSearch` | `"Search foods…"` |
| `pantry.smartExpiry` | `"Smart expiry"` |
| `pantry.smartExpiryDays` | `"+{{count}} days"` |
| `pantry.changeUnit` | `"Change unit"` |
| `pantry.quantityRequired` | `"Enter a quantity to add"` |

Any `defaultUnit` values not yet present in `pantry.units` translations are added (e.g. `carton`, `bunch`, `bag`, `jar`, `loaf`, `dozen`).

---

## Pantry List Rendering

- Items with `emoji` set: render `item.emoji` in place of 📦
- Items without `emoji` (manually added, legacy items): render 📦 as before
- No visual change to the rest of the pantry card

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/data/foodDatabase.ts` | **NEW** — 500–800 food entries |
| `frontend/src/App.tsx` | Smart search UI, compact card confirm, emoji rendering, smart expiry logic |
| `frontend/src/lib/supabase.ts` | `emoji?: string` on `PantryItem` |
| `frontend/src/locales/en/translation.json` | New pantry keys + missing unit keys |
| `frontend/src/locales/es/translation.json` | Same |
| `frontend/src/locales/fr/translation.json` | Same |
| `frontend/src/locales/de/translation.json` | Same |
| `frontend/src/locales/zh/translation.json` | Same |
| `frontend/src/locales/ja/translation.json` | Same |
| Supabase `pantry_items` | `ALTER TABLE … ADD COLUMN emoji text` |
