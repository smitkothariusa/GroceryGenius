# GroceryGenius Design Tokens

Paste this block into `frontend/src/index.css`, replacing any existing `:root` variables.

```css
:root {
  /* ── Primary ────────────────────────────────── */
  --gg-tomato:           #e8391a;
  --gg-tomato-hover:     #c42f14;
  --gg-tomato-subtle:    rgba(232, 57, 26, 0.08);
  --gg-tomato-subtle-md: rgba(232, 57, 26, 0.14);

  /* ── Backgrounds ────────────────────────────── */
  --gg-parchment:        #fdf6ec;   /* page background */
  --gg-cream:            #fff8f0;   /* card backgrounds */

  /* ── Text ───────────────────────────────────── */
  --gg-espresso:         #1c1208;   /* headings, primary text */
  --gg-taupe:            #7a6652;   /* secondary text, captions */

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
}
```

## Global base styles to add

```css
body {
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
```

## Color mapping reference

| Old | New token | Notes |
|---|---|---|
| `#10b981` | `--gg-forest` | Health A+ grade, success |
| `#059669` | `--gg-forest-hover` | Hover on forest elements |
| `#ED8B00` | `--gg-amber` | Tab highlight → warning/medium |
| `#f59e0b` | `--gg-amber` | |
| `#667eea` | remove / `--gg-parchment` | Auth gradient — replace with parchment bg |
| `#764ba2` | remove | |
| `#EF3340` | `--gg-tomato` | Favorite heart |
| `#ef4444` | `--gg-red` | Error states |
| `#3b82f6` | `--gg-espresso` | Info toast → use espresso gradient instead |
| `#1f2937` | `--gg-espresso` | Text |
| `#6b7280` | `--gg-taupe` | Secondary text |
| `#9ca3af` | `--gg-taupe` at 70% opacity | Tertiary text |
| `#e5e7eb` | `--gg-border` | Borders |
| `#f8fafc` | `--gg-parchment` | Background |
| `#ffffff` (cards) | `--gg-cream` | Card backgrounds |
