# 06 — Refactor App.tsx Into Feature Modules

**Priority:** 🟠 High
**Effort:** XL (multi-day, do incrementally)
**Status:** NOT STARTED — spec fleshed out 2026-07-11, extraction not yet
started (deliberately sequenced after [task 14](14-frontend-test-coverage.md)
lands, so there's a regression safety net before restructuring the monolith).

`frontend/src/App.tsx` is confirmed 7966 lines, one functional component
(`App`, starts ~line 141) with ~90 flat `useState` calls (144–309) and no
existing feature-module extraction except `<MealPlanCalendar>`. Break it
into feature modules under `frontend/src/features/`, extracting shared
state via context or a light state manager rather than prop-drilling. Do
this incrementally behind the existing error boundaries ([task 02](02-error-boundaries.md))
so a bad extraction fails loud in one section, not the whole app.

## Implementation

### State inventory (by feature area, approx. lines)

- **Auth/global**: `user`, `authLoading` (144–145)
- **Recipes**: `recipeLoading`/`recipeMode`/`recipeSearchQuery`/`recipeServings`/
  `recipeDifficulty`/`recipeSubTab`/`showFilters`/`ingredientTags`/`recipes`/
  `dietaryFilter`/`selectedRecipe`/`showDetailedView`/`showSubstitution`/
  `selectedIngredient` (scattered 146–235)
- **Pantry**: `pantry`, add/edit modals, smart-search cluster (185–261, 308–309)
- **Scanning** (camera/barcode/expiry/receipt): `scanMode`, `barcodeScanning`,
  `expiryScanning`, `receiptScanning`, detection/review state (211–253)
- **Shopping**: `shoppingList`, add modal, sort, export, price comparison
  (229–307, 281)
- **Donation**: impact/history/modal/food-bank/drop-off/location state
  (234–262)
- **Favorites**: `favorites`, `translatedFavoriteNames`
- **Calorie tracker**: `showCalorieTracker`, goal/today/reset state (180, 254–258)
- **Profile/settings**: settings/survey/profile/custom-labels/share state
- **Onboarding**: mission popup/tour state
- **UI-only/cross-cutting**: `currentTab`, `isMobile`, `drawerOpen`,
  `errorMsg`, toast hook (286)
- **Meal planning**: already extracted into `<MealPlanCalendar>`
  (`components/MealPlanCalendar`, rendered at line 3763)

**Cross-cutting state** (needs context, not prop-drilling): `currentTab`
(drives all section visibility), `pantry` (read by recipes/donation/scanners),
`userProfile`/`savedProfilePrefs` (read by recipes + settings), toast/`errorMsg`
(used everywhere), `isMobile`/`drawerOpen` (global chrome), `userLocation`/
`locationPermission` (donate tab, set from a top-level effect at 264).

### Section boundaries (handlers + JSX)

- **Recipes**: handlers 964–1106 + cross-cutting `addPantryToIngredients`/
  `addMissingToShopping` (1206–1380). JSX 3103–3458; detail modal is
  physically separate, ~6255–6387.
- **Pantry**: handlers 1381–1477 + scan-to-pantry glue 1477–1529. JSX 3814–4582.
- **Scanning**: handlers 1529–2611 (~1100 lines — the single largest
  contiguous handler block: camera 1529–1884, barcode 1884–2154, expiry
  2154–2348, image upload 2348–2470, receipt 2470–2611). No dedicated tab —
  it's a `scanMode` sub-state rendered inside the pantry section, so it's
  entangled with pantry rather than boundaried separately.
- **Shopping**: JSX 4729–5076; `fetchPriceComparison` handler at 2648.
- **Favorites**: JSX 5076–5142 — small, self-contained.
- **Donation**: handlers 2611–2888, JSX 5142–5889 (largest tab JSX block).
- **Meal planning**: already extracted, JSX just 3760–3814.
- **Modals** (mobile FAB 5889–5896, then 5896–7965): all `show*`-boolean
  modals are appended after every tab's JSX rather than co-located with
  their owning section — this is the most tangled part of the file.

### Extraction order (recommended)

1. **Favorites** — tiny, minimal cross-cutting reads. Proves the pattern
   (context provider for shared state + per-section `ErrorBoundary`).
2. **MealPlanCalendar** — already 90% extracted; just finish wiring.
3. **Donation** — contiguous handlers/JSX despite size; touches `pantry`
   (read-only) and `userLocation`, both passable as props.
4. **Recipes** — defer until pattern is proven; `addPantryToIngredients`/
   `addMissingToShopping` cross into pantry/shopping state, and its detail
   modal is ~3000 lines away from its list JSX.
5. **Scanning + Pantry** — do these together, last. Most entangled: scan
   state lives inside the pantry area and scan handlers write pantry state
   directly, so they can't be cleanly separated from each other.

### Error boundaries

Only **one** `<ErrorBoundary context="root" variant="root">` exists today,
wrapping `<App />` in `frontend/src/main.tsx:29`
(`frontend/src/components/ErrorBoundary.tsx`). No per-section boundaries
exist yet — "fails loud in one section" requires adding an
`<ErrorBoundary context="...">` at each extraction point (the component
already supports a `context` prop, so this is low-effort per extraction,
not a redesign).

### Test overlap

Only `frontend/src/App.test.tsx` (smoke test — renders `<App />`, asserts
no crash) and `ErrorBoundary.test.tsx` exist as of this writing (pre-task-14).
No feature-specific tests exist, so extraction order isn't test-constrained
yet — but `App.test.tsx` will need re-verifying after each extraction since
it renders the whole tree. [Task 14](14-frontend-test-coverage.md) adds
component-level coverage that should land **before** extraction starts, to
have a real regression net.

## Verification (per extraction)

- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` green, including `App.test.tsx`'s smoke test
- [ ] Extracted module wrapped in its own `<ErrorBoundary context="...">`
- [ ] Manual pass of the extracted feature's golden path in the browser
- [ ] No behavior change — this is a structural refactor only
