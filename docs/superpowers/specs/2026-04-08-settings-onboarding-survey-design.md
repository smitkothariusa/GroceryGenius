# Settings Panel & Onboarding Survey — Design Spec

**Date:** 2026-04-08  
**Status:** Approved  
**Scope:** Onboarding survey for new users + settings side panel for all users + AI dietary label integration

---

## 1. Overview

Two new surfaces, backed by the same profile data model:

1. **Onboarding Survey** — a 4-step wizard shown once to new users immediately after sign-up, before the existing mission statement popup. Fully skippable. Collects language, physical stats (for calorie recommendation), cooking level, and dietary preferences.
2. **Settings Side Panel** — a persistent ⚙️ gear button added next to Sign Out (desktop header + mobile drawer). Opens a right-side drawer (desktop) or bottom sheet (mobile) where users can edit all profile fields except language. Also exposes Change Password and Delete Account.

Both surfaces are fully i18n'd (all 6 languages) and mobile-friendly.

---

## 2. Data Model

### Supabase `profiles` table — new columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `cooking_level` | `text` | nullable | `'beginner' \| 'home_cook' \| 'intermediate' \| 'advanced'` |
| `age` | `integer` | nullable | Years |
| `weight_kg` | `numeric(5,2)` | nullable | Always stored in kg; UI converts from lbs if needed |
| `height_cm` | `integer` | nullable | Always stored in cm; UI converts from ft/in if needed |
| `biological_sex` | `text` | nullable | `'male' \| 'female'` |
| `activity_level` | `text` | nullable | `'sedentary' \| 'light' \| 'moderate' \| 'active' \| 'very_active'` |
| `onboarding_completed` | `boolean` | default `false` | Set to `true` after survey finish or skip |
| `custom_dietary_labels` | `jsonb` | default `'[]'` | `Array<{ id: string, label: string, description: string }>` |

Existing columns retained as-is: `daily_calorie_goal`, `dietary_preferences` (string[]), `full_name`, `email`.

### Calorie Recommendation (Mifflin-St Jeor + TDEE)

Calculated client-side whenever physical stats change:

```
BMR (male)   = (10 × kg) + (6.25 × cm) − (5 × age) + 5
BMR (female) = (10 × kg) + (6.25 × cm) − (5 × age) − 161

Activity multipliers:
  sedentary    → × 1.2
  light        → × 1.375
  moderate     → × 1.55
  active       → × 1.725
  very_active  → × 1.9

Recommended daily calories = round(BMR × multiplier)
```

The result is shown as a recommendation. The user can accept it (sets `daily_calorie_goal`) or type a manual override.

---

## 3. Onboarding Survey

### Trigger

- Shown once when `onboarding_completed === false` on a freshly authenticated session.
- Rendered as a full-screen modal overlay, above the app but below the existing mission statement popup trigger.
- After survey completes or is skipped entirely, `onboarding_completed` is set to `true` and the mission statement popup fires as normal.

### Step Flow

```
Welcome screen → Step 1: Language → Step 2: Physical Info → Step 3: Cooking Level → Step 4: Dietary Prefs → Done
```

Every step except the welcome screen has a **Back** link and a **Skip this step** link. Skipped steps leave their fields null in the profile upsert.

#### Welcome Screen
- Headline: "Personalize GroceryGenius"
- Subtext: brief pitch (i18n'd), estimated 60 seconds
- CTA: "Let's Go →"
- Secondary: "Skip for now" — sets `onboarding_completed = true`, dismisses survey entirely, proceeds to mission popup

#### Step 1 — Language (1 of 4)
- 6 language tiles: 🇺🇸 English, 🇪🇸 Español, 🇫🇷 Français, 🇩🇪 Deutsch, 🇯🇵 日本語, 🇨🇳 中文
- Selecting a language immediately calls `i18n.changeLanguage()` — the rest of the survey re-renders in the chosen language
- Selection is persisted to `localStorage` (same as existing LanguageSwitcher behavior)
- Language is **not** stored in the `profiles` table (already handled by i18n localStorage)

#### Step 2 — Physical Info (2 of 4)
Fields: Age, Biological Sex (Male/Female selector), Weight (lbs or kg — toggle), Height (ft/in or cm — toggle), Activity Level (dropdown).

As fields are filled in, the calorie recommendation updates live. Shown as:
> ✨ Recommended: **2,150 cal/day** *(tap to override)*

Tapping the recommendation makes the `daily_calorie_goal` field editable.

Units (lbs/kg, ft/in) are UI-only — values always stored in kg and cm.

#### Step 3 — Cooking Level (3 of 4)
Single-select tile list:
- 🌱 Beginner — I keep it simple
- 🏠 Home Cook — I follow recipes
- 🔪 Intermediate — I improvise
- ⭐ Advanced — I love to experiment

Stored as `cooking_level`. No effect on app behavior in this release (stored for future use).

#### Step 4 — Dietary Preferences (4 of 4)
Two input methods:

**Preset chips (multi-select):** Vegetarian, Vegan, Gluten-Free, Dairy-Free, Halal, Kosher, Keto, Low-Carb, Nut-Free, Paleo

**Free-text field:** User types a custom diet description. On submit (blur or Enter):
1. Frontend calls `POST /api/profile/dietary-label` with `{ text: "..." }`
2. Backend calls OpenAI to generate `{ label, description }` (see Section 5)
3. A loading spinner shows in place of the chip while the call is in flight
4. On success, a new chip is added to the preset list, pre-selected, and the entry is appended to `custom_dietary_labels`

The **first** selected dietary preference (preset or custom) is saved as the default value for the recipe generator's dietary filter dropdown.

#### Completion
On "Finish", all collected data is saved in a single `profiles` upsert. `onboarding_completed` is set to `true`. The survey modal closes and the mission statement popup fires.

---

## 4. Settings Side Panel

### Entry Point
A ⚙️ gear icon button is added:
- **Desktop header**: between the calorie tracker button and the Sign Out button
- **Mobile drawer footer**: between the Demo button and the Sign Out button

### Layout

| Viewport | Presentation |
|---|---|
| Desktop (≥768px) | Right-side drawer, ~300px wide, backdrop overlay dims the app |
| Mobile (<768px) | Bottom sheet, 85% screen height, drag handle, scrollable |

### Sections

#### Header
Shows the user's name and email. Purple-blue gradient background matching the app theme.

#### 👤 Profile
- Cooking Level (dropdown: Beginner / Home Cook / Intermediate / Advanced)

#### 🏃 Physical Info
- Age (number input)
- Biological Sex (Male / Female selector)
- Weight (number input with lbs/kg toggle)
- Height (number input with ft/in or cm toggle)
- Activity Level (dropdown)
- Calorie recommendation (recalculates live as fields change, shown in green callout)
- Daily Calorie Goal (number input — pre-filled with recommendation, editable)

#### 🥗 Dietary Preferences
- Same preset chips + free-text field as the survey Step 4
- Custom labels show with a small ✨ indicator and an ✕ to remove them

#### 🔒 Security
- **Change Password**: clicking expands an inline form with "New Password" and "Confirm Password" fields. On submit, calls `supabase.auth.updateUser({ password })`. Shows a success toast, collapses the form.

#### ⚠️ Danger Zone
- **Delete Account**: opens a confirmation modal. User must type `DELETE` in a text field to enable the confirm button. On confirm, calls `DELETE /api/profile` (deletes all user rows from all tables, then calls Supabase admin deleteUser). Signs out, returns to Auth screen.

### Save Behavior
All edits are held in local state. A sticky **Save Changes** button at the bottom of the panel commits all changes via a single `profiles` upsert. No auto-save on blur.

---

## 5. AI Dietary Label Endpoint

**Endpoint:** `POST /api/profile/dietary-label`  
**Auth:** Requires valid Supabase session (same auth middleware as other routes)  
**Request body:** `{ "text": "Mediterranean diet with no shellfish" }`  
**Response:** `{ "label": "Mediterranean (No Shellfish)", "description": "Recipes following a Mediterranean diet, excluding all shellfish and crustaceans." }`

**OpenAI prompt (system):**
> You are a dietary preference labeler for a recipe app. Given a user's free-text dietary preference, return a JSON object with two fields: `label` (2–4 words, title case, suitable as a dropdown option) and `description` (one sentence, used as a tooltip/filter hint in a recipe generator). Return only valid JSON, no markdown.

**Error handling:** If the OpenAI call fails, return a 200 with `{ label: <first 30 chars of input>, description: "" }` — the custom diet is still saved, just without an AI-generated description.

The endpoint is added to a new `backend/app/routers/profile.py` router.

---

## 6. Recipe Generator Integration

The recipe generator's dietary filter dropdown currently shows preset options only. After this feature:

1. On app load, fetch the user's profile and merge `custom_dietary_labels` into the dropdown options
2. The user's first entry in `dietary_preferences` (from profile) is pre-selected as the default dropdown value
3. When a custom label is deleted from settings, it is also removed from `dietary_preferences` if present

No changes to the actual AI recipe generation prompt are required — the dietary filter value is already passed through to the OpenAI recipe prompt.

---

## 7. i18n Requirements

All new user-facing strings must be added to all 6 locale files (`en`, `es`, `fr`, `de`, `ja`, `zh`):

- Survey: welcome screen copy, step headings, cooking level labels, dietary preset labels, activity level labels, button labels (Next, Back, Skip, Finish, Skip for now)
- Settings panel: section headings, field labels, Change Password form, Delete Account confirmation, Save Changes button
- Calorie recommendation callout
- Error/success toasts for Save, Change Password, Delete Account, AI dietary label

Translation keys should be namespaced under `survey.*` and `settings.*`.

---

## 8. Mobile Considerations

- Survey: rendered as a full-screen card with large tap targets (min 44px), no horizontal scroll
- Settings bottom sheet: inputs use `font-size: 16px` minimum to prevent iOS zoom on focus
- Unit toggles (lbs/kg, ft/in/cm) are small pill toggles next to the input field
- All chip/tile selections have large touch targets
- Bottom sheet scrolls independently; Save Changes button is sticky at the bottom

---

## 9. Out of Scope (This Release)

- Cooking level affecting recipe difficulty filter
- Metric/imperial unit preference persisted to the profile (UI only in this release)
- Social/OAuth sign-in
- Avatar/profile photo upload
- Email change
