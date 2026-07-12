# 23 — Meal-Plan Templates & One-Tap Week Fill

**Priority:** 🟢 Feature (backlog: [feature-ideas.md #12](../feature-ideas.md#12-meal-plan-templates--one-tap-week-fill))
**Effort:** M
**Status:** IN PROGRESS

## Problem

`MealPlanCalendar.tsx` already supports drag-and-drop meal assignment,
auto shopping-list generation, and pantry deduction per week — but every
week has to be rebuilt from scratch. Let users save a week as a reusable
template and apply it to any future week in one tap.

## Resolved product decisions (2026-07-12, confirmed with user)

1. **Applying a template overwrites the target week.** Simplest mental
   model matching "one-tap week fill." If the target week already has any
   `meal_plans` rows, show a confirm dialog before deleting them and
   inserting the template's entries — don't silently discard existing
   plans.
2. **Cap: 10 templates per user.** Enforce client-side (check count before
   allowing "Save as template"; show an error toast if at the cap,
   prompting the user to delete one first). No server-side enforcement
   needed for v1 — a client bypass here isn't a security concern, just a
   UX cap.
3. **Not household-shared** — household sharing (idea #4) doesn't exist
   yet, so templates are per-user only. Revisit if #4 ships later.

## Data model — new table (dev migration, approved 2026-07-12)

Follow the existing per-user RLS pattern (see `meal_plans`'s own policies
and `supabase/migrations/20260412173356_feedback_table.sql` for style).
Template content is **week-relative** (day-of-week index + meal type), not
tied to absolute dates, so the same template can be applied to any week.

```sql
create table if not exists public.meal_plan_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  template_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.meal_plan_templates enable row level security;

create policy "Users can manage their own meal plan templates"
  on public.meal_plan_templates
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

`template_data` shape: `Array<{ dayOfWeek: 0-6, meal_type: string, recipe: <same JSONB shape mealPlansService.add already serializes>, servings: number, notes?: string }>`.

Migration file: `supabase/migrations/<timestamp>_meal_plan_templates.sql`,
timestamped after the most recent existing migration. Apply via
`supabase db push` against the **dev** project only — this was explicitly
approved for dev; production is untouched until the normal release step.

## Implementation steps

1. Add the migration above; run `supabase db push` against dev (confirm
   with `supabase migration list` / a `select` against the new table
   afterward — don't just assume success).
2. `frontend/src/lib/database.ts`: new `mealPlanTemplatesService` mirroring
   `mealPlansService`'s style — `getAll()`, `add({name, template_data})`,
   `delete(id)`. Enforce the 10-cap in `add()` (or in the calling UI) by
   checking `getAll().length` first.
3. `MealPlanCalendar.tsx`:
   - "Save as template" action: serialize the currently-viewed week's
     `mealPlans` into the week-relative `template_data` shape (map each
     plan's date to a day-of-week index relative to `currentWeekStart`),
     prompt for a name, insert via the new service.
   - "Apply template" picker: list saved templates (name + created_at),
     on select, check whether the current week already has any
     `mealPlans` — if so, confirm before proceeding. On confirm: delete
     existing week's `meal_plans` rows (reuse `mealPlansService.delete`
     per id, or add a small batch-delete helper), then re-map
     `template_data`'s day-of-week entries onto `weekDates` and insert via
     the existing `mealPlansService.add` (reuses existing shopping-list /
     pantry-deduction hooks untouched — this only changes how
     `meal_plans` rows get created, not what happens after).
4. i18n: template save/apply/confirm/cap-reached strings across all 6
   locales, following the existing `mealPlan.*` key convention.
5. Mobile: template picker as a simple list/sheet consistent with the
   existing recipe-picker modal pattern already in this file.

## Verification checklist

- Migration applies cleanly against dev; `select * from
  meal_plan_templates limit 1` (empty result, no error) confirms the table
  + RLS exist.
- `npx tsc --noEmit` passes.
- Manually exercise: build a week, save as template, switch to an empty
  future week, apply template — confirm meals appear correctly mapped by
  weekday.
- Confirm applying to a week that already has meals triggers the confirm
  dialog and correctly overwrites only on confirmation.
- Confirm the 11th save attempt is blocked with a clear message.
- Confirm all 6 locale files have the new keys.
- Confirm existing shopping-list generation / pantry deduction still work
  unchanged after applying a template (they operate on `meal_plans` rows
  the same as manually-added ones).
