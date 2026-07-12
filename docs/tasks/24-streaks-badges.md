# 24 — Gamified Streaks & Impact Badges

**Priority:** 🟢 Feature (backlog: [feature-ideas.md #13](../feature-ideas.md#13-gamified-streaks--impact-badges))
**Effort:** S–M
**Status:** IN PROGRESS

## Problem

The donation `ShareImpactModal` already hints at gamification (share-your-
impact copy) but there's no ongoing reward loop. Add streaks/badges to
boost retention — scoped narrowly to avoid the idea's own callout risk of
incentivizing over-buying or over-eating.

## Resolved product decisions (2026-07-12, confirmed with user)

1. **Reward behaviors, v1: waste-reduction + donations only.** Explicitly
   NOT tied to purchase volume, calorie counts, or app-open frequency —
   avoids incentivizing over-buying/over-eating, per the idea's own open
   question. Two reward types:
   - **Zero-waste streak**: consecutive days with no pantry items sitting
     past their expiry date unaddressed.
   - **Donation milestone badges**: meals-donated thresholds.
2. **On by default, dismissible** — not opt-in. Shown subtly (a small
   badge shelf / streak chip), with a settings toggle to hide it if it
   feels gimmicky, mirroring how donation impact stats are already always
   visible today.
3. **Donation badges are fully derived — no new table for them.** Existing
   `donation_impact.total_meals` (via `donationService.getImpact()`,
   `frontend/src/lib/database.ts:591`) already has everything needed;
   compute unlocked thresholds live each render (10 / 50 / 100 / 500 meals
   donated). No persistence needed for badge state itself.
4. **Zero-waste streak needs minimal persistence** (the idea's own
   complexity note: "M if we persist streak state") — there's no existing
   per-day waste event history to derive a true streak from, so this
   ships as a lightweight daily check-in counter, not a rigorous
   historical audit. This is a known, intentional v1 limitation: the
   streak reflects "did the user have any stale-expired item sitting in
   their pantry the last time this was checked," checked at most once/day
   client-side — not a server-verified guarantee. Document this
   limitation in-product only if it becomes a support question, not
   proactively (keep the UI simple).

## Data model — new table (dev migration, approved 2026-07-12)

```sql
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  zero_waste_streak_days integer not null default 0,
  last_checked_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

create policy "Users can manage their own streak"
  on public.user_streaks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Migration file: `supabase/migrations/<timestamp>_user_streaks.sql`,
timestamped after `23-meal-plan-templates.md`'s migration. Apply via
`supabase db push` against **dev only** (explicitly approved for dev;
production untouched until the normal release step).

## Implementation steps

1. Add the migration; run `supabase db push` against dev, confirm the
   table + RLS exist afterward.
2. `frontend/src/lib/database.ts`: new `streakService` — `get()` (upsert-
   on-read pattern like `donationService.getImpact()`'s default-row
   fallback) and `checkIn(hasStaleExpiredItems: boolean)`:
   - If `last_checked_date` is today, no-op (already checked in).
   - Else if `last_checked_date` is yesterday and `!hasStaleExpiredItems`,
     increment `zero_waste_streak_days` and set `last_checked_date` to
     today.
   - Else if `hasStaleExpiredItems`, reset `zero_waste_streak_days` to 0,
     set `last_checked_date` to today.
   - Else (gap of >1 day, or first-ever check-in with no stale items),
     set `zero_waste_streak_days` to 1, `last_checked_date` to today.
3. "Stale expired item" check: reuse `daysUntilExpiry` from
   `frontend/src/lib/pantryExpiry.ts` — an item counts as stale if
   `daysUntilExpiry(item) < 0` (already past expiry and still sitting in
   the pantry, i.e. not yet used/discarded/donated).
4. New small component (e.g. `frontend/src/features/achievements/` or
   alongside donation's `ShareImpactModal` pattern — subagent's call)
   rendering:
   - A streak chip (e.g. "🔥 5-day zero-waste streak") — call
     `streakService.checkIn(...)` once on mount per session (not on every
     render) with the pantry's current stale-item state.
   - A small badge row for donation milestones (10/50/100/500 meals),
     locked/unlocked purely from `donation_impact.total_meals` compared
     against the threshold list — no persistence.
   - A dismiss toggle persisted to `localStorage` (e.g.
     `gg_hide_achievements`), consistent with how other lightweight UI
     prefs are stored in this codebase (check for precedent — the
     donation feature's `locationPermission` uses this pattern).
5. Mount point: somewhere visible but not intrusive — the Donation tab
   (next to existing impact stats) is the natural home given both reward
   types touch donation/pantry data already surfaced there. Don't build a
   new tab for this.
6. i18n: streak/badge copy across all 6 locales — **watch tone carefully**
   per the idea's own callout (badge names/descriptions should read as
   encouraging, not judgmental about food waste, and should translate
   without sounding preachy or infantilizing in any of the 6 languages).

## Verification checklist

- Migration applies cleanly against dev; confirm table + RLS via a
  `select` against `user_streaks`.
- `npx tsc --noEmit` passes.
- Manually exercise: a pantry with a stale expired item present → streak
  check-in resets to 0; remove the stale item, reload the next simulated
  day (or manually adjust `last_checked_date` in a test) → streak
  increments.
- Confirm donation badges reflect existing `donation_impact.total_meals`
  correctly at each threshold boundary (9 vs 10, 49 vs 50, etc.).
- Confirm the dismiss toggle actually hides the component and persists
  across reloads.
- Confirm all 6 locale files have the new keys, and spot-check tone in at
  least one non-English locale (e.g. does the streak-reset copy read as
  discouraging in translation?).
- Mobile: chip/badge row doesn't crowd the existing donation impact cards.
