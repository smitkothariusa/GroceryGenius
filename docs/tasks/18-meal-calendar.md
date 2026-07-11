# 18 — Weekly Meal Calendar Feature

**Priority:** 🟡 Medium
**Effort:** L (2-3 days)
**Status:** NOT STARTED

New feature, not a fix. Needs a `meal_plans` Supabase table (user_id, date,
recipe reference, meal slot) with RLS following the same per-user pattern
as [task 01](01-pantry-persistence.md), plus a calendar UI in the frontend.
Scope (drag-and-drop vs. simple day-by-day assignment, whether it links to
existing saved recipes only or allows ad-hoc entries) needs a product
decision before implementation — don't start building without confirming
scope with the user first.
