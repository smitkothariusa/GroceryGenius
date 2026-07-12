# GroceryGenius — New Feature Backlog

Brainstormed 2026-07-12 (via Opus). These are **net-new feature ideas**, not
bug fixes/infra — that backlog lives in `IMPLEMENTATION_PLAN.md` /
`docs/tasks/`. This file is the input to `/implement-task2`
(`.claude/skills/implement-task2/SKILL.md`).

Status values: `NOT STARTED`, `NEEDS PRODUCT DECISION` (open questions must
be resolved with the user before coding), `IN PROGRESS`, `DONE`, `SKIPPED`.

> Note on overlap: allergen cross-checking and account soft-delete were
> explicitly skipped by the user in the other backlog (tasks 19/20) — not
> revisited here. Ingredient substitution already ships
> (`IngredientSubstitution.tsx`) and is excluded.

## Current status

As of 2026-07-12: #2 (donatable-items highlighter) and #5 (cook what you
have) are DONE, both merged to `dev`. Next quick-win candidates: #12, #13
(lean on infra that already exists). #1 and #4 are the biggest value
unlocks but also the biggest data-model commitments — treat as
XL/needs-its-own-spec before coding.

---

## Backlog

| # | Idea | Complexity | Status |
|---|---|---|---|
| 1 | [Nationwide food-bank finder (dynamic, geocoded)](#1-nationwide-food-bank-finder-dynamic-geocoded) | L | NEEDS PRODUCT DECISION |
| 2 | [Donatable-items highlighter (perishable vs. non-perishable)](#2-donatable-items-highlighter-perishable-vs-non-perishable) | M | DONE — spec: [docs/tasks/21-donatable-items-highlighter.md](tasks/21-donatable-items-highlighter.md) |
| 3 | [Multi-nutrient tracker (protein, fiber — user-selected)](#3-multi-nutrient-tracker-protein-fiber--user-selected) | M | NEEDS PRODUCT DECISION |
| 4 | [Household / shared pantry (family accounts)](#4-household--shared-pantry-family-accounts) | XL | NEEDS PRODUCT DECISION |
| 5 | [Cook what you have (pantry-first, expiry-aware recipes)](#5-cook-what-you-have-recipe-mode-pantry-first-expiry-aware) | M | DONE — spec: [docs/tasks/22-cook-what-you-have.md](tasks/22-cook-what-you-have.md) |
| 6 | [Smart auto-restock suggestions](#6-smart-auto-restock-suggestions) | L | NEEDS PRODUCT DECISION |
| 7 | [Recipe photo & "make it again" cook log](#7-recipe-photo--make-it-again-cook-log) | M | NEEDS PRODUCT DECISION |
| 8 | [Weekly waste & savings dashboard](#8-weekly-waste--savings-dashboard) | M | NEEDS PRODUCT DECISION |
| 9 | [Grocery budget tracker](#9-grocery-budget-tracker) | M | NEEDS PRODUCT DECISION |
| 10 | [Voice / conversational quick-add](#10-voice--conversational-quick-add) | M | NEEDS PRODUCT DECISION |
| 11 | [Barcode-driven price & deal history](#11-barcode-driven-price--deal-history) | L | NEEDS PRODUCT DECISION |
| 12 | [Meal-plan templates & one-tap week fill](#12-meal-plan-templates--one-tap-week-fill) | M | IN PROGRESS — spec: [docs/tasks/23-meal-plan-templates.md](tasks/23-meal-plan-templates.md) |
| 13 | [Gamified streaks & impact badges](#13-gamified-streaks--impact-badges) | S–M | IN PROGRESS — spec: [docs/tasks/24-streaks-badges.md](tasks/24-streaks-badges.md) |
| 14 | [Dietary-preference-aware recipe generation](#14-dietary-preference-aware-recipe-generation) | M | NEEDS PRODUCT DECISION |
| 15 | [Accessibility & scan-assist pass](#15-accessibility--scan-assist-pass-high-contrast-larger-text-tts-for-recipes) | M | NEEDS PRODUCT DECISION |

All start at `NEEDS PRODUCT DECISION` because every idea below has open
product questions — `/implement-task2` resolves those with the user (or
picks reasonable defaults if the user says "your call") before writing a
spec and coding.

---

## 1. Nationwide food-bank finder (dynamic, geocoded)

Today the donation tab reads a hardcoded ~5-row list in
`frontend/src/data/foodBanks.ts` covering only Virginia Beach/Norfolk, VA —
every user outside Tidewater sees irrelevant or empty results. Replace it
with a real geocoded lookup so any US (later international) user gets
nearby food banks and drop-offs ranked by distance from the geolocation we
already capture.

**Complexity: L.** New backend router + integration with an external
directory (Feeding America partner API, or an OSM/Overpass
`social_facility=food_bank` query, or a seeded Supabase table), plus
caching. The frontend distance-sort logic already exists; the hard part is
a reliable, license-clean nationwide data source.

**Codebase considerations:** New `backend/app/routers/foodbanks.py` (auth +
slowapi limit, per CLAUDE.md conventions) that proxies/caches the directory
lookup so we don't ship an API key client-side; `authFetch` from the
donation feature. Consider a Supabase `food_banks` table (public-read RLS)
seeded from a one-time import as a fallback/cache. `FoodBank`/`DropOffSite`
types and `DonationContext` distance sort stay mostly intact. i18n:
category/accepted-item labels already have keys (`non_perishables`, etc.) —
extend for new fields. Mobile: results list already responsive.

**Open product questions:** Which data source (external live API vs.
seeded/curated table)? US-only v1 or all 6 languages' regions? How fresh
must hours/accepted-items be, and do we show "call to confirm"? Do we keep
the curated VA entries as verified favorites?

## 2. Donatable-items highlighter (perishable vs. non-perishable)

Most food banks reject perishables, but the app doesn't tell users which of
their pantry items are actually bring-able. Classify each pantry item as
non-perishable/donatable and surface a "Good to donate" filter in the
donation flow so users pack the right things (canned goods, pasta, rice)
and skip the milk and produce.

**Complexity: M.** Core work is a reliable perishability classifier. A
keyword/category table (mirrors the existing `_PC_TABLE`/`_LB_TABLE`
approach in `donation.py`) is cheap; an OpenAI-backed classifier is more
accurate but adds a rate-limited route.

**Codebase considerations:** Add a `perishable` derivation — either a
static map in the frontend donation feature or a small helper alongside the
calorie tables in `donation.py`. The `DonationModal` item picker gets a
filter/badge; expiry data already lives on `PantryItem`. i18n: 2–4 new
strings ("Donatable", "Perishable — keep at home") × 6 langs. No new tables
if done heuristically. Mobile: badge + filter toggle.

**Open product questions:** Heuristic table vs. AI classification
(cost/accuracy tradeoff)? Do we hard-hide perishables or just de-emphasize
them? Should a food bank's own `acceptedItems` narrow the list further
per-destination?

**Shipped 2026-07-12** (PR [#53](https://github.com/smitkothariusa/GroceryGenius/pull/53),
merged to `dev` @ `521cbb6`). Heuristic classification via a new
`classifyPerishability()` helper (category + shelfLife lookups against
`foodDatabase.ts`, keyword fallback for unrecognized items) — no AI route,
per the resolved product decision. `DonationModal` badges each item
(good-to-donate / keep-at-home) and adds a "Donatable only" toggle that
collapses (not hides) perishables; selection state is unaffected by the
toggle. i18n added across all 6 locales. Per-food-bank `acceptedItems`
narrowing was explicitly skipped for v1 (free-text field, not a structured
taxonomy — see spec). Deploy note: Vercel hit an account-level build-rate
limit at merge time, so `dev.grocerygenius.org` had not yet picked up this
commit as of merge — expected to auto-deploy once the limit resets; no
code issue.

## 3. Multi-nutrient tracker (protein, fiber — user-selected)

Extends the existing calorie tracker so users opt into tracking one or two
additional nutrients (protein and fiber are the top requests). Same
daily-goal + running-total UX as calories, shown as secondary rings/bars,
so health-focused users can hit protein targets without leaving the app.

**Complexity: M.** Mirrors the calorie pipeline end-to-end but multiplies
the data model and requires per-food nutrient values.

**Codebase considerations:** `calorieService` in `lib/database.ts` and the
`daily_calorie_goal` profile column pattern generalize to
`protein_goal`/`fiber_goal` + per-day totals (new columns or a
`nutrient_logs` table, RLS per-user like existing pantry data).
`foodDatabase.ts` needs protein/fiber per item (or pull from the
barcode/vision nutrition data we already scan). New settings toggles in
`SettingsPanel.tsx`; new tracker UI near `showCalorieTracker`. i18n: goal
labels, units (g) × 6. Mobile: additional rings must not crowd the tracker
card.

**Open product questions:** Which nutrients in v1 (protein only, or
protein+fiber, or a menu incl. sugar/sodium/carbs)? Where do nutrient
values come from for manually-added foods lacking a barcode? Goals
user-set or derived from the onboarding survey (age/weight/activity)?

## 4. Household / shared pantry (family accounts)

Let a user create a "household" and invite another user; members share one
pantry (and optionally the meal calendar and shopping list) so a couple or
family doesn't double-buy or track separately. This is the single
highest-value social feature and the most requested pattern for grocery
apps.

**Complexity: XL.** Touches the RLS model that all pantry/shopping/calendar
data relies on, plus an invite flow, permissions, and removal/leave
semantics — a genuine data-model migration.

**Codebase considerations:** Introduce `households` + `household_members`
tables and re-key pantry/shopping/meal-plan rows from `user_id` to
`household_id` (or add household_id alongside), then rewrite RLS policies
to "member of household" — the riskiest part, since current policies are
per-user and everything (task 01 persistence) assumes that. Invite flow
needs a backend route (tokened invite) + email or share-link. Frontend:
household management UI, member list, "whose pantry am I viewing." Offline
sync queue (task 11) must be household-aware. i18n across all
invite/permission strings.

**Open product questions (heavy):** Shared-ownership model — do items
belong to the household or stay attributed to the adder? Permission tiers
(admin vs. member; can a member delete another's items)? On
removal/"divorce": does a leaving member keep a copy, and what happens to
items they added? Max household size? Do meal plans and shopping lists sync
by default or opt-in per surface? Billing implications if monetization
lands later?

## 5. Cook what you have (recipe mode, pantry-first, expiry-aware)

A one-tap recipe generation mode that feeds the user's current pantry —
prioritizing items nearest expiry — into the existing AI recipe engine, so
people cook down what they own before it spoils and waste less. Turns
pantry + expiry data we already track into an actionable "use it up"
prompt.

**Complexity: M.** Recipe generation, pantry read, and the "use only these
ingredients" prompt path all already exist in `recipes.py`; this is a new
entry point + prompt shaping + expiry sort, not new infrastructure.

**Codebase considerations:** Reuse `recipes.py`'s ingredient-constrained
prompt (already supports "use ONLY these"). New CTA in the pantry/recipes
feature that passes expiring items first; slowapi `AI_HEAVY_LIMIT` already
applies. No schema change. i18n: mode label + empty-state × 6. Mobile: a
button on the pantry tab.

**Open product questions:** Strict "only these ingredients" or "these plus
common staples"? How many expiring items to include, and what expiry
window counts as "use soon"? Surface as its own tab or a toggle on existing
recipe generation?

**Shipped 2026-07-12** (PR [#54](https://github.com/smitkothariusa/GroceryGenius/pull/54),
merged to `dev` @ `ad7dc31`). Non-heavy idea — open questions resolved by
judgment call rather than a user round-trip (recorded in the spec): reused
the existing `strict` flag in `recipes.py` (no backend change), reused the
app's existing 3-day "expiring soon" window (`lib/pantryExpiry.ts`) instead
of inventing a new threshold, and shipped as a CTA button on the existing
Recipes tab rather than a new tab. New "🍳 Cook What's Expiring" button
populates ingredient tags from expiring-soon pantry items and switches
recipe mode to strict; disabled with a tooltip when nothing is expiring.
i18n added across all 6 locales. Deploy note: same Vercel account-level
build-rate limit noted on PR #53 applies here too — dev will pick up this
commit once the limit resets.

## 6. Smart auto-restock suggestions

Learn which staples a user repeatedly buys/consumes (from shopping-list
history and pantry depletion) and proactively suggest adding them back to
the shopping list when they're likely running low. Reduces the "forgot the
milk again" problem without manual list-building.

**Complexity: L.** Needs consumption history and a simple recurrence
heuristic; value depends on enough historical data.

**Codebase considerations:** Requires logging pantry removals/shopping
completions over time (may need a `consumption_events` table, RLS
per-user; note the task-11 offline queue captures writes already).
Heuristic can be pure frontend/SQL (interval since last add) before any ML.
Suggestion chips on the shopping list UI. i18n for suggestion prompts.
Mobile: dismissible chips.

**Open product questions:** Heuristic (fixed reorder interval) vs. learned
cadence? How much history before we suggest anything (cold-start)? Opt-in,
given it implies behavioral tracking? Does it respect household sharing
(idea #4)?

## 7. Recipe photo & "make it again" cook log

After cooking a generated or favorited recipe, let users mark it "cooked,"
optionally snap a photo, and rate it — building a personal cooking history
and a "made it" filter on favorites. Adds emotional stickiness and improves
future recommendations.

**Complexity: M.** Straightforward CRUD + image upload (validation already
handled per task 04), leaning on existing favorites infra.

**Codebase considerations:** Extend the `favorites` feature + a `cook_log`
table (RLS per-user) or a flag/timestamp on favorites. Reuse the existing
image upload/validation path (Supabase Storage). New "Cooked" badge +
history view. i18n for rating/log strings. Mobile: camera capture flow
already exists via scanning.

**Open product questions:** Store photos (storage cost, privacy) or ratings
only? Does a high rating boost that recipe in future AI generations?
Household-shared log or personal?

## 8. Weekly waste & savings dashboard

A lightweight insights screen summarizing the week: items used before
expiry vs. wasted, estimated money saved (via the existing price-comparison
data), meals donated, and calories/nutrients tracked. Gives users a
rewarding sense of impact and reinforces the app's core "reduce waste"
mission.

**Complexity: M.** Mostly aggregation and charting over data we already
have (pantry expiry, donation impact totals, price comparison, calorie
logs).

**Codebase considerations:** Read-only aggregation across
pantry/donation/calorie services; the donation feature already computes
impact totals and has `ShareImpactModal` to reuse for sharing. New
dashboard view; a small chart lib or CSS bars (keep bundle lean). i18n for
metric labels/units (currency formatting per locale). Mobile:
single-column cards.

**Open product questions:** Which metrics matter most for v1? How is
"waste" defined (expired-and-removed vs. manually flagged)? Is money-saved
credible enough to show given price-comparison determinism constraints
(task 05)?

## 9. Grocery budget tracker

Let users set a weekly/monthly grocery budget and track spend as they check
off shopping-list items (prices come from the existing price-comparison
feature or manual entry), with a simple progress bar and over-budget
nudge. A frequently requested companion to any shopping-list app.

**Complexity: M.** New budget state + spend accumulation; leans on price
data already present.

**Codebase considerations:** `budget` + spend fields on profile/new table
(RLS per-user). Shopping-list checkoff flow gains an optional price; reuse
price-comparison values as defaults. Settings toggle in
`SettingsPanel.tsx`. i18n + locale currency formatting (6 langs, and
currency isn't 1:1 with language — see open Q). Mobile: progress bar on
shopping tab.

**Open product questions:** Currency handling — infer from locale or ask
explicitly (a fr user could be in France or Canada)? Manual price entry
vs. auto from price comparison? Budget period reset semantics?
Household-shared budget (idea #4)?

## 10. Voice / conversational quick-add

Let users add pantry or shopping items by voice or a single free-text line
("add 2 lbs chicken and a dozen eggs"), parsed into structured items via
the AI layer. Big accessibility and speed win, especially on mobile
mid-kitchen.

**Complexity: M.** Web Speech API for capture (browser-native, no cost)
plus an OpenAI parse route; ingredient parsing infra already exists (task
13).

**Codebase considerations:** New rate-limited parse route reusing the
task-13 ingredient parser (`AI_LIGHT_LIMIT`, `payload` body, `request:
Request`). Frontend mic button using `SpeechRecognition` with graceful
fallback. `authFetch` for the parse call. i18n both for UI and for parsing
prompts in 6 languages (non-trivial — speech recognition language must
match app locale). Mobile-first by design.

**Open product questions:** Web Speech API coverage is uneven (poor on some
mobile browsers) — acceptable with text fallback? Do we parse in all 6
languages at launch or English first? Confirm-before-add step to catch
mis-hears?

## 11. Barcode-driven price & deal history

When a user scans a barcode (feature exists), remember the product and let
them track its price over time / across the price-comparison sources, and
flag when it's cheaper than usual. Deepens the two AI-scanning features
already built into a recurring-value tool.

**Complexity: L.** Requires persisting scan history and price points, plus
a "notable deal" heuristic.

**Codebase considerations:** Extend `barcode.py` results into a
`product_history`/`price_points` table (RLS per-user, or shared catalog).
Ties into price-comparison determinism work (task 05). New history view.
i18n + currency. Mobile: scanning UX exists.

**Open product questions:** Where do repeated price points come from (user
re-scans, or a live price API)? Per-user history vs. crowd-sourced shared
catalog (privacy)? Is this valuable without a real-time price feed?

## 12. Meal-plan templates & one-tap week fill

Save a favorite week of the meal calendar as a reusable template and apply
it to a future week in one tap (auto-generating the shopping list and
pantry deductions the calendar already does). Removes the weekly
replanning chore for routine eaters.

**Complexity: M.** Builds directly on the existing `MealPlanCalendar`
(drag-drop + auto shopping list + pantry deduction already implemented).

**Codebase considerations:** New `meal_plan_templates` table (RLS
per-user) storing a serialized week; `MealPlanCalendar.tsx` gains
save-as-template + apply actions, reusing its existing shopping-list
generation. i18n for template management strings. Mobile: template picker
sheet.

**Open product questions:** How many templates per user? Does applying a
template overwrite or merge into an existing week? Share templates within
a household (idea #4) or publicly?

## 13. Gamified streaks & impact badges

Reward engagement with streaks (days logged, weeks with zero waste) and
milestone badges (meals donated, recipes cooked, nutrient goals met),
surfaced subtly to boost retention. The donation `ShareImpactModal` already
hints at this direction.

**Complexity: S–M.** Mostly derived state over existing data plus a badge
UI; S if purely computed, M if we persist streak state.

**Codebase considerations:** Compute from existing donation impact,
calorie logs, and cook log (idea #7); optional `achievements` table if we
want durable badges. Reuse `ShareImpactModal` for sharing. i18n for every
badge name/description × 6 (watch tone across cultures). Mobile: badge
shelf.

**Open product questions:** Which behaviors to reward (careful not to
incentivize over-buying/over-eating)? Persist streaks or compute live? How
prominent — opt-in so it doesn't feel gimmicky?

## 14. Dietary-preference-aware recipe generation

Let users set persistent dietary preferences (vegetarian, vegan, halal,
kosher, low-carb, cuisine likes/dislikes) once in settings and have every
AI recipe honor them automatically. Distinct from the skipped
allergen-safety feature (task 19) — this is preference/lifestyle, not a
safety guarantee.

**Complexity: M.** Preference storage + prompt injection into the existing
recipe engine.

**Codebase considerations:** Preferences on profile (or
`dietary_preferences` table, RLS per-user); `OnboardingSurvey.tsx` already
collects some profile data and is a natural capture point. Inject into
`recipes.py` prompt building. The existing `dietary-label` route in
`profile.py` is related. i18n for preference labels × 6. Mobile: settings
checklist.

**Open product questions:** Explicitly NOT an allergen/safety feature (per
the task-19 decision) — must we add a disclaimer to avoid that expectation?
Fixed preference list vs. free-text? How do per-generation overrides
interact with saved defaults?

## 15. Accessibility & scan-assist pass (high-contrast, larger text, TTS for recipes)

A dedicated accessibility mode: high-contrast theme, larger tap targets,
and text-to-speech read-aloud for recipe steps (hands-free cooking).
Broadens the user base and pairs naturally with the voice quick-add (idea
#10).

**Complexity: M.** Theming + a11y audit + browser SpeechSynthesis for
read-aloud (native, free).

**Codebase considerations:** Must respect the live purple-blue gradient /
system-ui design (CLAUDE.md) — add an accessibility variant, don't invoke
the dormant Bright Kitchen redesign. Theme toggle in `SettingsPanel.tsx`;
recipe view gets a "read aloud" button using `speechSynthesis` with
locale-matched voice. Audit tap targets across mobile. i18n: read-aloud
must use the app's current locale voice (6 langs); a11y labels/ARIA across
components.

**Open product questions:** Scope of v1 (contrast + text size only, or
full TTS)? SpeechSynthesis voice quality/availability varies by platform
and language — acceptable? Persist a11y prefs per-user (needs profile
field)?

---

## Quick-win cluster (do-first candidates)

#2 (donatable highlighter), #5 (cook-what-you-have), #12 (meal templates),
#13 (streaks) — all lean on data/infra that already exists.

## Ambitious/strategic

#1 (nationwide food banks) and #4 (household sharing) are the two biggest
value unlocks and the two biggest data-model commitments — worth their own
full spec in `docs/tasks/` before any code, per `/implement-task2`.
