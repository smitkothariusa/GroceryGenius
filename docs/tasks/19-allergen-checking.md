# 19 — Allergen Cross-Checking

**Priority:** 🟢 Low
**Effort:** M (1-2 days)
**Status:** NOT STARTED

New feature. No allergen warnings exist today. Would need a user-configured
allergen profile (likely on the existing profile table — check
`profile.py` for where preferences already live) cross-referenced against
generated recipe ingredients, flagged in the recipe output. Given this is
health/safety-adjacent (a wrong or missing allergen warning has real
consequences), treat any implementation as advisory-only in the UI copy
and get explicit product sign-off on the disclaimer wording before shipping.
