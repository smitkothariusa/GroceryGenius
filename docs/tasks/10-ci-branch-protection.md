# 10 — Enforce CI as a Required Status Check

**Priority:** 🟠 High
**Effort:** S (1-2 hours)
**Status:** NOT STARTED

Replaces the original "no CI/CD pipeline" claim, which is false —
`.github/workflows/ci.yml` already runs frontend typecheck/lint and backend
pytest on every PR to `dev`/`main`. What's missing, confirmed via
`gh api repos/.../branches/dev/protection` → 404: there is no branch
protection at all, so CI can be red and a PR can still be merged. Configure
required status checks (`frontend`, `backend` jobs from `ci.yml`) on both
`dev` and `main` via `gh api repos/.../branches/{branch}/protection` or the
GitHub UI. This is a repo-settings change, not a code change — confirm with
the user before applying since it affects how every future PR merges.
