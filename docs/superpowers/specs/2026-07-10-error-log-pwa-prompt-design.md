# Design Spec: Error Logging + PWA Home Screen Prompt

**Date:** 2026-07-10  
**Branch:** `demo` (pushed after implementation for testing)

---

## Feature 1 — Supabase Error Logging

### Goal

Capture both JavaScript runtime errors and API failures in a Supabase table so production issues are visible without needing user reports.

### Database

New table `error_logs`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Default `gen_random_uuid()` |
| `user_id` | `uuid` | Nullable (FK to `auth.users`), captures anonymous errors |
| `error_message` | `text` | `error.message` or stringified error |
| `stack_trace` | `text` | Nullable, `error.stack` |
| `context` | `text` | e.g. `"runtime"`, `"api:pantry.add"`, `"api:recipes.create"` |
| `url` | `text` | `window.location.href` at time of error |
| `created_at` | `timestamptz` | Default `now()` |

Row-level security: insert allowed for all (including anon), select/update/delete restricted to service role only. Errors from unauthenticated users must still be captured.

Migration file: `supabase/migrations/20260710_error_logs.sql`

### Service

New file `frontend/src/lib/errorService.ts`:

- `logError(error: unknown, context: string): Promise<void>` — gets current user (nullable), inserts row into `error_logs`. Never throws — wrapped in try/catch so error logging itself can't crash the app.
- `initGlobalErrorHandlers(): void` — registers:
  - `window.onerror` → calls `logError` with context `"runtime"`
  - `window.onunhandledrejection` → calls `logError` with context `"runtime:unhandledrejection"`

### Integration

- `main.tsx`: call `initGlobalErrorHandlers()` on startup (before rendering React tree)
- Existing service catch blocks in `frontend/src/lib/database.ts`: add `logError(error, "api:<service>.<method>")` calls where errors are thrown. Target the most impactful ones: pantry, shopping, recipes, meal plans.

### i18n

No user-visible strings — logging is silent and background.

---

## Feature 2 — PWA Home Screen Install Prompt

### Goal

Prompt mobile users once to add GroceryGenius to their home screen as a PWA shortcut, using a bottom banner that appears 30 seconds after first visit.

### Detection

Show the banner only when ALL of these are true:
1. Device is mobile — `window.innerWidth < 768` AND `'ontouchstart' in window`
2. App is not already installed — `window.matchMedia('(display-mode: standalone)').matches === false`
3. User has not previously dismissed or installed — `localStorage.getItem('gg_install_dismissed')` is null

### Platform Handling

- **Android / Chrome**: listen for `beforeinstallprompt` event, store the `deferredPrompt`, trigger `deferredPrompt.prompt()` on button tap
- **iOS Safari**: detect via `navigator.userAgent` containing `iPhone|iPad|iPod` and browser is Safari (not Chrome/Firefox). Show static instruction: "Tap the Share button → 'Add to Home Screen'"
- **Other mobile browsers** (Samsung, Firefox): show generic instruction text as fallback if `beforeinstallprompt` is not available

### Timing & Persistence

- Banner appears after **30-second delay** on first qualifying visit
- On dismiss (X button): set `localStorage.getItem('gg_install_dismissed') = 'true'`, never show again
- On successful Android install (`appinstalled` event fires): set same key, hide banner
- On iOS, "Got it" button sets the dismissed key

### Component

New file `frontend/src/components/InstallBanner.tsx`:
- Fixed to bottom of screen, full width, above any bottom nav
- Matches existing purple-blue gradient and system-ui font
- Two variants: Android (with "Add to Home Screen" action button) and iOS (with Share icon illustration + instruction text)
- Dismissable with an X in the top-right corner
- Accessible: role `banner`, aria-label, keyboard-dismissable

### i18n

New translation keys needed in all 6 locale files (`en`, `es`, `fr`, `de`, `zh`, `ja`):

```
install.banner.title
install.banner.description
install.banner.addButton       # Android CTA
install.banner.iosInstruction  # "Tap Share → Add to Home Screen"
install.banner.dismiss         # aria-label for X button
install.banner.gotIt           # iOS confirmation button
```

### Integration

- `App.tsx`: render `<InstallBanner />` near the bottom of the JSX tree, outside any tab panels

---

## Out of Scope

- Error log viewer UI in the app (view errors directly in Supabase dashboard)
- Error alerting / PagerDuty / email notifications
- Sampling or rate-limiting error logs (low volume app, log everything)
- Push notifications
