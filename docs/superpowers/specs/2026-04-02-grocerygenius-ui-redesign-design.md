# GroceryGenius UI Redesign — Design Spec
**Date**: 2026-04-02
**Status**: Approved

## Overview

A complete top-to-bottom visual redesign of GroceryGenius from its current generic UI into a distinctive **Bright Kitchen** aesthetic. This design is captured in the `grocerygenius-ui` skill and is invoked to execute the full redesign in one structured pass.

---

## Brand Identity

**Archetype**: The Knowledgeable Friend — warm, food-credible, and genuinely useful. Like a well-loved cookbook crossed with a modern food startup.

**Aesthetic direction**: Bright Kitchen — warm cream backgrounds, punchy tomato red accents, heavy confident type, energetic but not chaotic.

---

## Design System

### Color Palette — Tomato & Parchment

| Token | Hex | Use |
|---|---|---|
| `--gg-tomato` | `#e8391a` | Primary CTA, active states, health badges |
| `--gg-tomato-hover` | `#c42f14` | Hover on tomato elements |
| `--gg-parchment` | `#fdf6ec` | Page background |
| `--gg-cream` | `#fff8f0` | Card backgrounds |
| `--gg-espresso` | `#1c1208` | Headings, primary text |
| `--gg-taupe` | `#7a6652` | Secondary text, metadata |
| `--gg-border` | `#eddecb` | Borders, dividers |
| `--gg-forest` | `#2d6a4f` | Success, A+ health grade |
| `--gg-forest-light` | `#e8f5ee` | Success backgrounds |
| `--gg-amber` | `#e8962a` | Warning, B/C health grade |
| `--gg-red` | `#c0392b` | Error, D/F health grade |

**Replacing**: `#10b981` (emerald), `#ED8B00` (orange), `#667eea/#764ba2` (purple auth gradient)

### Typography

- **Display/Headings/UI**: Bricolage Grotesque (400, 600, 700, 800)
- **Body/Metadata**: Lato (400, 700)

Loaded via Google Fonts in `frontend/index.html`.

### Spacing & Radius

```
--gg-radius-sm: 6px   --gg-shadow-sm: 0 2px 8px rgba(28,18,8,0.06)
--gg-radius-md: 10px  --gg-shadow-md: 0 4px 16px rgba(28,18,8,0.10)
--gg-radius-lg: 14px  --gg-shadow-lg: 0 8px 32px rgba(28,18,8,0.14)
--gg-radius-xl: 20px
```

---

## Custom Components

Three KokonutUI components are integrated, adapted to GroceryGenius colors:

| Component | Placement | Key Adaptation |
|---|---|---|
| **AttractButton** | Auth.tsx — Sign In button only | Tomato colors, LogIn icon, "Sign In" label |
| **ParticleButton** | Primary CTAs (Generate, Save, Add) | Tomato/forest/amber particles, ChefHat/Sparkles icon |
| **SmoothTab** | Desktop navigation tabs only | Tomato active pill, espresso pill bg, GG tab names, hidden on mobile |

---

## Redesign Approach

**Audit-first, single pass** — the skill scans the codebase to build a complete inventory, then works through an ordered checklist:

1. Design tokens (index.css, index.html font imports, App.css)
2. Layout shell (desktop nav + mobile drawer/header)
3. Components (one by one, desktop + mobile together)
4. CSS files (mobile.css, mobile-responsive.css)
5. Verification grep for old colors

**Key constraint**: Desktop and mobile are handled together per component — no batching mobile at the end.

---

## Component Inventory (from codebase scan)

`Auth` · `RecipeCard` · `RecipeList` · `IngredientInput` · `IngredientSubstitution` · `MealPlanCalendar` · `SmoothTab` · `ParticleButton` · `AttractButton` · `Toast` · `FavoriteHeartButton` · `SlideTextButton` · `MouseEffectCard` · `LanguageSwitcher`

---

## Verification

```bash
grep -r "#10b981\|#059669\|#ED8B00\|#667eea\|#764ba2\|BlinkMacSystemFont\|Roboto\|Segoe UI" frontend/src/
```
Should return 0 results when complete.
