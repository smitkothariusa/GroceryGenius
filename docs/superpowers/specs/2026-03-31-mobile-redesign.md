# GroceryGenius Mobile Redesign

**Date:** 2026-03-31
**Approach:** CSS-only mobile overhaul (new `mobile-responsive.css` + minimal React state)
**Scope:** Mobile breakpoint only (`max-width: 768px`). Desktop unchanged.

---

## Goals

- Replace the broken horizontal-scroll tab bar with a thumb-friendly slide-out drawer
- Give the header a proper mobile layout (dynamic page title + calorie pill)
- Make list items scannable and touch-friendly (swipe-to-delete row pattern)
- Convert modals to bottom sheets, add a FAB for adding items
- Fix recipe section layout on small screens

---

## 1. Navigation — Slide-out Drawer

**What changes:**
- The existing `<nav>` tab bar is hidden via `display: none` at `max-width: 768px`
- A hamburger button (☰) is added to the header JSX, visible only on mobile
- A new `<div id="mobile-drawer">` is added just inside the root `<div>` in App.tsx
- A React state variable `drawerOpen: boolean` controls an `open` class on the drawer

**Drawer structure:**
```
[App logo + name]
─────────────────
📦 Pantry         (3)
🍳 Recipes
📅 Meal Plan
🛒 Shopping       (2)
❤️ Donate         (1)
⭐ Favorites      (5)
─────────────────
[Language Switcher]
[Sign Out]
```

**CSS mechanics:**
- Drawer: `position: fixed; top: 0; left: 0; height: 100vh; width: 280px; transform: translateX(-100%); transition: transform 0.28s ease; z-index: 200`
- Open state: `transform: translateX(0)`
- Backdrop: `position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 199` — clicking it sets `drawerOpen = false`
- Clicking any drawer tab sets `currentTab` and `drawerOpen = false`

**What moves into the drawer:**
- Language Switcher
- Sign Out button
- Demo button (currently hidden on mobile header, added to drawer)

---

## 2. Header — Dynamic Page Title

**What changes (CSS overrides at mobile breakpoint):**

Current header layout (desktop): `[👨‍🍳 GroceryGenius] ... [calorie] [demo] [lang] [sign out]`

Mobile header layout:
```
[👨‍🍳 GroceryGenius (small, muted)]    [📊 1800 cal]  [☰]
[📦 Pantry  (large, bold, current tab)]
```

**Implementation:**
- The `<h1>` remains but gains a CSS class `mobile-page-title` which styles it as the large tab name
- A new `<span class="mobile-app-label">👨‍🍳 GroceryGenius</span>` sits above it (hidden on desktop via `display: none`)
- The existing calorie button stays in the header, repositioned via flexbox at mobile
- Header becomes `flex-wrap: wrap` on mobile with two rows
- The `isMobile ? t('app.shortName') : t('app.name')` ternary in the h1 is kept as-is; CSS handles the visual treatment

---

## 3. List Items — Swipe-to-Delete Rows

Applies to: Pantry list, Shopping list, Favorites list.

**Row structure:**
```
[emoji icon]  [Name]           [qty · unit · expiry]   [🗑 delete]
              [category badge]
```

**CSS changes:**
- Existing card `<div>` elements get `display: flex; align-items: center; padding: 0.75rem 1rem; gap: 0.75rem` on mobile
- The edit/delete button cluster is replaced at mobile: edit is triggered by tapping the row body; only delete remains as a visible icon button on the right
- Expiry-soon items: orange left border (`border-left: 3px solid #f97316`) replaces verbose expiry text
- Shopping list checkboxes: moved to far left, 24×24px minimum touch target
- Category section headers become compact sticky labels (`font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.5rem 1rem; background: #f8fafc; position: sticky; top: 128px`)

---

## 4. Floating Action Button (FAB)

**What:** A fixed green `+` circle button that opens the "Add Item" modal for the current tab.

**CSS:**
```css
.mobile-fab {
  display: none;
}
@media (max-width: 768px) {
  .mobile-fab {
    display: flex;
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #10b981;
    color: white;
    font-size: 1.75rem;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(16,185,129,0.4);
    z-index: 150;
    border: none;
    cursor: pointer;
  }
}
```

**Behavior:** Calls the same handler as the existing "Add to Pantry" / "Add to Shopping List" button for the active tab. The existing add buttons are hidden on mobile (`display: none`).

---

## 5. Modals — Bottom Sheets

All modals (add pantry item, add shopping item, scan menu, donation modal) become bottom sheets on mobile.

**CSS override:**
```css
@media (max-width: 768px) {
  .modal-content {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    transform: none !important;
    border-radius: 20px 20px 0 0 !important;
    max-height: 85vh;
    overflow-y: auto;
    width: 100% !important;
    max-width: 100% !important;
  }
}
```

The modals currently use inline styles. We'll add a `modal-content` className to the modal wrapper divs in App.tsx (currently they have `style={{}}` only). This is the only JSX change needed for modals.

---

## 6. Recipe Section

**Changes:**
- Ingredient tag input and recipe search inputs: `width: 100%; box-sizing: border-box` (already close, just needs enforcement)
- Dietary filter `<select>` + servings `<input>` + camera button: stack vertically (`flex-direction: column`) instead of `flex-wrap`
- Recipe cards: single column, full width (the `RecipeList` grid uses CSS grid — override to `grid-template-columns: 1fr` at mobile)
- Recipe detail modal: becomes a bottom sheet (covered by rule 5 above)

---

## 7. Misc Fixes

- **Expiry banner:** Truncate item names list with `text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: calc(100% - 2rem)` so it stays one line
- **Calorie tracker panel:** `width: 100%; box-sizing: border-box; border-radius: 0` when it expands on mobile (currently overflows horizontally)
- **Demo button:** Removed from mobile header; added to drawer bottom section

---

## 8. Meal Plan — Touch Drag-and-Drop

The component already has `draggedRecipe` state and desktop HTML5 drag/drop. On mobile it currently falls back to tap-to-select + tap-to-place. We replace this with real touch dragging.

**How it works:**

1. `onTouchStart` on a recipe card: record the recipe, create a drag ghost element (a clone of the card, `position: fixed`, `pointer-events: none`, `opacity: 0.85`, `z-index: 9999`), set `draggedRecipe`
2. `onTouchMove` (on `document`, via `useEffect` listener): move the ghost to `touch.clientX / clientY` with a small offset so the finger doesn't cover it. Call `document.elementFromPoint(x, y)` and highlight any calendar slot the ghost is hovering over (add `drag-over` CSS class)
3. `onTouchEnd`: call `document.elementFromPoint(x, y)`, walk up the DOM to find the nearest element with `data-date` and `data-meal-type` attributes (added to each calendar slot div). If found, call the existing `handleDrop(dateStr, mealType)` logic. Remove the ghost, clear highlights, clear `draggedRecipe`.

**Calendar slot markup change:**
Each slot div gets `data-date={dateStr}` and `data-meal-type={mealType}` attributes so `elementFromPoint` can identify them.

**Ghost element styles:**
```css
.drag-ghost {
  position: fixed;
  pointer-events: none;
  opacity: 0.85;
  z-index: 9999;
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  border-radius: 8px;
  background: white;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

**Drag-over highlight:**
```css
.calendar-slot.drag-over {
  background: #d1fae5 !important;
  border: 2px dashed #10b981 !important;
}
```

**Desktop unaffected:** Touch handlers only attach when `isMobile` is true; the existing `draggable` / `onDragStart` / `onDrop` props stay as-is for desktop.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/mobile-responsive.css` | **New file** — all mobile CSS overrides + drag ghost + drag-over styles |
| `frontend/src/main.tsx` | Import new CSS file |
| `frontend/src/App.tsx` | Add `drawerOpen` state, `DrawerNav` JSX, `mobile-fab` button, `modal-content` classNames, hamburger button in header |
| `frontend/src/components/MealPlanCalendar.tsx` | Add touch drag handlers, ghost element logic, `data-date`/`data-meal-type` attrs on slot divs |

**No new dependencies. No changes to desktop layout.**

---

## Out of Scope

- Swipe gesture detection for list delete — the delete button is visible, not swipe-triggered; true swipe-to-delete is a future enhancement
- PWA install prompt styling
