# Onboarding Tour — Design Spec

**Date:** 2026-04-08  
**Status:** Approved  
**Scope:** Interactive spotlight-based walkthrough for new users, triggered after the mission statement popup closes.

---

## Overview

A 20-step onboarding tour that walks new users through every major feature of GroceryGenius. It uses a spotlight cutout overlay (dark backdrop with a glowing border around the target element) and a positioned tooltip. Auto-navigates between tabs. Skippable at any step. Fully multilingual (6 languages) and mobile-friendly.

---

## Trigger & Persistence

- **Trigger:** The mission popup's "Let's Get Started" button sets `showTour: true` in App state immediately after `setShowMissionPopup(false)`.
- **Skip:** Available on every step. Sets `localStorage.hasSeenTour = 'true'` and closes the tour.
- **Completion:** After step 20, a "You're all set! 🎉" toast appears. Same localStorage flag set.
- **Re-show guard:** On app load, if `localStorage.hasSeenTour === 'true'`, the tour never fires.

---

## Architecture

### New component: `TourOverlay.tsx`

Self-contained component. Props:

```ts
interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
}
```

### Step definition

```ts
interface TourStep {
  tab: 'pantry' | 'recipes' | 'mealplan' | 'shopping' | 'donate' | 'favorites' | null;
  selector: string;          // data-tour attribute, e.g. '[data-tour="scan-btn"]'
  titleKey: string;          // i18n key
  descKey: string;           // i18n key
  tooltipPosition?: 'above' | 'below' | 'bottom-sheet'; // auto-detected if omitted
}
```

### State in App.tsx

```ts
const [showTour, setShowTour] = useState(false);
const [tourStep, setTourStep] = useState(0);
```

### `data-tour` attributes

Each spotlighted element gets a `data-tour="<id>"` attribute added in JSX. This decouples the tour from brittle class names.

---

## Spotlight Mechanism

1. On each step render, read `document.querySelector(step.selector).getBoundingClientRect()`.
2. Render a `<div>` absolutely positioned over that rect with:
   - `box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.72)` — creates the dark overlay with a transparent hole
   - `border: 2px solid #10b981` + `border-radius` matching the target
   - A subtle glow: `box-shadow` extended with `0 0 0 6px rgba(16,185,129,0.2)`
3. A `<div>` overlay with `pointer-events: none` and `position: fixed; inset: 0` intercepts clicks outside the spotlight.

### Mobile behaviour

On mobile (`isMobile === true`), the tooltip **always docks to the bottom** of the screen as a bottom sheet (rounded top corners, drag-handle visual). On desktop, the tooltip auto-positions below the spotlight if there is room, above if not.

---

## Tour Steps

### 📦 Pantry (3 steps)

| Step | `data-tour` | Title key | Description |
|------|-------------|-----------|-------------|
| 1 | `pantry-add-input` | `tour.pantry.add.title` | Type any ingredient name and tap Add to stock your pantry |
| 2 | `pantry-scan-btn` | `tour.pantry.scan.title` | Scan a barcode with your camera to add items instantly |
| 3 | `pantry-expiry-input` | `tour.pantry.expiry.title` | Add an expiry date when saving an item — we'll flag it automatically as it gets close |

### 🍳 Recipes (3 steps)

| Step | `data-tour` | Title key | Description |
|------|-------------|-----------|-------------|
| 4 | `recipes-ingredient-input` | `tour.recipes.input.title` | Enter what you have — our AI finds recipes that use them |
| 5 | `recipes-use-pantry-btn` | `tour.recipes.pantry.title` | One tap loads your whole pantry as recipe ingredients |
| 6 | `recipes-dietary-filter` | `tour.recipes.dietary.title` | Filter by dietary preferences, synced automatically from your settings |

### 📅 Meal Plan (2 steps)

| Step | `data-tour` | Title key | Description |
|------|-------------|-----------|-------------|
| 7 | `mealplan-calendar` | `tour.mealplan.calendar.title` | Drag recipes onto days to plan your whole week |
| 8 | `mealplan-shopping-btn` | `tour.mealplan.shopping.title` | Missing ingredients are sent straight to your Shopping list |

### 🛒 Shopping (3 steps)

| Step | `data-tour` | Title key | Description |
|------|-------------|-----------|-------------|
| 9 | `shopping-list` | `tour.shopping.list.title` | Auto-generated from your meal plan and pantry gaps |
| 10 | `shopping-item-checkbox` | `tour.shopping.check.title` | Tap an item to mark it as bought |
| 11 | `shopping-add-input` | `tour.shopping.add.title` | Add one-off items here any time |

### ❤️ Donate (2 steps)

| Step | `data-tour` | Title key | Description |
|------|-------------|-----------|-------------|
| 12 | `donate-expiring-list` | `tour.donate.expiring.title` | Food near its expiry date appears here — donate before it goes to waste |
| 13 | `donate-map` | `tour.donate.map.title` | Find nearby food banks and drop-off points using your location |

### ⭐ Favorites (2 steps)

| Step | `data-tour` | Title key | Description |
|------|-------------|-----------|-------------|
| 14 | `favorites-grid` | `tour.favorites.grid.title` | Recipes you've saved live here for quick access |
| 15 | `favorites-heart-btn` | `tour.favorites.heart.title` | Tap the heart on any recipe card to save it here |

### ⚙️ Settings (3 steps)

| Step | `data-tour` | Title key | Description |
|------|-------------|-----------|-------------|
| 16 | `settings-btn` | `tour.settings.open.title` | Open settings to personalise your experience |
| 17 | `settings-dietary` | `tour.settings.dietary.title` | Set your dietary needs — recipes filter automatically everywhere |
| 18 | `settings-calorie-goal` | `tour.settings.calorie.title` | Set your daily calorie target here |

### 📊 Calorie Tracker (2 steps)

| Step | `data-tour` | Title key | Description |
|------|-------------|-----------|-------------|
| 19 | `calorie-tracker-btn` | `tour.calorie.btn.title` | Tap here anytime to open your daily calorie tracker |
| 20 | `calorie-tracker-panel` | `tour.calorie.panel.title` | Log meals and watch your nutrition progress in real time |

---

## i18n

All 40 strings (20 titles + 20 descriptions) added to all 6 locale files:  
`frontend/src/locales/{en,de,es,fr,ja,zh}/translation.json`

Key namespace: `tour.*`

Example (English):
```json
"tour": {
  "pantry": {
    "add": { "title": "Add pantry items", "desc": "Type any ingredient name and tap Add to stock your pantry." },
    "scan": { "title": "Scan items instantly", "desc": "Scan a barcode with your camera to add items instantly." },
    "expiry": { "title": "Expiry tracking", "desc": "Items near their expiry date are flagged automatically so nothing goes to waste." }
  }
}
```

---

## Visual Design

- **Overlay:** `rgba(0,0,0,0.72)` full-screen fixed backdrop
- **Settings steps:** Steps 16–18 require the Settings panel to be open. Step 16 spotlights the settings button; clicking Next calls `setShowSettings(true)` before advancing to step 17. Step 18 closes settings on Next.
- **Calorie Tracker steps:** Step 19 spotlights the header button; clicking Next calls `setShowCalorieTracker(true)` before advancing to step 20.
- **Spotlight border:** `2px solid #10b981` (green, matches app brand)
- **Glow:** `box-shadow: 0 0 0 6px rgba(16,185,129,0.15)`
- **Tooltip card:** white background, `border-radius: 12px`, `box-shadow: 0 6px 24px rgba(0,0,0,0.4)`
- **Progress dots:** filled green for completed, grey for remaining
- **Next button:** green gradient, matches CTA style throughout app
- **Skip button:** subtle grey, always visible

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/TourOverlay.tsx` | New component |
| `frontend/src/App.tsx` | Add `showTour`/`tourStep` state, trigger after mission popup, add `data-tour` attributes to ~20 elements |
| `frontend/src/locales/*/translation.json` | Add `tour.*` keys (×6 languages) |
