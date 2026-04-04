# GroceryGenius UI Redesign — Bright Kitchen Design System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all generic system fonts, emerald/purple/amber palette, and white backgrounds with the Bright Kitchen design system: Bricolage Grotesque + Lato fonts, Tomato & Parchment color palette, espresso-dark navigation.

**Architecture:** CSS variables in `index.css` become the single source of truth. Component files then reference `var(--gg-*)` tokens instead of hardcoded hex values. Three special-effect components (ParticleButton, AttractButton, SmoothTab) are full rewrites from the reference implementations, adapted to use inline styles (no Tailwind/cn — this project has no shadcn setup). App.tsx has the most pervasive color usage; it is updated by changing the two central variables (`cardBg`, `textColor`) and patching ~15 remaining hardcoded sites.

**Tech Stack:** React 18, TypeScript, inline `style={}` props throughout (no Tailwind), `motion/react` for animations, `lucide-react` (to be installed), Google Fonts via CDN.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `frontend/src/index.css` | Modify | Replace `:root`, add body/h1-h6 defaults |
| `frontend/index.html` | Modify | Add Google Fonts `<link>`s, remove purple body gradient, update theme-color |
| `frontend/src/App.css` | Modify | Remove Vite boilerplate color references |
| `frontend/src/mobile-responsive.css` | Modify | Drawer background, FAB color, item row borders, active states |
| `frontend/src/mobile.css` | No change needed | Already color-neutral |
| `frontend/src/App.tsx` | Modify | `cardBg`/`textColor` variables, header, nav, ~12 inline color sites |
| `frontend/src/components/Auth.tsx` | Modify | Remove purple gradient, parchment bg, brand inputs, wire AttractButton |
| `frontend/src/components/AttractButton.tsx` | **Full rewrite** | Tomato palette, LogIn icon, parchment particles, inline styles |
| `frontend/src/components/ParticleButton.tsx` | **Full rewrite** | GG particle colors, Sparkles icon, inline styles |
| `frontend/src/components/SmoothTab.tsx` | **Full rewrite** | Espresso pill, cream toolbar, GG waveform colors, desktop-only |
| `frontend/src/components/RecipeCard.tsx` | Modify | Health grade colors, nutrition values, sections, tags |
| `frontend/src/components/RecipeList.tsx` | Modify | Heading styles, wrap Generate button |
| `frontend/src/components/IngredientInput.tsx` | Modify | Tags gradient, input border, wrap submit with ParticleButton |
| `frontend/src/components/IngredientSubstitution.tsx` | Modify | Card background, heading font, indicators |
| `frontend/src/components/MealPlanCalendar.tsx` | Modify | Calendar header, cells, today highlight, add-meal button |
| `frontend/src/components/Toast.tsx` | Modify | Four gradient sets, title/body fonts |
| `frontend/src/components/FavoriteHeartButton.tsx` | Modify | Heart fill/stroke colors |
| `frontend/src/components/SlideTextButton.tsx` | Modify | Espresso border + tomato hover fill |
| `frontend/src/components/MouseEffectCard.tsx` | Modify | DOT_COLOR, card border/radius/bg |
| `frontend/src/components/LanguageSwitcher.tsx` | Modify | Trigger/dropdown colors |

---

## Task 1 — Install lucide-react

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1.1: Install lucide-react**

```bash
cd frontend && npm install lucide-react
```

Expected: lucide-react added to `node_modules` and `package.json` dependencies. No build errors.

- [ ] **Step 1.2: Verify the install**

```bash
cd frontend && node -e "const x = require('lucide-react'); console.log('ok', Object.keys(x).length, 'icons')"
```

Expected output: `ok <N> icons` (any positive number).

- [ ] **Step 1.3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add lucide-react for UI icons"
```

---

## Task 2 — Design Tokens: index.css

**Files:**
- Modify: `frontend/src/index.css`

Replace the entire `:root` block and `body` defaults. The current `:root` (lines 1-14) sets `font-family: system-ui` and dark `#242424` background — both must go. Preserve the existing `@keyframes`, `@media` blocks, and animation declarations below line 69.

- [ ] **Step 2.1: Replace `:root` block and add body/heading defaults**

Replace from line 1 (``:root {``) through line 14 (the closing `}`), then replace the `body` block (lines 25-32) and the `h1` block (lines 33-36), and replace the `button` default block and the `@media (prefers-color-scheme: light)` block. The final replacement:

```css
:root {
  /* ── Primary ────────────────────────────────── */
  --gg-tomato:           #e8391a;
  --gg-tomato-hover:     #c42f14;
  --gg-tomato-subtle:    rgba(232, 57, 26, 0.08);
  --gg-tomato-subtle-md: rgba(232, 57, 26, 0.14);

  /* ── Backgrounds ────────────────────────────── */
  --gg-parchment:        #fdf6ec;
  --gg-cream:            #fff8f0;

  /* ── Text ───────────────────────────────────── */
  --gg-espresso:         #1c1208;
  --gg-taupe:            #7a6652;

  /* ── Borders ────────────────────────────────── */
  --gg-border:           #eddecb;
  --gg-border-strong:    #d4b896;

  /* ── Semantic: Success ──────────────────────── */
  --gg-forest:           #2d6a4f;
  --gg-forest-hover:     #1e4d38;
  --gg-forest-light:     #e8f5ee;
  --gg-forest-subtle:    rgba(45, 106, 79, 0.08);

  /* ── Semantic: Warning ──────────────────────── */
  --gg-amber:            #e8962a;
  --gg-amber-hover:      #c47a1e;
  --gg-amber-light:      #fef3dc;

  /* ── Semantic: Error ────────────────────────── */
  --gg-red:              #c0392b;
  --gg-red-hover:        #96271f;
  --gg-red-light:        #fde8e6;

  /* ── Depth ──────────────────────────────────── */
  --gg-radius-sm:  6px;
  --gg-radius-md:  10px;
  --gg-radius-lg:  14px;
  --gg-radius-xl:  20px;
  --gg-shadow-sm:  0 2px 8px  rgba(28, 18, 8, 0.06);
  --gg-shadow-md:  0 4px 16px rgba(28, 18, 8, 0.10);
  --gg-shadow-lg:  0 8px 32px rgba(28, 18, 8, 0.14);

  /* ── Typography ─────────────────────────────── */
  --gg-font-display: 'Bricolage Grotesque', sans-serif;
  --gg-font-body:    'Lato', sans-serif;

  line-height: 1.5;
  font-weight: 400;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  font-weight: 500;
  color: var(--gg-tomato);
  text-decoration: inherit;
}
a:hover {
  color: var(--gg-tomato-hover);
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
  font-family: var(--gg-font-body);
  background-color: var(--gg-parchment);
  color: var(--gg-espresso);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--gg-font-display);
  color: var(--gg-espresso);
}

button {
  border-radius: var(--gg-radius-md);
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: var(--gg-font-body);
  background-color: var(--gg-cream);
  color: var(--gg-espresso);
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: var(--gg-tomato);
}
button:focus,
button:focus-visible {
  outline: 2px solid var(--gg-tomato);
  outline-offset: 2px;
}
```

Then remove the `@media (prefers-color-scheme: light)` block entirely (it re-overrides body/button colors and will fight with our tokens).

- [ ] **Step 2.2: Add SmoothTab mobile-hide rule at end of file**

```css
/* SmoothTab: desktop only */
@media (max-width: 768px) {
  .gg-smooth-tab {
    display: none !important;
  }
}
```

- [ ] **Step 2.3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add Bright Kitchen CSS design tokens"
```

---

## Task 3 — Typography & index.html

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 3.1: Add Google Fonts preconnect + stylesheet in `<head>` (after existing `<meta>` tags)**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Lato:wght@400;700&display=swap" rel="stylesheet">
```

- [ ] **Step 3.2: Update `theme-color` meta from `#10b981` to `#e8391a`**

Find: `<meta name="theme-color" content="#10b981">`
Replace: `<meta name="theme-color" content="#e8391a">`

- [ ] **Step 3.3: Replace the inline `<style>` block's body rule**

The current inline style in `index.html`:
```html
<style>
    * {
        box-sizing: border-box;
    }
    body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
    }
</style>
```

Replace with:
```html
<style>
    * {
        box-sizing: border-box;
    }
    body {
        margin: 0;
        font-family: 'Lato', -apple-system, sans-serif;
        background-color: #fdf6ec;
        min-height: 100vh;
    }
</style>
```

- [ ] **Step 3.4: Commit**

```bash
git add frontend/index.html
git commit -m "feat: add Bricolage Grotesque + Lato fonts, remove purple gradient"
```

---

## Task 4 — App.css cleanup

**Files:**
- Modify: `frontend/src/App.css`

- [ ] **Step 4.1: Replace the entire file**

The current App.css has leftover Vite boilerplate (logo spin, `.read-the-docs`). Replace with a clean slate:

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  text-align: left;
}

@keyframes logo-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 4.2: Commit**

```bash
git add frontend/src/App.css
git commit -m "chore: strip Vite boilerplate from App.css"
```

---

## Task 5 — mobile-responsive.css: Layout Shell colors

**Files:**
- Modify: `frontend/src/mobile-responsive.css`

All the green/white drawer colors need updating to espresso. Work through the file section by section:

- [ ] **Step 5.1: Update `.mobile-drawer` background**

Find:
```css
.mobile-drawer {
  ...
  background: #ffffff;
  ...
}
```
Replace `background: #ffffff;` with `background: var(--gg-espresso);`

- [ ] **Step 5.2: Update `.mobile-drawer-header` border**

Find: `border-bottom: 1px solid #f1f5f9;`
Replace: `border-bottom: 1px solid rgba(255,255,255,0.1);`

- [ ] **Step 5.3: Update `.mobile-drawer-header-title` color**

Find: `color: #10b981;`
Replace: `color: #ffffff;`
Also add: `font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;`

- [ ] **Step 5.4: Update `.mobile-drawer-tab` styles**

Find:
```css
.mobile-drawer-tab {
  ...
  color: #4b5563;
  ...
}
.mobile-drawer-tab:hover {
  background: #f9fafb;
}
.mobile-drawer-tab.active {
  background: #f0fdf4;
  color: #059669;
  font-weight: 600;
}
```
Replace:
```css
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
  color: rgba(255, 255, 255, 0.65);
  width: 100%;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}
.mobile-drawer-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}
.mobile-drawer-tab.active {
  background: transparent;
  color: #ffffff;
  font-weight: 600;
  border-left: 3px solid var(--gg-tomato);
}
```

- [ ] **Step 5.5: Update `.mobile-drawer-tab-badge`**

Find:
```css
.mobile-drawer-tab-badge {
  ...
  background: #e5e7eb;
  color: #374151;
  ...
}
.mobile-drawer-tab.active .mobile-drawer-tab-badge {
  background: #d1fae5;
  color: #065f46;
}
```
Replace:
```css
.mobile-drawer-tab-badge {
  margin-left: auto;
  background: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.8);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  min-width: 20px;
  text-align: center;
}
.mobile-drawer-tab.active .mobile-drawer-tab-badge {
  background: var(--gg-tomato-subtle-md);
  color: var(--gg-tomato);
}
```

- [ ] **Step 5.6: Update `.mobile-drawer-footer` border + footer button colors**

Find: `border-top: 1px solid #f1f5f9;` → Replace: `border-top: 1px solid rgba(255,255,255,0.1);`

Find:
```css
.mobile-drawer-footer-btn {
  ...
  color: #6b7280;
  ...
}
.mobile-drawer-footer-btn:hover {
  background: #f9fafb;
}
.mobile-drawer-footer-btn.signout {
  color: #ef4444;
}
```
Replace:
```css
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
  color: rgba(255,255,255,0.55);
  width: 100%;
  text-align: left;
}
.mobile-drawer-footer-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #ffffff;
}
.mobile-drawer-footer-btn.signout {
  color: var(--gg-tomato);
}
```

- [ ] **Step 5.7: Update `.mobile-hamburger` bar color**

Find: `background: #374151;`
Replace: `background: #ffffff;`

- [ ] **Step 5.8: Update `.mobile-fab` color**

Find:
```css
.mobile-fab {
  ...
  background: #10b981;
  ...
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.45);
  ...
}
.mobile-fab:active {
  ...
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
}
```
Replace:
```css
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
  background: var(--gg-tomato);
  color: white;
  font-size: 1.75rem;
  line-height: 1;
  box-shadow: 0 8px 24px rgba(232, 57, 26, 0.35);
  z-index: 150;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.mobile-fab:active {
  transform: scale(0.93);
  box-shadow: 0 2px 8px rgba(232, 57, 26, 0.25);
}
```

- [ ] **Step 5.9: Update pantry/shopping item row colors**

Find:
```css
.pantry-item-row,
.shopping-item-row,
.favorites-item-row {
  ...
  background: white;
  ...
  border-bottom: 1px solid #f1f5f9 !important;
  ...
}
```
Replace `background: white;` with `background: var(--gg-cream);`
Replace `border-bottom: 1px solid #f1f5f9 !important;` with `border-bottom: 1px solid var(--gg-border) !important;`

Find: `border-left: 3px solid #f97316 !important;` (expiring-soon)
Replace: `border-left: 3px solid var(--gg-amber) !important;`

Find:
```css
.item-delete-btn {
  ...
  background: #fee2e2 !important;
  ...
}
```
Replace: `background: var(--gg-red-light) !important;`

Find:
```css
.item-name {
  ...
  color: #1f2937;
  ...
}
.item-meta {
  ...
  color: #9ca3af;
  ...
}
```
Replace:
- `color: #1f2937;` → `color: var(--gg-espresso);`
- `color: #9ca3af;` → `color: var(--gg-taupe);`

Find:
```css
.pantry-category-header,
.shopping-category-header {
  ...
  color: #9ca3af;
  background: #f8fafc;
  ...
}
```
Replace `color: #9ca3af;` with `color: var(--gg-taupe);`
Replace `background: #f8fafc;` with `background: var(--gg-parchment);`

- [ ] **Step 5.10: Commit**

```bash
git add frontend/src/mobile-responsive.css
git commit -m "feat: apply Bright Kitchen colors to mobile drawer and layout shell"
```

---

## Task 6 — App.tsx: Header, variables, inline color patches

**Files:**
- Modify: `frontend/src/App.tsx`

App.tsx has two central variables that cascade to ~50 inline uses. Changing them fixes most of the app in one edit. Then ~12 specific sites need individual patching.

- [ ] **Step 6.1: Update `cardBg` and `textColor` variables (around line 205-206)**

Find:
```tsx
  const cardBg = 'rgba(255, 255, 255, 0.95)';
  const textColor = '#1f2937';
```
Replace:
```tsx
  const cardBg = 'var(--gg-cream)';
  const textColor = 'var(--gg-espresso)';
```

Also find (nearby, same area):
```tsx
  const mutedText = '#6b7280';
```
If `mutedText` exists, replace: `const mutedText = 'var(--gg-taupe)';`

- [ ] **Step 6.2: Update header background and logo (around line 2501-2514)**

Find:
```tsx
      <header style={{
        background: cardBg,
        padding: isMobile ? '0.75rem 1rem' : '1rem',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
```
Replace `background: cardBg,` with `background: 'var(--gg-espresso)',`
Replace `boxShadow: '0 2px 20px rgba(0,0,0,0.1)',` with `boxShadow: '0 2px 16px rgba(28,18,8,0.25)',`

Find:
```tsx
            <h1 className="mobile-page-title" style={{ margin: 0, color: '#10b981', fontSize: isMobile ? '1.25rem' : '1.8rem', fontWeight: '700' }}>
```
Replace:
```tsx
            <h1 className="mobile-page-title" style={{ margin: 0, color: '#ffffff', fontSize: isMobile ? '1.25rem' : '1.8rem', fontWeight: '800', fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-0.5px' }}>
```

- [ ] **Step 6.3: Update Demo button (purple gradient, around line 2519-2529)**

Find:
```tsx
                  background: 'linear-gradient(45deg, #8b5cf6, #6366f1)',
```
Replace:
```tsx
                  background: 'rgba(255,255,255,0.1)',
```
Also update its `border-radius: '8px'` → `borderRadius: 'var(--gg-radius-md)'`

- [ ] **Step 6.4: Update Sign-out button (around line 2540-2545)**

Find:
```tsx
                  background: '#ef4444',
```
Replace:
```tsx
                  background: 'var(--gg-red)',
```

- [ ] **Step 6.5: Update Generate Recipes button (around line 2707-2713)**

Find:
```tsx
                <button onClick={handleGetRecipes} disabled={recipeLoading}
                  style={{
                    padding: '0.75rem 2rem', background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)',
                    color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: recipeLoading ? 'not-allowed' : 'pointer'
                  }}>
                  {recipeLoading ? `⏳ ${t('recipes.generating')}` : `🍳 ${t('recipes.getRecipes')}`}
                </button>
```
Replace:
```tsx
                <button onClick={handleGetRecipes} disabled={recipeLoading}
                  style={{
                    padding: '0.75rem 2rem',
                    background: recipeLoading ? 'var(--gg-taupe)' : 'var(--gg-tomato)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--gg-radius-md)',
                    fontWeight: '600',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    cursor: recipeLoading ? 'not-allowed' : 'pointer',
                    boxShadow: recipeLoading ? 'none' : '0 2px 8px rgba(232,57,26,0.30)',
                  }}>
                  {recipeLoading ? `⏳ ${t('recipes.generating')}` : `✨ ${t('recipes.getRecipes')}`}
                </button>
```

- [ ] **Step 6.6: Update Scan button (purple, around line 2700-2706)**

Find: `background: '#8b5cf6',`
Replace: `background: 'var(--gg-espresso)',`

- [ ] **Step 6.7: Update recipe ingredient section (green tint, around line 2852-2857)**

Find:
```tsx
                            background: '#f0fdf4',
                            ...
                            border: '1px solid #bbf7d0'
```
Replace: `background: 'var(--gg-forest-light)',` and `border: '1px solid var(--gg-border)',`

- [ ] **Step 6.8: Update recipe difficulty badges in card list (around line 2844-2846)**

Find:
```tsx
                              background: recipe.difficulty.toLowerCase().includes('easy') ? '#dcfce7' : '#fef3c7',
                              color: recipe.difficulty.toLowerCase().includes('easy') ? '#166534' : '#92400e'
```
Replace:
```tsx
                              background: recipe.difficulty.toLowerCase().includes('easy') ? 'var(--gg-forest-light)' : 'var(--gg-amber-light)',
                              color: recipe.difficulty.toLowerCase().includes('easy') ? 'var(--gg-forest)' : 'var(--gg-amber-hover)'
```

- [ ] **Step 6.9: Update remaining `#10b981` occurrences in App.tsx with a targeted search**

Run this grep to find remaining green references:
```bash
grep -n "#10b981\|#059669\|#10B981" frontend/src/App.tsx
```

For each result, replace with `var(--gg-forest)` (for health/success contexts) or `var(--gg-tomato)` (for primary action contexts). Common patterns:
- `color: '#10b981'` in calorie counter display → `color: 'var(--gg-forest)'`
- `background: '#f0fdf4'` sections → `background: 'var(--gg-forest-light)'`
- `border: '1px solid #bbf7d0'` → `border: '1px solid var(--gg-border)'`

- [ ] **Step 6.10: Update remaining error/red `#ef4444` in App.tsx**

```bash
grep -n "#ef4444\|#fee2e2\|#dc2626" frontend/src/App.tsx
```

Replace `#ef4444` with `var(--gg-red)`, `#fee2e2` with `var(--gg-red-light)`, `#dc2626` with `var(--gg-red-hover)`.

- [ ] **Step 6.11: Update calorie tracker panel (around line 2551-2557)**

Find: `background: todayCalories > dailyCalorieGoal ? '#fee2e2' : '#f0fdf4',`
Replace: `background: todayCalories > dailyCalorieGoal ? 'var(--gg-red-light)' : 'var(--gg-forest-light)',`

- [ ] **Step 6.12: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: apply Bright Kitchen palette to App.tsx header and inline styles"
```

---

## Task 7 — Auth.tsx: Parchment page + form restyle

**Files:**
- Modify: `frontend/src/components/Auth.tsx`

- [ ] **Step 7.1: Add AttractButton import at top of file**

After the existing imports:
```tsx
import AttractButton from './AttractButton';
```

- [ ] **Step 7.2: Replace the outer page container style (around line 89-96)**

Find:
```tsx
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
```
Replace:
```tsx
    <div style={{
      minHeight: '100vh',
      background: 'var(--gg-parchment)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
```

- [ ] **Step 7.3: Replace the card container style (around line 97-104)**

Find:
```tsx
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '3rem',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
```
Replace:
```tsx
      <div style={{
        background: 'var(--gg-cream)',
        borderRadius: 'var(--gg-radius-xl)',
        padding: '3rem',
        maxWidth: '450px',
        width: '100%',
        boxShadow: 'var(--gg-shadow-lg)',
        border: '1.5px solid var(--gg-border)',
      }}>
```

- [ ] **Step 7.4: Update logo/title (around line 107-110)**

Find:
```tsx
          <h1 style={{ margin: 0, color: '#10b981', fontSize: '2rem' }}>GroceryGenius</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
```
Replace:
```tsx
          <h1 style={{ margin: 0, color: 'var(--gg-espresso)', fontSize: '2.5rem', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, letterSpacing: '-1px' }}>GroceryGenius</h1>
          <p style={{ color: 'var(--gg-taupe)', marginTop: '0.5rem', fontFamily: "'Lato', sans-serif" }}>
```

- [ ] **Step 7.5: Update form labels (lines 116-117, 137-138, 157-158)**

Each `<label>` currently has no explicit font. Update the three labels:
```tsx
<label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '0.8rem', color: 'var(--gg-espresso)' }}>
```

- [ ] **Step 7.6: Update all three `<input>` styles**

Each input currently has `border: '2px solid #e5e7eb'`. Replace all three with:
```tsx
style={{
  width: '100%',
  padding: '0.75rem',
  border: '1.5px solid var(--gg-border)',
  borderRadius: 'var(--gg-radius-md)',
  fontSize: '16px',
  fontFamily: "'Lato', sans-serif",
  background: 'var(--gg-cream)',
  color: 'var(--gg-espresso)',
  boxSizing: 'border-box' as const,
  outline: 'none',
  minHeight: '48px',
}}
```

- [ ] **Step 7.7: Add focus handlers to inputs**

For each `<input>`, add `onFocus` and `onBlur` handlers. Add state for focused input:

After `const [error, setError] = useState('');` add:
```tsx
const [focusedInput, setFocusedInput] = useState<string | null>(null);
```

Then for each input element, add:
- `onFocus={() => setFocusedInput('fieldname')}` (use 'fullname', 'email', 'password')
- `onBlur={() => setFocusedInput(null)}`
- Dynamic style for border/shadow:
```tsx
border: focusedInput === 'email' ? '1.5px solid var(--gg-tomato)' : '1.5px solid var(--gg-border)',
boxShadow: focusedInput === 'email' ? '0 0 0 3px var(--gg-tomato-subtle)' : 'none',
```

- [ ] **Step 7.8: Replace error banner (around line 178-187)**

Find:
```tsx
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
```
Replace:
```tsx
          <div style={{
            background: 'var(--gg-red-light)',
            color: 'var(--gg-red)',
```

- [ ] **Step 7.9: Replace the sign-in/sign-up submit button with AttractButton**

Remove the existing `<button type="submit" ...>` block (lines 190-207) and replace with:
```tsx
          <AttractButton
            type="submit"
            disabled={loading}
            loading={loading}
            style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
          >
            {isSignUp ? t('auth.signUp') : t('auth.signIn')}
          </AttractButton>
```

- [ ] **Step 7.10: Update the toggle link button (around line 209-226)**

Find:
```tsx
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              color: '#6b7280',
              border: 'none',
```
Replace:
```tsx
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              color: 'var(--gg-tomato)',
              border: 'none',
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              textDecoration: 'underline',
```

- [ ] **Step 7.11: Add mobile overrides at end of component (inside the outer div)**

The card already adapts via maxWidth. For mobile, override padding via media query through a className — add `className="auth-card"` to the inner card div, then add to `index.css`:
```css
@media (max-width: 480px) {
  .auth-card {
    padding: 1.5rem !important;
    border-radius: var(--gg-radius-lg) !important;
  }
}
```

- [ ] **Step 7.12: Commit**

```bash
git add frontend/src/components/Auth.tsx frontend/src/index.css
git commit -m "feat: redesign Auth page with Bright Kitchen parchment/cream theme"
```

---

## Task 8 — AttractButton.tsx: Full rewrite

**Files:**
- Modify: `frontend/src/components/AttractButton.tsx`

The current implementation uses an orange/amber gradient. Replace the entire file.

- [ ] **Step 8.1: Replace the entire file with the GG-adapted implementation**

```tsx
/**
 * AttractButton — GroceryGenius adaptation of kokonutui.com attract button
 * Tomato palette, parchment particles, LogIn icon.
 * Used ONLY on the Auth sign-in button.
 */
import { LogIn } from 'lucide-react';
import { motion, useAnimation } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

interface AttractButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  particleCount?: number;
  loading?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
}

export default function AttractButton({
  particleCount = 14,
  loading,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AttractButtonProps) {
  const [isAttracting, setIsAttracting] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const controls = useAnimation();

  useEffect(() => {
    setParticles(
      Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 280 - 140,
        y: Math.random() * 80 - 40,
      }))
    );
  }, [particleCount]);

  const handleEnter = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      setIsAttracting(true);
      await controls.start({
        x: 0,
        y: 0,
        opacity: 0.9,
        transition: { type: 'spring', stiffness: 55, damping: 11 },
      });
      onMouseEnter?.(e);
    },
    [controls, disabled, loading, onMouseEnter]
  );

  const handleLeave = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsAttracting(false);
      await controls.start((i: number) => ({
        x: particles[i]?.x ?? 0,
        y: particles[i]?.y ?? 0,
        opacity: 0.45,
        transition: { type: 'spring', stiffness: 90, damping: 14 },
      }));
      onMouseLeave?.(e);
    },
    [controls, particles, onMouseLeave]
  );

  const handleTouchStart = useCallback(
    async (e: React.TouchEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      setIsAttracting(true);
      await controls.start({
        x: 0, y: 0, opacity: 0.9,
        transition: { type: 'spring', stiffness: 55, damping: 11 },
      });
    },
    [controls, disabled, loading]
  );

  const handleTouchEnd = useCallback(async () => {
    setIsAttracting(false);
    await controls.start((i: number) => ({
      x: particles[i]?.x ?? 0,
      y: particles[i]?.y ?? 0,
      opacity: 0.45,
      transition: { type: 'spring', stiffness: 90, damping: 14 },
    }));
  }, [controls, particles]);

  const isDisabled = disabled || loading;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Parchment particles — visible against tomato background */}
      {particles.map((p, i) => (
        <motion.div
          key={p.id}
          custom={i}
          animate={controls}
          initial={{ x: p.x, y: p.y, opacity: 0.45 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 7,
            height: 7,
            marginTop: -3.5,
            marginLeft: -3.5,
            borderRadius: '50%',
            background: '#fdf6ec',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}

      <button
        disabled={isDisabled}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          padding: '0.85rem 1.5rem',
          background: isDisabled
            ? 'var(--gg-taupe)'
            : isAttracting
            ? 'var(--gg-tomato-hover)'
            : 'var(--gg-tomato)',
          color: 'white',
          border: '1.5px solid var(--gg-tomato-hover)',
          borderRadius: 'var(--gg-radius-md)',
          fontWeight: 600,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1rem',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          boxShadow: isAttracting && !isDisabled
            ? '0 4px 16px rgba(232, 57, 26, 0.4)'
            : '0 2px 8px rgba(232, 57, 26, 0.25)',
          transform: isAttracting ? 'scale(0.98)' : 'scale(1)',
          letterSpacing: '0.02em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <>
            <span style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.35)',
              borderTopColor: 'white',
              animation: 'attractBtn-spin 0.75s linear infinite',
            }} />
            {children}
          </>
        ) : (
          <>
            <LogIn size={16} />
            {children ?? 'Sign In'}
          </>
        )}
      </button>

      <style>{`
        @keyframes attractBtn-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
git add frontend/src/components/AttractButton.tsx
git commit -m "feat: redesign AttractButton with Bright Kitchen tomato palette"
```

---

## Task 9 — ParticleButton.tsx: Full rewrite

**Files:**
- Modify: `frontend/src/components/ParticleButton.tsx`

- [ ] **Step 9.1: Replace the entire file**

```tsx
/**
 * ParticleButton — GroceryGenius adaptation
 * Tomato/forest/amber particles, Sparkles icon.
 * Wraps: Generate Recipes, Add to Meal Plan, Save to Pantry.
 */
import { Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';

const GG_PARTICLES = ['#e8391a', '#2d6a4f', '#e8962a', '#eddecb', '#c42f14'];

interface ParticleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  successDuration?: number;
  variant?: 'primary' | 'outline';
  hideIcon?: boolean;
}

function SuccessParticles({ buttonRef }: { buttonRef: React.RefObject<HTMLButtonElement> }) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return (
    <AnimatePresence>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: [0, 1.2, 0],
            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 60 + 20)],
            y: [0, -Math.random() * 60 - 20],
            opacity: [1, 1, 0],
          }}
          style={{
            position: 'fixed',
            width: 6,
            height: 6,
            borderRadius: '50%',
            left: centerX,
            top: centerY,
            background: GG_PARTICLES[i % GG_PARTICLES.length],
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          initial={{ scale: 0, x: 0, y: 0 }}
          transition={{
            duration: 0.65,
            delay: i * 0.07,
            ease: 'easeOut',
          }}
        />
      ))}
    </AnimatePresence>
  );
}

export default function ParticleButton({
  children,
  onClick,
  successDuration = 900,
  variant = 'primary',
  hideIcon = false,
  style,
  disabled,
  ...props
}: ParticleButtonProps) {
  const [showParticles, setShowParticles] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), successDuration);
    onClick?.(e);
  };

  const isPrimary = variant === 'primary';

  return (
    <>
      {showParticles && <SuccessParticles buttonRef={buttonRef} />}
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.65rem 1.5rem',
          borderRadius: 'var(--gg-radius-md)',
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 600,
          fontSize: '0.925rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          transform: showParticles ? 'scale(0.96)' : 'scale(1)',
          border: isPrimary ? 'none' : '1.5px solid var(--gg-tomato)',
          background: disabled
            ? 'var(--gg-taupe)'
            : isPrimary
            ? showParticles ? 'var(--gg-tomato-hover)' : 'var(--gg-tomato)'
            : 'transparent',
          color: isPrimary ? '#ffffff' : 'var(--gg-tomato)',
          boxShadow: isPrimary && !disabled && !showParticles
            ? '0 2px 8px rgba(232, 57, 26, 0.30)'
            : 'none',
          ...style,
        }}
        {...props}
      >
        {children}
        {!hideIcon && <Sparkles size={15} style={{ flexShrink: 0 }} />}
      </button>
    </>
  );
}
```

- [ ] **Step 9.2: Commit**

```bash
git add frontend/src/components/ParticleButton.tsx
git commit -m "feat: redesign ParticleButton with GG tomato/forest/amber particles"
```

---

## Task 10 — SmoothTab.tsx: Full rewrite

**Files:**
- Modify: `frontend/src/components/SmoothTab.tsx`

The current SmoothTab takes `tabs`, `activeTab`, `onChange`, `isMobile` props. The reference replaces it with a self-contained animated version. Since SmoothTab is not imported anywhere in App.tsx (it exists but is not wired up), this rewrite is safe.

- [ ] **Step 10.1: Replace the entire file with the GG-adapted implementation**

Replace the complete file contents with the implementation from `references/smooth-tab-adapted.md` — the exact TSX block starting with `"use client";`. The file has already been reviewed and is GG-adapted (espresso pill, cream toolbar, GG waveform, desktop-only class). No changes needed to the reference code.

> Full implementation is in `.claude/skills/grocerygenius-ui/references/smooth-tab-adapted.md`. Copy the TSX block (lines 23–463 of that file) verbatim as the new `SmoothTab.tsx` content.

- [ ] **Step 10.2: Commit**

```bash
git add frontend/src/components/SmoothTab.tsx
git commit -m "feat: rewrite SmoothTab with espresso pill and Bright Kitchen waveforms"
```

---

## Task 11 — RecipeCard.tsx: Color and typography update

**Files:**
- Modify: `frontend/src/components/RecipeCard.tsx`

- [ ] **Step 11.1: Update `getRatingColor` function (lines 104-109)**

Find:
```tsx
  const getRatingColor = (rating: string): string => {
    if (rating.startsWith('A')) return '#10b981';
    if (rating.startsWith('B')) return '#3b82f6';
    if (rating.startsWith('C')) return '#f59e0b';
    return '#ef4444';
  };
```
Replace:
```tsx
  const getRatingColor = (rating: string): string => {
    if (rating.startsWith('A')) return 'var(--gg-forest)';
    if (rating.startsWith('B')) return 'var(--gg-forest)';
    if (rating.startsWith('C')) return 'var(--gg-amber)';
    return 'var(--gg-red)';
  };
```

- [ ] **Step 11.2: Update card outer container style (lines 136-145)**

Find:
```tsx
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      marginBottom: '1rem',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}>
```
Replace:
```tsx
    <div style={{
      background: 'var(--gg-cream)',
      borderRadius: 'var(--gg-radius-lg)',
      padding: '1.5rem',
      boxShadow: 'var(--gg-shadow-sm)',
      marginBottom: '1rem',
      border: '1.5px solid var(--gg-border)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    }}>
```

- [ ] **Step 11.3: Update recipe name h3 (lines 147-157)**

Find:
```tsx
        <h3 style={{
          margin: '0',
          color: '#1f2937',
          fontSize: '1.25rem',
          fontWeight: '700',
          lineHeight: '1.4',
          flex: 1,
          paddingRight: '1rem'
        }}>
```
Replace:
```tsx
        <h3 style={{
          margin: '0',
          color: 'var(--gg-espresso)',
          fontSize: '1.3rem',
          fontWeight: 800,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          lineHeight: '1.3',
          letterSpacing: '-0.5px',
          flex: 1,
          paddingRight: '1rem'
        }}>
```

- [ ] **Step 11.4: Update health rating badge border-radius**

Find: `borderRadius: '12px',` (in the rating badge div)
Replace: `borderRadius: 'var(--gg-radius-md)',`

Find: `color: '#6b7280',` (Health Grade label)
Replace: `color: 'var(--gg-taupe)',`

- [ ] **Step 11.5: Update metadata color**

Find all occurrences of `color: '#6b7280'` in the component → replace with `color: 'var(--gg-taupe)'`

- [ ] **Step 11.6: Update difficulty badge backgrounds**

Find:
```tsx
            background: recipe.difficulty.toLowerCase().includes('easy') ? '#dcfce7' :
                       recipe.difficulty.toLowerCase().includes('medium') ? '#fef3c7' :
                       recipe.difficulty.toLowerCase().includes('hard') ? '#fee2e2' : '#e0e7ff',
            color: recipe.difficulty.toLowerCase().includes('easy') ? '#166534' :
                   recipe.difficulty.toLowerCase().includes('medium') ? '#92400e' :
                   recipe.difficulty.toLowerCase().includes('hard') ? '#dc2626' : '#3730a3'
```
Replace:
```tsx
            background: recipe.difficulty.toLowerCase().includes('easy') ? 'var(--gg-forest-light)' :
                       recipe.difficulty.toLowerCase().includes('medium') ? 'var(--gg-amber-light)' :
                       'var(--gg-red-light)',
            color: recipe.difficulty.toLowerCase().includes('easy') ? 'var(--gg-forest)' :
                   recipe.difficulty.toLowerCase().includes('medium') ? 'var(--gg-amber-hover)' :
                   'var(--gg-red)',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 600,
```

- [ ] **Step 11.7: Update nutrition section (lines 234-272)**

Find:
```tsx
          background: '#f8fafc',
          ...
          border: '1px solid #e2e8f0'
```
Replace: `background: 'var(--gg-parchment)',` and `border: '1px solid var(--gg-border)',`

Find the nutrition section heading:
```tsx
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
```
Replace:
```tsx
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gg-taupe)', fontFamily: "'Bricolage Grotesque', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
```

Update the six nutrition value colors:
- `color: '#059669'` (calories) → `color: 'var(--gg-forest)'`
- `color: '#7c3aed'` (protein) → `color: 'var(--gg-espresso)'`
- `color: '#dc2626'` (carbs) → `color: 'var(--gg-espresso)'`
- `color: '#f59e0b'` (fat) → `color: 'var(--gg-amber)'`
- `color: '#10b981'` (fiber) → `color: 'var(--gg-forest)'`
- `color: '#ef4444'` (sodium) → `color: 'var(--gg-red)'`

All nutrition labels `color: '#6b7280'` → `color: 'var(--gg-taupe)'`

- [ ] **Step 11.8: Update health benefits section (lines 274-289)**

Find:
```tsx
          background: '#f0fdf4',
          ...
          border: '1px solid #bbf7d0'
```
Replace: `background: 'var(--gg-forest-light)',` and `border: '1px solid var(--gg-border)',`

Find:
```tsx
            color: '#166534'
            color: '#047857'
```
Replace both with `color: 'var(--gg-forest)'`

- [ ] **Step 11.9: Update budget tip section (lines 291-306)**

Find:
```tsx
          background: '#fef3c7',
          ...
          border: '1px solid #fbbf24'
```
Replace: `background: 'var(--gg-amber-light)',` and `border: '1px solid var(--gg-border)',`

Find: `color: '#92400e'` and `color: '#a16207'`
Replace both with `color: 'var(--gg-amber-hover)'`

- [ ] **Step 11.10: Update instruction preview section (lines 308-326)**

Find:
```tsx
        background: '#fafafa',
        ...
        border: '1px solid #e5e7eb'
```
Replace: `background: 'var(--gg-parchment)',` and `border: '1px solid var(--gg-border)',`

Find: `color: '#374151'` (heading) → `color: 'var(--gg-espresso)'`
Find: `color: '#4b5563'` (body) → `color: 'var(--gg-taupe)'`

- [ ] **Step 11.11: Update "click for full recipe" banner (lines 328-343)**

Find:
```tsx
        color: '#10b981',
        ...
        background: '#f0fdf4',
        border: '1px solid #bbf7d0'
```
Replace:
```tsx
        color: 'var(--gg-tomato)',
        ...
        background: 'var(--gg-tomato-subtle)',
        border: '1.5px solid var(--gg-tomato)',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 600,
```

- [ ] **Step 11.12: Commit**

```bash
git add frontend/src/components/RecipeCard.tsx
git commit -m "feat: apply Bright Kitchen palette to RecipeCard"
```

---

## Task 12 — RecipeList.tsx: Heading + generate button

**Files:**
- Modify: `frontend/src/components/RecipeList.tsx`

The component is very simple (it just renders recipe cards in a list). Update the container and clear button style, and import ParticleButton for the Clear button.

- [ ] **Step 12.1: Import ParticleButton**

Add at top: `import ParticleButton from './ParticleButton';`

- [ ] **Step 12.2: Update container and button styles**

Find:
```tsx
  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={onClear} style={{ padding: "6px 10px" }}>{t('recipes.clearRecipes')}</button>
      </div>
      {recipes.map((r, idx) => (
        <div key={idx} style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          backgroundColor: "#fafafa"
        }}>
          <h3 style={{ margin: "0 0 8px 0" }}>{idx + 1}. {r.name}</h3>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{r.instructions}</pre>
        </div>
      ))}
    </div>
  );
```
Replace:
```tsx
  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ marginBottom: 8 }}>
        <ParticleButton variant="outline" onClick={onClear} hideIcon>
          {t('recipes.clearRecipes')}
        </ParticleButton>
      </div>
      {recipes.map((r, idx) => (
        <div key={idx} style={{
          border: "1.5px solid var(--gg-border)",
          borderRadius: 'var(--gg-radius-lg)',
          padding: 16,
          marginBottom: 12,
          backgroundColor: "var(--gg-cream)",
          boxShadow: 'var(--gg-shadow-sm)',
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, color: 'var(--gg-espresso)', letterSpacing: '-0.3px' }}>{idx + 1}. {r.name}</h3>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "'Lato', sans-serif", color: 'var(--gg-taupe)', fontSize: '0.9rem' }}>{r.instructions}</pre>
        </div>
      ))}
    </div>
  );
```

- [ ] **Step 12.3: Commit**

```bash
git add frontend/src/components/RecipeList.tsx
git commit -m "feat: apply Bright Kitchen styles to RecipeList"
```

---

## Task 13 — IngredientInput.tsx: Tags + input + submit

**Files:**
- Modify: `frontend/src/components/IngredientInput.tsx`

- [ ] **Step 13.1: Import ParticleButton**

```tsx
import ParticleButton from './ParticleButton';
```

- [ ] **Step 13.2: Update ingredient tag styles (lines 33-46)**

Find:
```tsx
              background: 'linear-gradient(45deg, #10b981, #059669)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
```
Replace:
```tsx
              background: 'linear-gradient(135deg, var(--gg-tomato), var(--gg-tomato-hover))',
              color: 'white',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--gg-radius-xl)',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 600,
              fontSize: '0.875rem',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
```

- [ ] **Step 13.3: Update input field style (lines 66-79)**

Find:
```tsx
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          fontSize: '1rem',
```
Replace:
```tsx
          border: '1.5px solid var(--gg-border)',
          borderRadius: 'var(--gg-radius-md)',
          fontSize: '16px',
          fontFamily: "'Lato', sans-serif",
          background: 'var(--gg-cream)',
          color: 'var(--gg-espresso)',
```

- [ ] **Step 13.4: Replace submit button with ParticleButton (lines 84-99)**

Find:
```tsx
      <button
        onClick={onSubmit}
        disabled={loading || tags.length === 0}
        style={{
          background: loading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)',
          ...
        }}
      >
        {loading ? t('recipes.generating') : t('recipes.getRecipes')}
      </button>
```
Replace:
```tsx
      <ParticleButton
        onClick={onSubmit}
        disabled={loading || tags.length === 0}
        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 2rem' }}
      >
        {loading ? t('recipes.generating') : t('recipes.getRecipes')}
      </ParticleButton>
```

- [ ] **Step 13.5: Commit**

```bash
git add frontend/src/components/IngredientInput.tsx
git commit -m "feat: apply Bright Kitchen to IngredientInput tags and buttons"
```

---

## Task 14 — IngredientSubstitution.tsx: Card styles

**Files:**
- Modify: `frontend/src/components/IngredientSubstitution.tsx`

The substitution component has a large inline substitution database. Only the visual styles need updating — the data logic is untouched.

- [ ] **Step 14.1: Search and replace color values in the component's JSX**

Run:
```bash
grep -n "#10b981\|#059669\|#e5e7eb\|#f8fafc\|#6b7280\|#f3f4f6\|#1f2937\|#374151\|#9ca3af\|white\|#ffffff" frontend/src/components/IngredientSubstitution.tsx
```

For each hit in JSX styling context, apply these replacements:
- `background: '#f8fafc'` or `'#f3f4f6'` or `'white'` or `'#ffffff'` → `'var(--gg-cream)'`
- `border: '1px solid #e5e7eb'` → `border: '1.5px solid var(--gg-border)'`
- `color: '#6b7280'` or `'#9ca3af'` → `'var(--gg-taupe)'`
- `color: '#1f2937'` or `'#374151'` → `'var(--gg-espresso)'`
- `color: '#10b981'` or `'#059669'` → `'var(--gg-forest)'`
- `borderRadius: '8px'` or `'12px'` → `'var(--gg-radius-md)'` (or `--gg-radius-lg` for larger cards)

Update any heading `<h3>` or `<h4>` to use: `fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700`

- [ ] **Step 14.2: Commit**

```bash
git add frontend/src/components/IngredientSubstitution.tsx
git commit -m "feat: apply Bright Kitchen palette to IngredientSubstitution"
```

---

## Task 15 — MealPlanCalendar.tsx: Calendar colors

**Files:**
- Modify: `frontend/src/components/MealPlanCalendar.tsx`

The calendar is large. Use targeted search-and-replace for colors.

- [ ] **Step 15.1: Run color audit on MealPlanCalendar**

```bash
grep -n "#10b981\|#059669\|#667eea\|#764ba2\|#f59e0b\|#ef4444\|white\|#ffffff\|#e5e7eb\|#f8fafc\|#1f2937\|#6b7280\|#9ca3af\|#374151" frontend/src/components/MealPlanCalendar.tsx
```

- [ ] **Step 15.2: Replace color tokens throughout**

Apply all of these replacements (use replace_all where patterns are uniform):
- `'#10b981'` / `'#059669'` → `'var(--gg-forest)'` (in non-primary contexts like health grades, success)
- `'#f0fdf4'` (light green bg) → `'var(--gg-forest-light)'`
- `'#bbf7d0'` (green border) → `'var(--gg-border)'`
- `'#e5e7eb'` → `'var(--gg-border)'`
- `'#f8fafc'` / `'#ffffff'` (card/cell bg) → `'var(--gg-cream)'`
- `'#1f2937'` / `'#374151'` → `'var(--gg-espresso)'`
- `'#6b7280'` / `'#9ca3af'` → `'var(--gg-taupe)'`
- `'#ef4444'` / `'#dc2626'` → `'var(--gg-red)'`
- `'linear-gradient(45deg, #10b981, #059669)'` → `'var(--gg-tomato)'` (primary action buttons)
- Today highlight: find `border: '2px solid #10b981'` or similar → `border: '2px solid var(--gg-tomato)', background: 'var(--gg-tomato-subtle)'`
- Add/meal slot buttons: background `#10b981` → `'var(--gg-tomato)'`
- Drag-over state (if present): `border: '2px dashed #10b981'` → `border: '2px dashed var(--gg-tomato)'`

- [ ] **Step 15.3: Update month/day headers to use Bricolage Grotesque**

Find heading elements (h2, h3, any elements styled as month/day headers) and add `fontFamily: "'Bricolage Grotesque', sans-serif"` with appropriate weights.

- [ ] **Step 15.4: Verify touch drag-and-drop still works**

The existing touch drag-and-drop implementation should not be changed — only visual state colors need updating.

- [ ] **Step 15.5: Commit**

```bash
git add frontend/src/components/MealPlanCalendar.tsx
git commit -m "feat: apply Bright Kitchen palette to MealPlanCalendar"
```

---

## Task 16 — Toast.tsx: Gradient updates

**Files:**
- Modify: `frontend/src/components/Toast.tsx`

- [ ] **Step 16.1: Replace all four gradient cases**

Find:
```tsx
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          icon: '✅'
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          icon: '❌'
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          icon: '⚠️'
        };
      case 'info':
        return {
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          icon: 'ℹ️'
        };
    }
  };
```
Replace:
```tsx
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, var(--gg-forest) 0%, var(--gg-forest-hover) 100%)',
          icon: '✅'
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, var(--gg-red) 0%, var(--gg-red-hover) 100%)',
          icon: '❌'
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, var(--gg-amber) 0%, var(--gg-amber-hover) 100%)',
          icon: '⚠️'
        };
      case 'info':
        return {
          background: 'linear-gradient(135deg, var(--gg-espresso) 0%, #3a2a1a 100%)',
          icon: 'ℹ️'
        };
    }
  };
```

- [ ] **Step 16.2: Update the toast container style**

Find:
```tsx
      style={{
        ...
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
```
Replace:
```tsx
      style={{
        ...
        borderRadius: 'var(--gg-radius-lg)',
        boxShadow: 'var(--gg-shadow-lg)',
```

- [ ] **Step 16.3: Update title font**

The title div:
```tsx
        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
```
Replace:
```tsx
        <div style={{ fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif", marginBottom: '0.25rem' }}>
```

The body div (message):
```tsx
        <div style={{ fontSize: '0.875rem', opacity: 0.95 }}>
```
Replace:
```tsx
        <div style={{ fontSize: '0.875rem', fontFamily: "'Lato', sans-serif", opacity: 0.9 }}>
```

- [ ] **Step 16.4: Add mobile override to index.css**

```css
@media (max-width: 768px) {
  .gg-toast {
    left: 12px !important;
    right: 12px !important;
    bottom: 16px !important;
    max-width: calc(100vw - 24px) !important;
    min-width: unset !important;
  }
}
```

Add `className="gg-toast"` to the toast outer div.

- [ ] **Step 16.5: Commit**

```bash
git add frontend/src/components/Toast.tsx frontend/src/index.css
git commit -m "feat: apply Bright Kitchen gradients and fonts to Toast"
```

---

## Task 17 — FavoriteHeartButton.tsx: Color updates

**Files:**
- Modify: `frontend/src/components/FavoriteHeartButton.tsx`

- [ ] **Step 17.1: Update filled heart color**

Find: `fill: isFavorited ? '#EF3340' : 'transparent',`
Replace: `fill: isFavorited ? 'var(--gg-tomato)' : 'transparent',`

- [ ] **Step 17.2: Update outline heart color**

Find: `fill: isFavorited ? '#EF3340' : '#9ca3af',`
Replace: `fill: isFavorited ? 'var(--gg-tomato)' : 'var(--gg-border-strong)',`

- [ ] **Step 17.3: Commit**

```bash
git add frontend/src/components/FavoriteHeartButton.tsx
git commit -m "feat: update FavoriteHeartButton to tomato heart color"
```

---

## Task 18 — SlideTextButton.tsx: Espresso/tomato slide

**Files:**
- Modify: `frontend/src/components/SlideTextButton.tsx`

The SlideTextButton currently has no color styling at all (transparent background, no border). It receives styling from its callers. Update the component to apply Bright Kitchen defaults.

- [ ] **Step 18.1: Update the button style defaults**

Find the `<button` element's style:
```tsx
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
        ...buttonStyle,
        ...style,
      }}
```
Replace:
```tsx
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid var(--gg-espresso)',
        borderRadius: 'var(--gg-radius-md)',
        cursor: 'pointer',
        color: isHovered ? '#ffffff' : 'var(--gg-espresso)',
        background: isHovered ? 'var(--gg-tomato)' : 'transparent',
        transition: 'color 0.28s, background 0.28s',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 600,
        letterSpacing: '0.5px',
        ...buttonStyle,
        ...style,
      }}
```

- [ ] **Step 18.2: Commit**

```bash
git add frontend/src/components/SlideTextButton.tsx
git commit -m "feat: apply espresso/tomato slide effect to SlideTextButton"
```

---

## Task 19 — MouseEffectCard.tsx: Brand dot + card style

**Files:**
- Modify: `frontend/src/components/MouseEffectCard.tsx`

- [ ] **Step 19.1: Update DOT_COLOR constant**

Find: `const DOT_COLOR = '#e8a830';`
Replace: `const DOT_COLOR = 'rgba(232, 57, 26, 0.35)';`
(Tomato at 35% opacity — visible on cream but not overwhelming)

- [ ] **Step 19.2: Disable mouse effect on mobile**

In the `MouseEffectCard` component, add mobile detection and conditionally render dots:

After the existing `const [dots, setDots] = useState<Dot[]>([]);`, add:
```tsx
  const [isMobileDevice] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  );
```

In the return JSX, wrap the dot rendering:
```tsx
      {!isMobileDevice && dots.map((dot, i) => (
        <DotComponent ... />
      ))}
```

And disable mouse tracking on mobile:
```tsx
      onMouseMove={isMobileDevice ? undefined : (e) => { ... }}
      onMouseLeave={isMobileDevice ? undefined : () => { mouseX.set(Infinity); mouseY.set(Infinity); }}
```

- [ ] **Step 19.3: Update default card style in callers**

MouseEffectCard receives `style` from parent. The component itself wraps whatever style is passed in. Check for any caller that uses it (currently none in App.tsx — it exists as a standalone component). Update the component's default style fallback:

In the outer `<div>` style:
```tsx
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--gg-cream)',
        border: '1.5px solid var(--gg-border)',
        borderRadius: 'var(--gg-radius-lg)',
        boxShadow: 'var(--gg-shadow-sm)',
        ...style
      }}
```

- [ ] **Step 19.4: Commit**

```bash
git add frontend/src/components/MouseEffectCard.tsx
git commit -m "feat: apply Bright Kitchen colors to MouseEffectCard, disable on mobile"
```

---

## Task 20 — LanguageSwitcher.tsx: Trigger and dropdown

**Files:**
- Modify: `frontend/src/components/LanguageSwitcher.tsx`

- [ ] **Step 20.1: Update trigger button style**

Find:
```tsx
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          ...
          fontWeight: '600',
```
Replace:
```tsx
          background: 'var(--gg-cream)',
          border: '1px solid var(--gg-border)',
          borderRadius: 'var(--gg-radius-md)',
          ...
          fontWeight: '700',
          fontFamily: "'Lato', sans-serif",
          color: 'var(--gg-espresso)',
```

- [ ] **Step 20.2: Read and update the dropdown list styles**

Read the rest of `LanguageSwitcher.tsx` past line 60 to see the dropdown JSX, then:
- Dropdown container: `background: 'var(--gg-cream)'`, `border: '1px solid var(--gg-border)'`, `boxShadow: 'var(--gg-shadow-md)'`, `borderRadius: 'var(--gg-radius-md)'`
- Hover item: `background: 'var(--gg-parchment)'`
- Active/selected language: `color: 'var(--gg-tomato)'`, `fontFamily: "'Bricolage Grotesque', sans-serif"`, `fontWeight: 600`

- [ ] **Step 20.3: Commit**

```bash
git add frontend/src/components/LanguageSwitcher.tsx
git commit -m "feat: apply Bright Kitchen palette to LanguageSwitcher"
```

---

## Task 21 — Final Verification

- [ ] **Step 21.1: Run the verification grep**

```bash
grep -rn "#10b981\|#059669\|#ED8B00\|#f59e0b\|#667eea\|#764ba2\|BlinkMacSystemFont\|'Segoe UI'\|Roboto\b" frontend/src/
```

Expected: **zero results** (or only results in comments/strings not used in styles).

If any results remain, fix them:
- Green (`#10b981`, `#059659`) → `var(--gg-forest)` or `var(--gg-tomato)` per context
- Amber (`#ED8B00`, `#f59e0b`) → `var(--gg-amber)`
- Purple (`#667eea`, `#764ba2`) → `var(--gg-parchment)` background or remove
- System fonts → `'Bricolage Grotesque', sans-serif` or `'Lato', sans-serif`

- [ ] **Step 21.2: Run extended color audit for remaining stragglers**

```bash
grep -rn "#8b5cf6\|#6366f1\|#7c3aed\|#3730a3\|#6b7280\|#9ca3af\|#e5e7eb\|#1f2937\|#374151\|rgba(16.*185.*129\|rgba(237.*139.*0" frontend/src/
```

Replace each hit using the mapping table from Task 2.

- [ ] **Step 21.3: Visual checklist**

Confirm each of these by running the dev server (`cd frontend && npm run dev`):

- [ ] Auth page: parchment background (not purple), cream card, espresso logo, AttractButton with tomato color
- [ ] Mobile drawer: espresso background (not white), tomato active-tab left border
- [ ] Mobile FAB: tomato color (not green)
- [ ] Header: espresso background, white logo text
- [ ] RecipeCard: cream card, Bricolage Grotesque 800 recipe name, forest/amber/red grade colors
- [ ] Ingredient tags: tomato gradient
- [ ] Toast success: forest gradient (not green)
- [ ] SmoothTab: visible on desktop with espresso sliding pill, hidden on mobile
- [ ] FavoriteHeartButton: tomato fill (not `#EF3340`)
- [ ] At 375px width: no horizontal overflow, input font-size ≥ 16px, touch targets ≥ 44px

- [ ] **Step 21.4: Final commit**

```bash
git add -A
git commit -m "feat: complete Bright Kitchen UI redesign — Tomato & Parchment palette, Bricolage Grotesque + Lato fonts"
```

---

## Self-Review

**Spec coverage check:**

| Skill requirement | Task that implements it |
|---|---|
| CSS variables in index.css | Task 2 |
| Google Fonts in index.html | Task 3 |
| Remove purple gradient | Tasks 3 + 7 |
| Espresso sidebar/header | Tasks 5 + 6 |
| Mobile drawer espresso bg | Task 5 |
| Mobile FAB tomato color | Task 5 |
| Auth parchment page | Task 7 |
| AttractButton on sign-in | Tasks 7 + 8 |
| ParticleButton on Generate | Tasks 9 + 13 |
| RecipeCard redesign | Task 11 |
| RecipeList styling | Task 12 |
| IngredientInput tags | Task 13 |
| IngredientSubstitution | Task 14 |
| MealPlanCalendar | Task 15 |
| Toast gradients | Task 16 |
| FavoriteHeartButton tomato | Task 17 |
| SlideTextButton espresso/tomato | Task 18 |
| MouseEffectCard brand dot | Task 19 |
| LanguageSwitcher | Task 20 |
| SmoothTab desktop-only | Tasks 2 + 10 |
| Verification grep passes | Task 21 |

**Placeholder scan:** All steps contain actual code. No "TBD" or vague instructions.

**Critical adaptations documented:**
1. `@/lib/utils` does NOT exist in this project — all `cn()` calls from references are replaced with inline `style={}` props
2. `lucide-react` is NOT in package.json — Task 1 installs it before it is used
3. SmoothTab has a different existing API — reference version replaces it entirely (safe: not used in App.tsx)
4. `motion/react` is available (installed transitively even though not in package.json)
