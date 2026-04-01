# GroceryGenius Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the mobile experience with a slide-out drawer nav, dynamic page-title header, compact swipe-to-delete list rows, bottom-sheet modals, a FAB, and touch drag-and-drop for the meal plan calendar.

**Architecture:** CSS-only where possible — a new `mobile-responsive.css` file with `@media (max-width: 768px)` overrides the existing inline styles. Minimal React changes are limited to adding classNames, `drawerOpen` state, drawer JSX, a FAB button, and touch event handlers in MealPlanCalendar. Desktop is completely unaffected.

**Tech Stack:** React 18, TypeScript, Vite, vanilla CSS (no new dependencies)

> **Note on testing:** The project has no unit test runner configured. Each task includes a manual verification step using `npm run dev` in `frontend/` and Chrome DevTools' device emulation (375px wide, iPhone 12 viewport).

---

## File Map

| File | Role |
|------|------|
| `frontend/src/mobile-responsive.css` | **New** — all mobile CSS: drawer, header, rows, FAB, bottom sheets, recipe fixes, drag ghost |
| `frontend/src/main.tsx` | Import the new CSS file |
| `frontend/src/App.tsx` | Add classNames to header/nav/modals; add `drawerOpen` state + drawer JSX + hamburger button + FAB |
| `frontend/src/components/MealPlanCalendar.tsx` | Add `data-date`/`data-meal-type` attrs to slots; add touch drag handlers + ghost element logic |

---

## Task 1: Create mobile-responsive.css and import it

**Files:**
- Create: `frontend/src/mobile-responsive.css`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create the CSS file with the base reset**

Create `frontend/src/mobile-responsive.css` with this content:

```css
/* ============================================================
   GroceryGenius — Mobile Responsive Overrides
   Applies only at max-width: 768px. Desktop is unchanged.
   ============================================================ */

/* ----------------------------------------------------------
   1. DRAWER NAV — hide the existing top nav bar on mobile
   ---------------------------------------------------------- */
@media (max-width: 768px) {
  nav {
    display: none !important;
  }
}

/* ----------------------------------------------------------
   2. DRAWER — slide-in panel from left
   ---------------------------------------------------------- */
.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 280px;
  background: #ffffff;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 200;
  transform: translateX(-100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.mobile-drawer.open {
  transform: translateX(0);
}

.mobile-drawer-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 199;
}

.mobile-drawer-backdrop.open {
  display: block;
}

.mobile-drawer-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.mobile-drawer-header-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #10b981;
  margin: 0;
}

.mobile-drawer-nav {
  flex: 1;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mobile-drawer-tab {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: #4b5563;
  width: 100%;
  text-align: left;
  transition: background 0.15s ease;
}

.mobile-drawer-tab:hover {
  background: #f9fafb;
}

.mobile-drawer-tab.active {
  background: #f0fdf4;
  color: #059669;
  font-weight: 600;
}

.mobile-drawer-tab-badge {
  margin-left: auto;
  background: #e5e7eb;
  color: #374151;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  min-width: 20px;
  text-align: center;
}

.mobile-drawer-tab.active .mobile-drawer-tab-badge {
  background: #d1fae5;
  color: #065f46;
}

.mobile-drawer-footer {
  padding: 1rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-drawer-footer-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  width: 100%;
  text-align: left;
}

.mobile-drawer-footer-btn:hover {
  background: #f9fafb;
}

.mobile-drawer-footer-btn.signout {
  color: #ef4444;
}

/* ----------------------------------------------------------
   3. HAMBURGER BUTTON — visible only on mobile
   ---------------------------------------------------------- */
.mobile-hamburger {
  display: none;
}

@media (max-width: 768px) {
  .mobile-hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    min-height: 36px;
    min-width: 36px;
  }

  .mobile-hamburger span {
    display: block;
    width: 20px;
    height: 2px;
    background: #374151;
    border-radius: 2px;
    transition: all 0.2s ease;
  }
}

/* ----------------------------------------------------------
   4. HEADER — dynamic page title layout on mobile
   ---------------------------------------------------------- */
@media (max-width: 768px) {
  .mobile-app-label {
    display: block !important;
    font-size: 0.7rem;
    color: #9ca3af;
    font-weight: 500;
    line-height: 1;
    margin-bottom: 1px;
  }

  .mobile-page-title {
    font-size: 1.15rem !important;
    line-height: 1.2;
    margin: 0 !important;
  }

  .mobile-header-brand {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }
}

/* .mobile-app-label is hidden on desktop */
.mobile-app-label {
  display: none;
}

/* ----------------------------------------------------------
   5. LIST ITEM ROWS — compact pantry / shopping rows
   ---------------------------------------------------------- */
@media (max-width: 768px) {
  .pantry-item-row,
  .shopping-item-row,
  .favorites-item-row {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    padding: 0.75rem 1rem !important;
    gap: 0.75rem !important;
    background: white;
    border-radius: 0 !important;
    border-left: none !important;
    border-right: none !important;
    border-top: none !important;
    border-bottom: 1px solid #f1f5f9 !important;
    margin-bottom: 0 !important;
    box-shadow: none !important;
  }

  .pantry-item-row:last-child,
  .shopping-item-row:last-child,
  .favorites-item-row:last-child {
    border-bottom: none !important;
  }

  /* Expiry warning: orange left border */
  .pantry-item-row.expiring-soon {
    border-left: 3px solid #f97316 !important;
  }

  /* Hide secondary action buttons (edit icons) on mobile; keep only delete */
  .item-edit-btn {
    display: none !important;
  }

  .item-delete-btn {
    flex-shrink: 0;
    width: 32px !important;
    height: 32px !important;
    min-height: 32px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: #fee2e2 !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 0.875rem !important;
    cursor: pointer;
  }

  .item-content {
    flex: 1;
    min-width: 0;
  }

  .item-name {
    font-size: 0.9rem !important;
    font-weight: 600;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-meta {
    font-size: 0.75rem !important;
    color: #9ca3af;
    margin-top: 1px;
  }

  /* Category section headers */
  .pantry-category-header,
  .shopping-category-header {
    font-size: 0.7rem !important;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9ca3af;
    padding: 0.5rem 1rem 0.25rem !important;
    background: #f8fafc;
    position: sticky;
    top: 120px;
    z-index: 10;
    font-weight: 600;
  }
}

/* ----------------------------------------------------------
   6. FAB — floating action button (+ Add Item)
   ---------------------------------------------------------- */
.mobile-fab {
  display: none;
}

@media (max-width: 768px) {
  .mobile-fab {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #10b981;
    color: white;
    font-size: 1.75rem;
    line-height: 1;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.45);
    z-index: 150;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .mobile-fab:active {
    transform: scale(0.93);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
  }

  /* Hide the desktop inline "Add" buttons on mobile */
  .desktop-add-btn {
    display: none !important;
  }
}

/* ----------------------------------------------------------
   7. MODAL BOTTOM SHEETS
   ---------------------------------------------------------- */
@media (max-width: 768px) {
  .modal-content {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    transform: none !important;
    border-radius: 20px 20px 0 0 !important;
    max-height: 85vh !important;
    overflow-y: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    animation: slideUpSheet 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  @keyframes slideUpSheet {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
}

/* ----------------------------------------------------------
   8. RECIPE SECTION — stacked controls, single-column cards
   ---------------------------------------------------------- */
@media (max-width: 768px) {
  .recipe-controls-row {
    flex-direction: column !important;
    align-items: stretch !important;
  }

  .recipe-controls-row select,
  .recipe-controls-row input[type="number"],
  .recipe-controls-row button {
    width: 100% !important;
    min-width: unset !important;
    box-sizing: border-box !important;
  }

  .recipe-servings-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .recipe-servings-group input[type="number"] {
    width: 60px !important;
    flex-shrink: 0;
  }

  /* Recipe card grid → single column */
  .recipe-card-grid {
    grid-template-columns: 1fr !important;
  }
}

/* ----------------------------------------------------------
   9. MISC FIXES
   ---------------------------------------------------------- */
@media (max-width: 768px) {
  /* Expiry warning banner: stay on one line */
  .expiry-banner-items {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100% - 2rem);
    display: inline-block;
  }

  /* Calorie tracker panel: full width, flat bottom */
  .calorie-tracker-panel {
    width: 100% !important;
    box-sizing: border-box !important;
    border-radius: 0 0 12px 12px !important;
    left: 0 !important;
    right: 0 !important;
    max-width: 100% !important;
  }
}

/* ----------------------------------------------------------
   10. MEAL PLAN — touch drag ghost + drop highlight
   ---------------------------------------------------------- */
.drag-ghost {
  position: fixed;
  pointer-events: none;
  opacity: 0.88;
  z-index: 9999;
  transform: scale(1.05) rotate(1deg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  border-radius: 8px;
  background: white;
  border: 2px solid #10b981;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1f2937;
}

.calendar-slot.drag-over {
  background: #d1fae5 !important;
  outline: 2px dashed #10b981 !important;
  outline-offset: -2px;
}
```

- [ ] **Step 2: Import the new CSS file in main.tsx**

Edit `frontend/src/main.tsx` — add one import after the existing `mobile.css` import:

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './mobile.css'
import './mobile-responsive.css'
import './i18n'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Verify the CSS file loads**

Run:
```bash
cd frontend && npm run dev
```
Open `http://localhost:5173` in Chrome. Open DevTools → Toggle device toolbar → set to iPhone 12 (375×812). The existing tab nav bar should now be **hidden** (since `nav { display: none }` at mobile). Desktop (no device emulation) should look exactly the same as before.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/mobile-responsive.css frontend/src/main.tsx
git commit -m "feat: add mobile-responsive.css and import it"
```

---

## Task 2: Header — dynamic page title

**Files:**
- Modify: `frontend/src/App.tsx` (around line 2441–2504)

This task adds classNames to the header elements and inserts a small `mobile-app-label` span so CSS can show the two-row mobile header layout.

- [ ] **Step 1: Add classNames to the header brand div and h1**

Find the header section (around line 2449) and replace:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>👨‍🍳</span>
  <h1 style={{ margin: 0, color: '#10b981', fontSize: isMobile ? '1.25rem' : '1.8rem', fontWeight: '700' }}>
    {isMobile ? t('app.shortName') : t('app.name')}
  </h1>
</div>
```
With:
```tsx
<div className="mobile-header-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>👨‍🍳</span>
  <div>
    <span className="mobile-app-label">👨‍🍳 GroceryGenius</span>
    <h1 className="mobile-page-title" style={{ margin: 0, color: '#10b981', fontSize: isMobile ? '1.25rem' : '1.8rem', fontWeight: '700' }}>
      {isMobile ? (() => {
        const labels: Record<string, string> = {
          pantry: `📦 ${t('tabs.pantry')}`,
          recipes: `🍳 ${t('tabs.recipes')}`,
          mealplan: `📅 ${t('tabs.mealPlan')}`,
          shopping: `🛒 ${t('tabs.shopping')}`,
          donate: `❤️ ${t('tabs.donate')}`,
          favorites: `⭐ ${t('tabs.favorites')}`,
        };
        return labels[currentTab] || t('app.name');
      })() : t('app.name')}
    </h1>
  </div>
</div>
```

- [ ] **Step 2: Verify in browser**

With the dev server running and iPhone 12 emulation:
- The header should show a small grey "👨‍🍳 GroceryGenius" label above a larger bold tab name (e.g., "📦 Pantry")
- Switching tabs in desktop mode should still show the normal single-row header (no mobile-app-label visible)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: dynamic page title header on mobile"
```

---

## Task 3: Drawer nav

**Files:**
- Modify: `frontend/src/App.tsx` (add state, hamburger button, drawer JSX)

- [ ] **Step 1: Add `drawerOpen` state**

Find the state declarations near line 119 and add after `const [isMobile, setIsMobile] = useState(window.innerWidth < 768);`:
```tsx
const [drawerOpen, setDrawerOpen] = useState(false);
```

- [ ] **Step 2: Add hamburger button to header**

Find the header's right-side button group (around line 2456, the `<div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '0.75rem' }}>` div). Add the hamburger as the **first child** of that div:
```tsx
<button
  className="mobile-hamburger"
  onClick={() => setDrawerOpen(true)}
  aria-label="Open menu"
>
  <span />
  <span />
  <span />
</button>
```

- [ ] **Step 3: Hide the mobile language switcher and demo button from the header on mobile (they move to the drawer)**

In the existing header JSX, remove `{isMobile && <LanguageSwitcher compact />}` — it will live in the drawer footer instead.

- [ ] **Step 4: Add the drawer + backdrop JSX**

In the main return, **immediately after** `<div style={{ minHeight: '100vh', background: bgColor }}>` (around line 2440), insert:

```tsx
{/* Mobile drawer backdrop */}
<div
  className={`mobile-drawer-backdrop ${drawerOpen ? 'open' : ''}`}
  onClick={() => setDrawerOpen(false)}
/>

{/* Mobile slide-out drawer */}
<div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
  <div className="mobile-drawer-header">
    <span style={{ fontSize: '1.4rem' }}>👨‍🍳</span>
    <h2 className="mobile-drawer-header-title">GroceryGenius</h2>
  </div>

  <nav className="mobile-drawer-nav">
    {([
      { key: 'pantry',    icon: '📦', label: t('tabs.pantry'),    count: pantry.length },
      { key: 'recipes',   icon: '🍳', label: t('tabs.recipes'),   count: null },
      { key: 'mealplan',  icon: '📅', label: t('tabs.mealPlan'),  count: null },
      { key: 'shopping',  icon: '🛒', label: t('tabs.shopping'),  count: shoppingList.filter(i => !i.checked).length },
      { key: 'donate',    icon: '❤️', label: t('tabs.donate'),    count: getExpiringItems().length },
      { key: 'favorites', icon: '⭐', label: t('tabs.favorites'), count: favorites.length },
    ] as const).map(({ key, icon, label, count }) => (
      <button
        key={key}
        className={`mobile-drawer-tab ${currentTab === key ? 'active' : ''}`}
        onClick={() => { handleTabChange(key); setDrawerOpen(false); }}
      >
        <span>{icon}</span>
        <span>{label}</span>
        {count !== null && count > 0 && (
          <span className="mobile-drawer-tab-badge">{count}</span>
        )}
      </button>
    ))}
  </nav>

  <div className="mobile-drawer-footer">
    <LanguageSwitcher compact />
    <button
      className="mobile-drawer-footer-btn"
      onClick={() => { setShowDemoConfirm(true); setDrawerOpen(false); }}
    >
      🎬 Demo
    </button>
    <button
      className="mobile-drawer-footer-btn signout"
      onClick={async () => { await authService.signOut(); setUser(null); setDrawerOpen(false); }}
    >
      🚪 {t('header.signOut')}
    </button>
  </div>
</div>
```

- [ ] **Step 5: Verify drawer in browser**

With iPhone 12 emulation:
- No tab bar visible (hidden by CSS)
- Hamburger ☰ icon visible in header top-right
- Tapping hamburger slides the drawer in from the left
- Tapping outside (backdrop) closes it
- Tapping a tab item switches the tab and closes the drawer
- Desktop: hamburger not visible, drawer never renders on screen (it's off-canvas via transform)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: slide-out drawer nav for mobile"
```

---

## Task 4: Floating Action Button (FAB)

**Files:**
- Modify: `frontend/src/App.tsx`

The FAB renders inside `<main>` but uses `position: fixed` so it floats above content. It calls the same handler as the inline "Add" button for the current tab.

- [ ] **Step 1: Add FAB just before the closing `</main>` tag**

Find the closing `</main>` tag (around line 6530) and insert before it:

```tsx
{/* Mobile FAB — only shown on mobile via CSS */}
{isMobile && (currentTab === 'pantry' || currentTab === 'shopping') && (
  <button
    className="mobile-fab"
    onClick={() => {
      if (currentTab === 'pantry') setShowAddPantry(true);
      if (currentTab === 'shopping') setShowAddShopping(true);
    }}
    aria-label="Add item"
  >
    +
  </button>
)}
```

- [ ] **Step 2: Add `desktop-add-btn` className to the existing "Add to Pantry" and "Add to Shopping" inline buttons**

Search for the pantry "Add" button (look for `setShowAddPantry(true)` in JSX) and add `className="desktop-add-btn"` to it. Do the same for the shopping list "Add" button (`setShowAddShopping(true)`).

These buttons will be `display: none` on mobile (via the CSS rule `.desktop-add-btn { display: none }`), so the FAB takes over.

- [ ] **Step 3: Verify FAB in browser**

With iPhone 12 emulation on the Pantry tab: a green `+` circle should be pinned to the bottom-right corner. Tapping it should open the Add Pantry Item modal. Switch to Shopping tab — same behaviour with the shopping form. On desktop (no emulation) the FAB should not be visible.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: floating action button for add-item on mobile"
```

---

## Task 5: List item row classNames

**Files:**
- Modify: `frontend/src/App.tsx` (pantry list items, shopping list items)

The CSS in Task 1 already defines the row styles — this task wires up the classNames so the CSS activates.

- [ ] **Step 1: Find the pantry item list rendering**

Search for the JSX that maps over `pantry` to render each item (look for `pantry.map(item =>` or similar, around the pantry tab section). Each item's outer `<div>` needs:
- `className="pantry-item-row"` (add or merge with existing className)
- `className` should also include `"expiring-soon"` when the item is expiring: `className={\`pantry-item-row\${isExpiringSoon(item) ? ' expiring-soon' : ''}\`}`

Where `isExpiringSoon` checks if `item.expiryDate` is within 3 days:
```tsx
const isExpiringSoon = (item: PantryItem): boolean => {
  if (!item.expiryDate) return false;
  const diff = new Date(item.expiryDate).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
};
```
Add this helper function in App.tsx near the other helper functions (around line 600–650).

- [ ] **Step 2: Add classNames to pantry item sub-elements**

Inside each pantry item row, add:
- `className="item-content"` to the div containing the item name and metadata
- `className="item-name"` to the element showing the item name
- `className="item-meta"` to the element showing quantity/unit/category/expiry
- `className="item-edit-btn"` to the edit button
- `className="item-delete-btn"` to the delete button

- [ ] **Step 3: Add classNames to shopping list items**

Find the JSX that maps over `shoppingList` and add the same pattern:
- `className="shopping-item-row"` to each item's outer div
- `className="item-content"`, `className="item-name"`, `className="item-meta"` to sub-elements
- `className="item-edit-btn"` to edit, `className="item-delete-btn"` to delete

- [ ] **Step 4: Add classNames to category headers**

Find where category section headers are rendered for pantry and shopping list. Add:
- `className="pantry-category-header"` to pantry category headers
- `className="shopping-category-header"` to shopping category headers

- [ ] **Step 5: Verify in browser**

With iPhone 12 emulation on the Pantry tab (with at least 2–3 items added):
- Items should display as compact horizontal rows (emoji + name + meta on left, delete button on right)
- Edit button should be invisible on mobile
- Any expiring item should have an orange left border
- Category headers should be small uppercase labels

On desktop: items should look exactly as before.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: compact swipe-to-delete list rows on mobile"
```

---

## Task 6: Modal bottom sheets

**Files:**
- Modify: `frontend/src/App.tsx` (add `modal-content` className to inner modal divs)

The CSS from Task 1 applies bottom-sheet styling to any `.modal-content` element. We need to add that className to the inner content div of each modal (the div that calls `e.stopPropagation()`).

- [ ] **Step 1: Identify all modal inner divs**

Run this grep to find all modal content divs:
```bash
grep -n "stopPropagation\|modal-backdrop" frontend/src/App.tsx
```
This returns the line numbers of all modal backdrops and inner divs. The inner div pattern looks like:
```tsx
<div
  onClick={(e) => e.stopPropagation()}
  style={{
    background: cardBg,
    borderRadius: isMobile ? '16px' : '20px',
    ...
  }}
>
```

- [ ] **Step 2: Add `className="modal-content"` to each inner modal div**

For each modal found in Step 1, add `className="modal-content"` to the inner `<div onClick={(e) => e.stopPropagation()}>` element. There are approximately 8 modals. Example change:

Before:
```tsx
<div
  onClick={(e) => e.stopPropagation()}
  style={{
    background: cardBg,
    borderRadius: isMobile ? '16px' : '20px',
    padding: isMobile ? '1.25rem' : '2rem',
    maxWidth: isMobile ? '95vw' : '500px',
    width: isMobile ? '95vw' : '90%',
    animation: 'scaleIn 0.3s ease-out',
    position: 'relative'
  }}
>
```
After:
```tsx
<div
  className="modal-content"
  onClick={(e) => e.stopPropagation()}
  style={{
    background: cardBg,
    borderRadius: isMobile ? '16px' : '20px',
    padding: isMobile ? '1.25rem' : '2rem',
    maxWidth: isMobile ? '95vw' : '500px',
    width: isMobile ? '95vw' : '90%',
    animation: 'scaleIn 0.3s ease-out',
    position: 'relative'
  }}
>
```

- [ ] **Step 3: Verify in browser**

With iPhone 12 emulation, open any modal (e.g., tap the FAB to open Add Pantry Item). The modal should:
- Slide up from the bottom of the screen
- Cover roughly 85% of the screen height
- Have rounded top corners (20px)
- Be scrollable if content is tall

On desktop: modals should still appear centred, unchanged.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: bottom sheet modals on mobile"
```

---

## Task 7: Recipe section fixes

**Files:**
- Modify: `frontend/src/App.tsx` (add classNames to recipe controls row and recipe card grid)

- [ ] **Step 1: Add `className="recipe-controls-row"` to the dietary/servings flex row**

Find the `<div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>` that wraps the dietary `<select>`, servings input, and action buttons (around line 2584). Add `className="recipe-controls-row"`:

```tsx
<div className="recipe-controls-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
```

- [ ] **Step 2: Add `className="recipe-servings-group"` to the servings label+input wrapper**

Find the `<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>` inside the recipe controls that wraps the `⚖️` label and number input. Add `className="recipe-servings-group"`:

```tsx
<div className="recipe-servings-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
```

- [ ] **Step 3: Add `className="recipe-card-grid"` to the recipe cards container**

Find where `recipes.map(...)` renders the recipe cards. The wrapping grid/flex container needs `className="recipe-card-grid"`. If it uses `display: grid`, the CSS will override `grid-template-columns` to `1fr` on mobile.

- [ ] **Step 4: Verify in browser**

With iPhone 12 emulation on the Recipes tab:
- The dietary filter select, servings input, and buttons should stack vertically (each full width)
- Recipe cards should display in a single column
- Both inputs at the top should be full width without horizontal overflow

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: recipe section stacks vertically on mobile"
```

---

## Task 8: Misc fixes (expiry banner, calorie panel)

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add `className="expiry-banner-items"` to the expiry warning item list**

Find the expiry warning banner (around line 2506–2511):
```tsx
<div style={{ background: '#fee2e2', borderBottom: '2px solid #dc2626', padding: '0.75rem' }}>
  <div style={{ maxWidth: '1200px', margin: '0 auto', color: '#dc2626', fontWeight: '600' }}>
    ⚠️ {t('donate.itemsExpiring', { count: getExpiringItems().length })} {getExpiringItems().map(i => i.name).join(', ')}
  </div>
</div>
```

Wrap the items list portion in a span with the class:
```tsx
<div style={{ background: '#fee2e2', borderBottom: '2px solid #dc2626', padding: '0.75rem' }}>
  <div style={{ maxWidth: '1200px', margin: '0 auto', color: '#dc2626', fontWeight: '600' }}>
    ⚠️ {t('donate.itemsExpiring', { count: getExpiringItems().length })}{' '}
    <span className="expiry-banner-items">{getExpiringItems().map(i => i.name).join(', ')}</span>
  </div>
</div>
```

- [ ] **Step 2: Add `className="calorie-tracker-panel"` to the calorie tracker expanded panel**

Find where `showCalorieTracker` renders its expanded panel (search for `showCalorieTracker &&`). Add `className="calorie-tracker-panel"` to its outer wrapper div.

- [ ] **Step 3: Verify in browser**

With iPhone 12 emulation:
- If there are expiring items, the yellow banner should show on one line with ellipsis if the list is long
- Opening the calorie tracker should show a full-width panel without horizontal overflow

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "fix: expiry banner and calorie panel overflow on mobile"
```

---

## Task 9: Meal Plan — touch drag-and-drop

**Files:**
- Modify: `frontend/src/components/MealPlanCalendar.tsx`

- [ ] **Step 1: Add `useRef` import and ghost ref**

At the top of `MealPlanCalendar.tsx`, `useRef` is already available via the React import. Add a ref for the ghost element near the other state declarations (around line 48):

```tsx
const dragGhostRef = useRef<HTMLDivElement | null>(null);
```

- [ ] **Step 2: Add touch drag handler functions**

Add these three functions after `handleDrop` (around line 208):

```tsx
const handleTouchStart = (recipe: Recipe, e: React.TouchEvent) => {
  if (!isMobile) return;
  setDraggedRecipe(recipe);

  // Create ghost element
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.textContent = recipe.name;
  document.body.appendChild(ghost);
  dragGhostRef.current = ghost;

  const touch = e.touches[0];
  ghost.style.left = `${touch.clientX - 90}px`;
  ghost.style.top = `${touch.clientY - 24}px`;
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (!isMobile || !dragGhostRef.current) return;
  e.preventDefault(); // prevent page scroll during drag

  const touch = e.touches[0];
  dragGhostRef.current.style.left = `${touch.clientX - 90}px`;
  dragGhostRef.current.style.top = `${touch.clientY - 24}px`;

  // Highlight calendar slot under finger
  dragGhostRef.current.style.pointerEvents = 'none';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  dragGhostRef.current.style.pointerEvents = '';

  // Remove previous highlight
  document.querySelectorAll('.calendar-slot.drag-over').forEach(s => s.classList.remove('drag-over'));

  // Find nearest slot
  const slot = el?.closest('[data-date]');
  if (slot) slot.classList.add('drag-over');
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (!isMobile) return;

  // Remove ghost
  if (dragGhostRef.current) {
    document.body.removeChild(dragGhostRef.current);
    dragGhostRef.current = null;
  }

  // Remove all highlights
  document.querySelectorAll('.calendar-slot.drag-over').forEach(s => s.classList.remove('drag-over'));

  // Find slot under finger
  const touch = e.changedTouches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const slot = el?.closest('[data-date]') as HTMLElement | null;

  if (slot) {
    const date = slot.dataset.date;
    const mealType = slot.dataset.mealType;
    if (date && mealType) {
      handleDrop(date, mealType);
      return;
    }
  }

  // No slot found — clear selection
  setDraggedRecipe(null);
};
```

- [ ] **Step 3: Wire touch handlers onto recipe cards**

Find the recipe card `<div>` (around line 522–552) and replace the existing mobile `onClick` handler and add the touch handlers:

Before:
```tsx
draggable={!isMobile}
onDragStart={() => !isMobile && setDraggedRecipe(recipe)}
onDragEnd={() => !isMobile && setDraggedRecipe(null)}
onClick={() => {
  if (isMobile) {
    setDraggedRecipe(recipe);
  }
}}
```
After (the `style` object is shown in full below — also remove the old `onClick` that set `draggedRecipe` on mobile):
```tsx
style={{
  padding: isMobile ? '0.65rem' : '0.75rem',
  background: isMobile && draggedRecipe?.id === recipe.id ? '#dbeafe' : 'white',
  marginBottom: '0.5rem',
  borderRadius: '8px',
  border: isMobile && draggedRecipe?.id === recipe.id
    ? '2px solid #3b82f6'
    : '2px solid #e5e7eb',
  cursor: isMobile ? 'grab' : 'grab',
  transition: 'all 0.2s',
  touchAction: isMobile ? 'none' : 'auto',
}}
```

- [ ] **Step 4: Add `data-date` and `data-meal-type` attributes to calendar slot divs**

Find the calendar slot `<div>` (around line 618) that has `onDragOver` and `onDrop`. Add the data attributes:

Before:
```tsx
<div
  key={`${dateStr}-${mealType}`}
  onDragOver={handleDragOver}
  onDrop={() => handleDrop(dateStr, mealType)}
  onClick={() => handleSlotClick(dateStr, mealType)}
  style={{ ... }}
>
```
After:
```tsx
<div
  key={`${dateStr}-${mealType}`}
  className="calendar-slot"
  data-date={dateStr}
  data-meal-type={mealType}
  onDragOver={handleDragOver}
  onDrop={() => handleDrop(dateStr, mealType)}
  onClick={() => handleSlotClick(dateStr, mealType)}
  style={{ ... }}
>
```

- [ ] **Step 5: Verify touch drag in browser**

With iPhone 12 emulation on the Meal Plan tab (requires at least one saved/favourite recipe):
1. Long-press and drag a recipe card from the left panel — a ghost card should appear under your finger
2. Drag the ghost over a calendar slot — the slot should highlight green with a dashed border
3. Release over a slot — the recipe should be added to that meal slot
4. Release over empty space — nothing happens, selection clears

On desktop: existing HTML5 drag-and-drop should work exactly as before.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/MealPlanCalendar.tsx
git commit -m "feat: touch drag-and-drop for meal plan calendar on mobile"
```

---

## Self-Review Checklist

Run after all tasks are complete:

- [ ] Open on real phone (or emulation) and tap through all 6 tabs — no horizontal overflow on any tab
- [ ] Drawer opens and closes cleanly; each tab switches correctly
- [ ] Header shows current tab name on mobile; shows app name on desktop
- [ ] FAB appears on Pantry and Shopping tabs; tapping opens the correct form
- [ ] Modals slide up as bottom sheets on mobile; appear centred on desktop
- [ ] Meal plan: drag a recipe to a calendar slot on mobile — it saves correctly
- [ ] Desktop: run through the same tabs — everything looks identical to before these changes
