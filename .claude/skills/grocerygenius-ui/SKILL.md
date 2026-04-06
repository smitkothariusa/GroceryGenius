---
name: grocerygenius-ui
description: DORMANT — future redesign plan for GroceryGenius using the Bright Kitchen design system. Do NOT invoke for routine UI changes. Only invoke if the user explicitly says they are ready to implement the full Bright Kitchen redesign.
---

# GroceryGenius UI Redesign Skill

> **⚠️ DORMANT — NOT IMPLEMENTED**
>
> The Bright Kitchen design system described below is a **future redesign plan** that has never been applied to the live app.
>
> **The actual live app uses:**
> - Background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` (purple-blue gradient)
> - Cards: `rgba(255, 255, 255, 0.95)` white
> - Font: `system-ui, -apple-system, sans-serif`
> - Accent: `#8b5cf6` (purple), `#10b981` / `#059669` (green CTA), `#ef4444` (red/error)
>
> **Do not apply any Bright Kitchen styles (CSS variables, Bricolage Grotesque, tomato/parchment palette) unless the user explicitly says they want the full redesign.**
>
> For routine UI work, match the live app's existing hex colors and `system-ui` font stack.

---

When the user explicitly asks to begin the Bright Kitchen redesign, work through the checklist below in order. For each component: implement desktop styles, then immediately handle mobile overrides.

---

## The Brand in One Sentence

GroceryGenius is a smart grocery and meal planning app that feels like a beloved, dog-eared cookbook crossed with a modern food startup: warm, food-credible, confident, and genuinely useful.

---

## Design System

### Color Palette — Tomato & Parchment

Set these CSS custom properties in `frontend/src/index.css`. They are the single source of truth — every component uses them via `var(--gg-*)`.

```css
:root {
  /* Primary */
  --gg-tomato:        #e8391a;
  --gg-tomato-hover:  #c42f14;
  --gg-tomato-subtle: rgba(232, 57, 26, 0.08);

  /* Backgrounds */
  --gg-parchment:     #fdf6ec;
  --gg-cream:         #fff8f0;

  /* Text */
  --gg-espresso:      #1c1208;
  --gg-taupe:         #7a6652;

  /* Borders */
  --gg-border:        #eddecb;
  --gg-border-strong: #d4b896;

  /* Semantic */
  --gg-forest:        #2d6a4f;
  --gg-forest-light:  #e8f5ee;
  --gg-amber:         #e8962a;
  --gg-amber-light:   #fef3dc;
  --gg-red:           #c0392b;
  --gg-red-light:     #fde8e6;

  /* Depth */
  --gg-radius-sm:  6px;
  --gg-radius-md:  10px;
  --gg-radius-lg:  14px;
  --gg-radius-xl:  20px;
  --gg-shadow-sm:  0 2px 8px rgba(28, 18, 8, 0.06);
  --gg-shadow-md:  0 4px 16px rgba(28, 18, 8, 0.10);
  --gg-shadow-lg:  0 8px 32px rgba(28, 18, 8, 0.14);
}
```

**Replace all occurrences of these old values** with the tokens above:

| Old value | Replace with |
|---|---|
| `#10b981`, `#059669` | `var(--gg-forest)` or `var(--gg-tomato)` depending on context |
| `#ED8B00`, `#f59e0b`, `#d97706` | `var(--gg-amber)` |
| `#667eea`, `#764ba2`, purple gradients | `var(--gg-parchment)` background |
| `rgba(16, 185, 129, ...)` | equivalent with `--gg-tomato` or `--gg-forest` |
| `#EF3340`, `#ef4444` | `var(--gg-tomato)` (heart/favorite) or `var(--gg-red)` (error) |
| `#3b82f6`, `#2563eb` (info blue) | `var(--gg-espresso)` for info toasts |

### Typography

**Add to `frontend/index.html` `<head>`:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Lato:wght@400;700&display=swap" rel="stylesheet">
```

| Role | Font | Weight | Use |
|---|---|---|---|
| Display | Bricolage Grotesque | 800 | Page titles, recipe names, hero text |
| Heading | Bricolage Grotesque | 700 | Card titles, section headers, nav items |
| UI label | Bricolage Grotesque | 600 | Buttons, badges, tab labels, tags |
| Body | Lato | 400 | Descriptions, metadata, input text |
| Bold body | Lato | 700 | Nutrition values, stats, emphasized data |

**Replace all system font stacks** (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) with:
- `'Bricolage Grotesque', sans-serif` — headings, buttons, nav, badges, tabs
- `'Lato', sans-serif` — body, captions, inputs, metadata

**Set in `index.css`:**
```css
body {
  font-family: 'Lato', sans-serif;
  background-color: var(--gg-parchment);
  color: var(--gg-espresso);
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Bricolage Grotesque', sans-serif;
  color: var(--gg-espresso);
}
```

---

## Redesign Checklist

Work through each item in this exact order. Check it off as you go. Do not skip ahead.

### Phase 1: Design Tokens

- [ ] **`frontend/src/index.css`** — paste full `:root` CSS variables block above; update `body` and `h1-h6` defaults
- [ ] **`frontend/index.html`** — add Google Fonts `<link>` tags
- [ ] **`frontend/src/App.css`** — replace any hardcoded color values with tokens

---

### Phase 2: Layout Shell

**Desktop Navigation / Sidebar**
- Background: `var(--gg-espresso)` — dark sidebar anchors the warm parchment page
- Logo/wordmark: Bricolage Grotesque 800, white, letter-spacing -1px
- Nav items: Lato 700, `rgba(255,255,255,0.65)`; active item: `var(--gg-tomato)` 3px left border + full white text
- Hover state: `rgba(255,255,255,0.08)` background
- Nav dividers: `rgba(255,255,255,0.1)`

**Mobile Header**
- Background: `var(--gg-espresso)`
- Logo: Bricolage Grotesque 800, white
- Hamburger icon: white, 24px

**Mobile Drawer**
- Same `var(--gg-espresso)` background as desktop sidebar
- Slide-in from left, same nav item treatment
- Close button: white

**Floating Action Button (mobile)**
- Background: `var(--gg-tomato)`, hover `var(--gg-tomato-hover)`
- Icon: white
- Shadow: `var(--gg-shadow-lg)` with tomato tint: `0 8px 24px rgba(232,57,26,0.35)`

---

### Phase 3: Components

For each component below — complete desktop styles, then immediately add mobile overrides.

---

#### Auth (`frontend/src/components/Auth.tsx`)

**Desktop:**
- Page background: `var(--gg-parchment)` — remove purple gradient entirely
- Optional: add a subtle noise texture overlay (`background-image: url("data:image/svg+xml,...")` or `opacity: 0.03` grain) for tactile warmth
- Card: white, `var(--gg-radius-xl)`, `var(--gg-shadow-lg)`, `1.5px solid var(--gg-border)`
- App logo/title above card: Bricolage Grotesque 800, `var(--gg-espresso)`, large (2.5rem+)
- Tagline: Lato 400, `var(--gg-taupe)`
- Input labels: Bricolage Grotesque 600, `var(--gg-espresso)`, small (0.8rem)
- Inputs: `var(--gg-cream)` background, `1.5px solid var(--gg-border)`, `var(--gg-radius-md)`, Lato 400, `var(--gg-espresso)` text
- Input focus: border `var(--gg-tomato)`, box-shadow `0 0 0 3px var(--gg-tomato-subtle)`
- **Sign In button: use AttractButton** — see `references/attract-button-adapted.md`
- Toggle link (sign in / sign up): `var(--gg-tomato)` text, Lato 700, underline on hover

**Mobile:**
- Card goes full-width, 16px horizontal padding, border-radius 0 or 12px
- Logo size reduced to 1.8rem
- Inputs: min-height 48px to prevent iOS auto-zoom (ensure font-size ≥ 16px)

---

#### RecipeCard (`frontend/src/components/RecipeCard.tsx`)

**Desktop:**
- Card: `var(--gg-cream)` background, `1.5px solid var(--gg-border)`, `var(--gg-radius-lg)`, `var(--gg-shadow-sm)`
- Hover: `var(--gg-shadow-md)`, border `var(--gg-border-strong)`, lift `translateY(-2px)`
- Recipe name: Bricolage Grotesque 800, `var(--gg-espresso)`, 1.3rem, letter-spacing -0.5px
- Section headers inside card: Bricolage Grotesque 700, `var(--gg-espresso)`, 0.85rem, with thin `var(--gg-border)` bottom border, letter-spacing 0.5px, text-transform uppercase
- Metadata (time, servings, difficulty): Lato 400, `var(--gg-taupe)`, 0.85rem
- Tags/pills: Bricolage Grotesque 600, `var(--gg-tomato)` border + text, `var(--gg-tomato-subtle)` background, `var(--gg-radius-xl)`
- Nutrition values: Lato 700, `var(--gg-espresso)`; labels: Lato 400, `var(--gg-taupe)`
- Health grade badge colors:
  - A/A+ → `var(--gg-forest)` background, white text
  - B → `var(--gg-forest)` at 80% opacity
  - C → `var(--gg-amber)` background, white text
  - D/F → `var(--gg-red)` background, white text
  - Badge font: Bricolage Grotesque 700
- Budget/tip sections: `var(--gg-forest-light)` or `var(--gg-amber-light)` background tint
- Expand/collapse chevrons: `var(--gg-tomato)`

**Mobile:**
- Single column, reduce card padding from ~24px to 16px
- Nutrition grid: 2-per-row instead of 4
- Recipe name: 1.1rem
- Hide secondary metadata if space-constrained

---

#### RecipeList (`frontend/src/components/RecipeList.tsx`)

**Desktop:**
- Page/section heading: Bricolage Grotesque 800, `var(--gg-espresso)`, 2rem
- Subheading/count: Lato 400, `var(--gg-taupe)`
- Empty state: centered, food emoji, Lato 400 `var(--gg-taupe)` body, Bricolage Grotesque 700 heading
- "Generate Recipes" / primary action: **use ParticleButton** — see `references/particle-button-adapted.md`
  - Background: `var(--gg-tomato)`, white text, Bricolage Grotesque 600
  - Particles: tomato, forest, amber
  - Icon: `Sparkles` or `ChefHat` from lucide-react (remove `MousePointerClick`)
- Grid gap and card sizing: unchanged from current

**Mobile:**
- Grid → single column
- Heading font-size: 1.5rem
- Generate button: full-width

---

#### IngredientInput (`frontend/src/components/IngredientInput.tsx`)

**Desktop:**
- Input field: `var(--gg-cream)` background, `1.5px solid var(--gg-border)`, `var(--gg-radius-md)`, Lato 400, `var(--gg-espresso)` text, font-size 16px
- Focus: `var(--gg-tomato)` border, `var(--gg-tomato-subtle)` background glow
- Ingredient tags: `linear-gradient(135deg, var(--gg-tomato), var(--gg-tomato-hover))`, white text, Bricolage Grotesque 600, `var(--gg-radius-xl)`
- Tag remove button: white × icon, `rgba(255,255,255,0.6)` on hover
- Placeholder text: `var(--gg-taupe)`

**Mobile:**
- Full-width input
- Tags wrap, min touch target 36px height per tag
- Font-size: 16px (prevents iOS zoom)

---

#### IngredientSubstitution (`frontend/src/components/IngredientSubstitution.tsx`)

**Desktop:**
- Container: `var(--gg-cream)` card, `1.5px solid var(--gg-border)`, `var(--gg-radius-lg)`
- Heading: Bricolage Grotesque 700, `var(--gg-espresso)`
- Substitution items: Lato 400 body; "can substitute with" indicator: `var(--gg-forest)` text
- Arrow/separator: `var(--gg-taupe)`

**Mobile:** Full-width, stacked layout, same spacing as desktop but 16px padding

---

#### MealPlanCalendar (`frontend/src/components/MealPlanCalendar.tsx`)

**Desktop:**
- Calendar outer: `var(--gg-cream)` background, `var(--gg-border)` border, `var(--gg-radius-lg)`
- Month/week header: Bricolage Grotesque 800, `var(--gg-espresso)`
- Day name headers: Bricolage Grotesque 600, `var(--gg-taupe)`, letter-spacing 1px, uppercase
- Day cells: white background, `var(--gg-border)` border
- Today: `var(--gg-tomato)` 2px border, `var(--gg-tomato-subtle)` background
- Meal slot cards: `var(--gg-parchment)` background, `var(--gg-border)` border, `var(--gg-radius-md)`
- Meal slot recipe name: Bricolage Grotesque 600, `var(--gg-espresso)`, 0.8rem
- Add meal button: `var(--gg-tomato)` text + 1.5px border, `var(--gg-radius-md)`, Bricolage Grotesque 600; hover: fills tomato, white text
- Drag-over state: `var(--gg-tomato)` dashed border, `var(--gg-tomato-subtle)` background
- Nav arrows (prev/next week): `var(--gg-taupe)`, hover `var(--gg-tomato)`

**Mobile:**
- Show 3-day view or enable horizontal scroll
- Compact meal slots: just recipe name + health grade dot
- Touch drag-and-drop: preserve existing mobile touch implementation, update visual states to match above

---

#### SmoothTab (`frontend/src/components/SmoothTab.tsx`)

**Desktop only** — hide on mobile: add `@media (max-width: 768px) { .smooth-tab-root { display: none; } }`

See `references/smooth-tab-adapted.md` for the full adapted implementation to replace the current file with.

Key changes from the KokonutUI original:
- Toolbar background: `var(--gg-cream)`, border `var(--gg-border)`
- Active pill: `var(--gg-espresso)` background (dark pill on cream toolbar — high contrast)
- Active tab text: white
- Inactive tab text: `var(--gg-taupe)`, hover `var(--gg-espresso)`
- Card content area: `var(--gg-cream)` background, `var(--gg-border)` border
- Waveform fill color per tab: `var(--gg-tomato)` (all tabs use tomato wave)
- **GroceryGenius tab names**: "Recipes", "Meal Plan", "Pantry", "Shopping" (replace "Models/MCPs/Agents/Users")
- Tab `color` props: use `--gg-espresso` for the active pill (not blue/purple/emerald/amber)

---

#### ParticleButton (`frontend/src/components/ParticleButton.tsx`)

See `references/particle-button-adapted.md` for the adapted implementation.

Key changes:
- Particle colors: `#e8391a` (tomato), `#2d6a4f` (forest), `#e8962a` (amber), `#eddecb` (border/cream)
- Particle size: increase to `h-1.5 w-1.5` for visibility on parchment backgrounds
- Button: `var(--gg-tomato)` background, white text, Bricolage Grotesque 600, `var(--gg-radius-md)`
- Hover: `var(--gg-tomato-hover)` background
- Replace `MousePointerClick` icon with `Sparkles` or `ChefHat` from lucide-react
- Scale down to 0.96 on active (slightly less aggressive than 0.95)

**Placement**: Wrap these buttons with ParticleButton:
- "Generate Recipes" in RecipeList
- "Add to Meal Plan" in RecipeCard
- "Save to Pantry" wherever it appears

---

#### AttractButton (`frontend/src/components/AttractButton.tsx`)

See `references/attract-button-adapted.md` for the adapted implementation.

Key changes:
- Remove all `violet-*` Tailwind classes
- Button: `var(--gg-tomato)` background, white text, border `var(--gg-tomato-hover)`
- Particle color: `#fdf6ec` (parchment — visible against tomato background)
- Static label: "Sign In" (not "Hover me" / "Attracting" — the label does not change on hover)
- Icon: replace `Magnet` with `LogIn` from lucide-react
- Used **only** on the sign-in button in `Auth.tsx`

---

#### Toast (`frontend/src/components/Toast.tsx`)

- Success: `linear-gradient(135deg, var(--gg-forest), #1e4d38)`, white text
- Error: `linear-gradient(135deg, var(--gg-red), #96271f)`, white text
- Warning: `linear-gradient(135deg, var(--gg-amber), #c47a1e)`, white text
- Info: `linear-gradient(135deg, var(--gg-espresso), #3a2a1a)`, white text
- Title: Bricolage Grotesque 700, white
- Body: Lato 400, `rgba(255,255,255,0.85)`
- Border radius: `var(--gg-radius-lg)`
- Shadow: `var(--gg-shadow-lg)`
- **Mobile:** full-width, bottom of screen, 12px margin on sides, 16px from bottom safe area

---

#### FavoriteHeartButton (`frontend/src/components/FavoriteHeartButton.tsx`)

- Unfavorited: stroke `var(--gg-border-strong)`, transparent fill
- Favorited fill: `var(--gg-tomato)` (replaces `#EF3340`)
- Burst particle colors: `var(--gg-tomato)`, `var(--gg-amber)`, `var(--gg-forest)`
- Hover (unfavorited): stroke `var(--gg-tomato)` at 60% opacity, subtle scale 1.1

---

#### SlideTextButton (`frontend/src/components/SlideTextButton.tsx`)

- Resting state: `var(--gg-espresso)` text, `1.5px solid var(--gg-espresso)` border, transparent background
- Hover slide: `var(--gg-tomato)` fills from left, white text
- Font: Bricolage Grotesque 600, letter-spacing 0.5px
- Border radius: `var(--gg-radius-md)`

---

#### MouseEffectCard (`frontend/src/components/MouseEffectCard.tsx`)

- Card background: `var(--gg-cream)`
- Border: `1.5px solid var(--gg-border)`
- Border radius: `var(--gg-radius-lg)`
- Glow/highlight tint: `rgba(232, 57, 26, 0.06)` (tomato)
- Shadow on hover: `var(--gg-shadow-md)`
- **Mobile:** disable mouse tracking effect entirely; show as static card with `var(--gg-shadow-sm)`

---

#### LanguageSwitcher (`frontend/src/components/LanguageSwitcher.tsx`)

- Trigger button: `var(--gg-cream)` background, `var(--gg-border)` border, `var(--gg-radius-md)`, Lato 700, `var(--gg-espresso)` text
- Dropdown: `var(--gg-cream)` background, `var(--gg-border)` border, `var(--gg-shadow-md)`, `var(--gg-radius-md)`
- Active/selected language: `var(--gg-tomato)` text, Bricolage Grotesque 600
- Hover item: `var(--gg-parchment)` background
- **Mobile:** compact icon-only trigger if in header; same dropdown treatment

---

### Phase 4: CSS Files

**`frontend/src/mobile.css`**
- Update FAB: `background: var(--gg-tomato)`, shadow with tomato tint
- Bottom sheet: `var(--gg-cream)` background, `var(--gg-espresso)` drag handle dot
- All hardcoded color values → CSS variables

**`frontend/src/mobile-responsive.css`**
- Sweep for any `#10b981`, `#ED8B00`, `#667eea` values → replace with tokens
- Ensure no old green/orange/purple remains in media query overrides

---

### Phase 5: Verification

Run this grep — it should return **zero results** when the redesign is complete:

```bash
grep -rn "#10b981\|#059669\|#ED8B00\|#f59e0b\|#667eea\|#764ba2\|BlinkMacSystemFont\|'Segoe UI'\|Roboto\b" frontend/src/
```

Visual checklist:
- [ ] Auth: no purple, parchment background, AttractButton for sign-in
- [ ] RecipeCard: Bricolage Grotesque 800 name, parchment/cream card, tomato tags
- [ ] Navigation: espresso dark sidebar (desktop), matching mobile drawer
- [ ] SmoothTab visible on desktop with espresso active pill; hidden on mobile
- [ ] Primary CTAs use ParticleButton with food icon
- [ ] Toasts: correct gradient per type, no old colors
- [ ] Mobile at 375px: fonts render correctly, no iOS zoom issues, touch targets ≥ 44px

---

## Aesthetic Principles to Apply Throughout

These aren't rules to follow mechanically — they're the reasoning behind why the design looks good. Understanding them lets you make better decisions on edge cases:

1. **Parchment ≠ white.** The page background is warm and papery. Cards (`--gg-cream`) are slightly lighter so they lift off the page. Don't use pure `#ffffff` as a page background.

2. **Tomato is for action, not decoration.** It's a strong, warm red. Reserve it for: primary CTAs, active tab states, focus rings, health badges, and the heart button. Scattering it everywhere cheapens it.

3. **Bricolage Grotesque earns its weight at 800.** Use 800 for the most important text on screen (recipe names, page titles). Use 700 for section headers. Use 600 for UI labels. Don't use 800 everywhere — it loses impact.

4. **Forest green is deeper and more culinary than emerald.** The old `#10b981` reads as "tech success." `#2d6a4f` reads as "fresh basil." Use forest for health grades, success states, and "healthy" tags — not for general CTAs.

5. **Espresso sidebar is the anchor.** The dark navigation against the warm parchment body creates the visual identity. It's the boldest design decision — don't lighten it.

6. **Every mobile component is a first-class citizen.** Check: fonts ≥ 16px in inputs, touch targets ≥ 44px, no horizontal overflow, hover states don't break on touch.

---

## Reference Files

- `references/design-tokens.md` — complete CSS variables block, ready to paste
- `references/smooth-tab-adapted.md` — full GroceryGenius-adapted SmoothTab implementation
- `references/particle-button-adapted.md` — full GroceryGenius-adapted ParticleButton implementation
- `references/attract-button-adapted.md` — full GroceryGenius-adapted AttractButton implementation
