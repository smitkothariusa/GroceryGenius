# 21 — Donatable-Items Highlighter (Perishable vs. Non-Perishable)

**Priority:** 🟢 Feature (backlog: [feature-ideas.md #2](../feature-ideas.md#2-donatable-items-highlighter-perishable-vs-non-perishable))
**Effort:** M
**Status:** IN PROGRESS

## Problem

Most food banks reject perishables (dairy, produce, meat), but
`DonationModal` lists every pantry item with no signal about which are
actually donatable. Users end up guessing or a food bank turns items away.

## Resolved product decisions (2026-07-12, confirmed with user)

1. **Classification: heuristic, not AI.** Client-side derivation using
   `foodDatabase.ts`'s existing `category` (dairy/produce/meat/frozen →
   perishable; canned/dry-goods/grains/pantry-staples → non-perishable) and
   `shelfLife` (days) as a tiebreaker/threshold, plus a keyword fallback
   table (mirroring `donation.py`'s `_PC_TABLE`/`_LB_TABLE` pattern) for
   items a user typed that aren't in `foodDatabase.ts`. No new backend
   route, no OpenAI cost.
2. **De-emphasize, don't hard-hide perishables.** `DonationModal` keeps
   listing every pantry item. Perishables get a "Keep at home" /
   "Perishable" badge; non-perishables get a "Good to donate" badge. Add a
   filter toggle ("Donatable only") that collapses perishables from view
   but never removes the ability to select one — some banks do take
   refrigerated items, and a user may be donating to a neighbor/shelter
   directly rather than a food bank.
3. **Skip per-food-bank `acceptedItems` narrowing for v1.** `acceptedItems`
   on `FoodBank`/drop-off types is free-text (`'canned goods'`,
   `'non-perishables'`, `'baby food'`, `'hygiene products'`) — not a
   structured taxonomy. Fuzzy-matching it against pantry categories is a
   separate, riskier scope add (false negatives when a bank's string
   doesn't literally contain a matching keyword). Ship the general
   donatable/perishable badge + filter first; per-bank narrowing can be a
   follow-up idea if requested.

## Implementation steps

1. Add a `classifyPerishability(item)` helper (new file, e.g.
   `frontend/src/features/donation/perishability.ts`, or alongside
   `foodDatabase.ts` if that's a more natural home — subagent's call):
   - Look up the item's `category` via `foodDatabase.ts` (match by name,
     same lookup pattern already used elsewhere for `shelfLife`/emoji).
   - `category` in `{dairy, produce, meat, seafood, frozen}` (confirm exact
     category strings present in `foodDatabase.ts` before hardcoding the
     list) → perishable.
   - `category` in `{grains, canned, pantry, dry goods, condiments,
     baking}` (confirm actual strings) → non-perishable.
   - If no `foodDatabase.ts` match (user-typed custom item), fall back to a
     keyword table on `item.name` (canned/pasta/rice/cereal/beans/peanut
     butter/dry → non-perishable; milk/egg/cheese/meat/fresh/frozen →
     perishable), catch-all → treat as "unknown" (don't badge either way,
     don't count in the donatable filter's exclusion).
   - `shelfLife` as a secondary signal only where category is ambiguous:
     e.g. `shelfLife >= 60` days leans non-perishable even if category
     lookup is inconclusive.
2. `DonationModal.tsx`: add a badge next to each item's quantity/unit line
   (mirrors the existing `isExpiring` badge styling/placement) —
   "✅ Good to donate" for non-perishable, "🏠 Keep at home" for perishable,
   nothing for unknown.
3. Add a filter toggle above the item list ("Donatable only" / show-all)
   using existing modal styling conventions (see the existing
   button/toggle styles already in the file). Filter collapses (not
   deletes) perishable rows from the visible list; selection state
   (`itemsToDonate`) is untouched by the toggle.
4. i18n: add keys for "Good to donate", "Keep at home", "Donatable only"
   (or similar — subagent should follow existing `donate.*` key naming
   convention in `en/translation.json`) across all 6 locales
   (en/es/fr/de/zh/ja). No hardcoded strings.
5. No new tables, no new backend routes, no `authFetch` changes needed —
   this is pure frontend derivation over data already in `PantryItem`.

## Verification checklist

- `npx tsc --noEmit` passes.
- Manually exercise: open the Donate tab / Donate button with a pantry
  containing at least one clearly perishable item (milk, eggs) and one
  clearly non-perishable item (canned beans, pasta) — confirm correct
  badges appear.
- Toggle "Donatable only" and confirm perishables collapse from the list
  but selection logic / impact calculation still works for any that were
  already selected before toggling.
- Confirm all 6 locale files have the new keys and no missing-key console
  warnings appear when switching languages in dev.
- Mobile viewport: badge + toggle don't overflow/wrap awkwardly at narrow
  widths (this modal already scrolls internally — confirm the toggle stays
  visible/usable, not just the item list).
