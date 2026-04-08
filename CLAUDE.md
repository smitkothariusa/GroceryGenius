# GroceryGenius — Claude Code Instructions

## Git Workflow (STRICT — DO NOT DEVIATE)

### Branch Rules

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production only | grocerygenius.org |
| `dev` | Integration / ongoing dev | dev.grocerygenius.org |
| `feature/*` | New features (branch from `dev`) | Vercel preview URL |
| `fix/*` | Bug fixes (branch from `dev`) | Vercel preview URL |

### Rules Claude MUST Follow

1. **NEVER push directly to `main`** unless the user explicitly says "push to main", "merge to main", or "deploy to production".
2. **Default branch for all work is `dev`**. When starting a task, confirm the current branch is `dev` or a feature/fix branch off `dev`.
3. **For new features**, create a branch: `feature/<short-description>` off `dev`.
4. **For bug fixes**, create a branch: `fix/<short-description>` off `dev`.
5. **All PRs target `dev`**, not `main`. Only create a PR targeting `main` when the user explicitly requests a production release.
6. **Before any `git push`**, state the target branch and ask for confirmation if it is `main`.
7. **Never force-push** to `main` or `dev` under any circumstance.

### Standard Feature Workflow

```
git checkout dev
git pull origin dev
git checkout -b feature/<name>
# ... implement ...
git push -u origin feature/<name>
# Open PR: feature/<name> → dev
```

### Merging to Production (User-Initiated Only)

```
# Only run when user explicitly says to deploy to production
git checkout main
git merge dev --no-ff
git push origin main
```

---

## Vercel Deployment Configuration

- **Production**: `main` branch → grocerygenius.org
- **Development**: `dev` branch → dev.grocerygenius.org
- **Preview**: all other branches → auto-generated Vercel preview URLs

These mappings are configured in the Vercel dashboard and enforced by `vercel.json`.

---

## Project: GroceryGenius

A multilingual grocery and meal planning app.

### i18n

All new features MUST support all 6 languages. Any text visible to the user must use the i18n system — no hardcoded strings.

### UI

Current live design uses a **purple-blue gradient** and **system-ui font**. Match this for all UI work. The "Bright Kitchen" redesign is DORMANT — do not implement it unless the user explicitly says to start the Bright Kitchen redesign.

### Mobile

All UI changes must be mobile-friendly. Test with small viewport assumptions.

---

## Safety Reminders

- Ask before any destructive git operation (`reset --hard`, `branch -D`, `push --force`).
- Confirm target branch before every `git push`.
- Never skip pre-commit hooks (`--no-verify` is forbidden unless user explicitly requests it).
