# Error Logging + PWA Install Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase error logging for runtime and API failures, plus a mobile bottom banner that prompts users to install the GroceryGenius PWA.

**Architecture:** A new `errorService.ts` registers global error handlers and exposes `logError()` for use in API catch blocks. A new `InstallBanner.tsx` handles Android (native `beforeinstallprompt`), iOS Safari (manual share instruction), and other mobile (generic fallback) platforms. Both are wired into `main.tsx` and `App.tsx` respectively.

**Tech Stack:** React 18, TypeScript, Supabase JS client, react-i18next, Vite

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260710_error_logs.sql` | Table + RLS for error_logs |
| Create | `frontend/src/lib/errorService.ts` | logError() + initGlobalErrorHandlers() |
| Modify | `frontend/src/lib/database.ts` | Call logError in key API catch blocks |
| Modify | `frontend/src/main.tsx` | Call initGlobalErrorHandlers() on startup |
| Create | `frontend/src/components/InstallBanner.tsx` | PWA install prompt UI |
| Modify | `frontend/src/App.tsx` | Render `<InstallBanner />` |
| Modify | `frontend/src/locales/en/translation.json` | EN install banner strings |
| Modify | `frontend/src/locales/es/translation.json` | ES install banner strings |
| Modify | `frontend/src/locales/fr/translation.json` | FR install banner strings |
| Modify | `frontend/src/locales/de/translation.json` | DE install banner strings |
| Modify | `frontend/src/locales/zh/translation.json` | ZH install banner strings |
| Modify | `frontend/src/locales/ja/translation.json` | JA install banner strings |

---

## Task 1: Create the error_logs Supabase migration

**Files:**
- Create: `supabase/migrations/20260710_error_logs.sql`

- [ ] **Step 1: Create the migration file**

```sql
create table if not exists public.error_logs (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete set null,
  error_message text        not null,
  stack_trace   text,
  context       text        not null,
  url           text,
  created_at    timestamptz not null default now()
);

alter table public.error_logs enable row level security;

-- Allow both anonymous and authenticated users to insert error logs.
-- user_id may be null for unauthenticated sessions.
create policy "Anyone can log errors"
  on public.error_logs
  for insert
  to anon, authenticated
  with check (true);

-- No SELECT/UPDATE/DELETE policies — only readable via service role (Supabase dashboard).
```

- [ ] **Step 2: Apply the migration via the Supabase dashboard or CLI**

If using the Supabase CLI (run from repo root):
```bash
npx supabase db push
```

If applying manually: paste the SQL into the Supabase dashboard SQL editor and run it.

Verify: the `error_logs` table appears in the Supabase Table Editor with 7 columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710_error_logs.sql
git commit -m "feat: add error_logs table with anon insert RLS"
```

---

## Task 2: Create errorService.ts

**Files:**
- Create: `frontend/src/lib/errorService.ts`

- [ ] **Step 1: Write the service**

Create `frontend/src/lib/errorService.ts` with this exact content:

```typescript
import { supabase } from './supabase';

export async function logError(error: unknown, context: string): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? null) : null;
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('error_logs').insert({
      user_id: user?.id ?? null,
      error_message: message,
      stack_trace: stack,
      context,
      url: window.location.href,
    });
  } catch {
    // intentionally silent — error logging must never crash the app
  }
}

export function initGlobalErrorHandlers(): void {
  window.onerror = (_msg, _src, _line, _col, error) => {
    logError(error ?? _msg, 'runtime');
    return false;
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    logError(event.reason, 'runtime:unhandledrejection');
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors related to `errorService.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/errorService.ts
git commit -m "feat: add errorService with logError and global error handlers"
```

---

## Task 3: Wire initGlobalErrorHandlers into main.tsx

**Files:**
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Add the import and call**

Edit `frontend/src/main.tsx` to match:

```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './mobile.css'
import './mobile-responsive.css'
import './i18n'
import { initGlobalErrorHandlers } from './lib/errorService'

initGlobalErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat: init global error handlers on app startup"
```

---

## Task 4: Add logError to key API catch blocks in database.ts

**Files:**
- Modify: `frontend/src/lib/database.ts`

Target: the 4 main write services — pantry, shopping, recipes, meal plans. Find each `if (error) throw error` that follows an insert/update/delete and add a `logError` call before the throw.

- [ ] **Step 1: Add the import at the top of database.ts**

Open `frontend/src/lib/database.ts`. At the top, add:

```typescript
import { logError } from './errorService';
```

- [ ] **Step 2: Update pantryService.add**

Find the `add` method in `pantryService`. Change:
```typescript
    if (error) throw error;
    return data;
  },
```
(the one following `.insert({...}).select().single()` in `pantryService.add`)

To:
```typescript
    if (error) {
      logError(error, 'api:pantry.add');
      throw error;
    }
    return data;
  },
```

- [ ] **Step 3: Update pantryService.update**

Find `if (error) throw error` in `pantryService.update` and change to:
```typescript
    if (error) {
      logError(error, 'api:pantry.update');
      throw error;
    }
    return data;
  },
```

- [ ] **Step 4: Update shoppingService.add**

Find `if (error) throw error` in `shoppingService.add` and change to:
```typescript
    if (error) {
      logError(error, 'api:shopping.add');
      throw error;
    }
    return data;
  },
```

- [ ] **Step 5: Update recipesService.add**

Find `if (error) throw error` in `recipesService.add` and change to:
```typescript
    if (error) {
      logError(error, 'api:recipes.add');
      throw error;
    }
    return data;
  },
```

- [ ] **Step 6: Update mealPlansService.add**

Find `if (error) throw error` in `mealPlansService.add` and change to:
```typescript
    if (error) {
      logError(error, 'api:mealplans.add');
      throw error;
    }
    return data;
  },
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/database.ts
git commit -m "feat: log API errors to Supabase error_logs table"
```

---

## Task 5: Add i18n translation keys for InstallBanner

**Files:**
- Modify: all 6 locale `translation.json` files

Add the following `"install"` key to each file's top-level JSON object (before the closing `}`).

- [ ] **Step 1: Add to `frontend/src/locales/en/translation.json`**

Append before the final `}`:
```json
  "install": {
    "banner": {
      "title": "Add to Home Screen",
      "description": "Get quick access to GroceryGenius from your home screen.",
      "addButton": "Add to Home Screen",
      "iosInstruction": "Tap the Share button below, then choose \"Add to Home Screen\".",
      "dismiss": "Dismiss install banner",
      "gotIt": "Got it"
    }
  }
```

- [ ] **Step 2: Add to `frontend/src/locales/es/translation.json`**

```json
  "install": {
    "banner": {
      "title": "Agregar a la pantalla de inicio",
      "description": "Accede rápidamente a GroceryGenius desde tu pantalla de inicio.",
      "addButton": "Agregar a inicio",
      "iosInstruction": "Toca el botón Compartir y elige «Agregar a pantalla de inicio».",
      "dismiss": "Cerrar",
      "gotIt": "Entendido"
    }
  }
```

- [ ] **Step 3: Add to `frontend/src/locales/fr/translation.json`**

```json
  "install": {
    "banner": {
      "title": "Ajouter à l'écran d'accueil",
      "description": "Accédez rapidement à GroceryGenius depuis votre écran d'accueil.",
      "addButton": "Ajouter à l'accueil",
      "iosInstruction": "Appuyez sur Partager puis choisissez « Ajouter à l'écran d'accueil ».",
      "dismiss": "Fermer",
      "gotIt": "Compris"
    }
  }
```

- [ ] **Step 4: Add to `frontend/src/locales/de/translation.json`**

```json
  "install": {
    "banner": {
      "title": "Zum Startbildschirm hinzufügen",
      "description": "Schnellzugriff auf GroceryGenius von Ihrem Startbildschirm.",
      "addButton": "Zum Start hinzufügen",
      "iosInstruction": "Tippen Sie auf „Teilen" und wählen Sie „Zum Startbildschirm".",
      "dismiss": "Schließen",
      "gotIt": "Verstanden"
    }
  }
```

- [ ] **Step 5: Add to `frontend/src/locales/zh/translation.json`**

```json
  "install": {
    "banner": {
      "title": "添加到主屏幕",
      "description": "从主屏幕快速访问 GroceryGenius。",
      "addButton": "添加到主屏幕",
      "iosInstruction": "点击下方共享按钮，然后选择「添加到主屏幕」。",
      "dismiss": "关闭",
      "gotIt": "好的"
    }
  }
```

- [ ] **Step 6: Add to `frontend/src/locales/ja/translation.json`**

```json
  "install": {
    "banner": {
      "title": "ホーム画面に追加",
      "description": "ホーム画面から GroceryGenius にすばやくアクセスできます。",
      "addButton": "ホームに追加",
      "iosInstruction": "下の共有ボタンをタップして「ホーム画面に追加」を選択してください。",
      "dismiss": "閉じる",
      "gotIt": "了解"
    }
  }
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/locales/
git commit -m "feat: add i18n keys for PWA install banner (6 locales)"
```

---

## Task 6: Create InstallBanner.tsx

**Files:**
- Create: `frontend/src/components/InstallBanner.tsx`

- [ ] **Step 1: Create the component**

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'gg_install_dismissed';
const SHOW_DELAY_MS = 30_000;

function isMobileDevice(): boolean {
  return window.innerWidth < 768 && 'ontouchstart' in window;
}

function isAlreadyInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isIOSSafari(): boolean {
  return (
    isIOS() &&
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|OPiOS|mercury/i.test(navigator.userAgent)
  );
}

const InstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (
      !isMobileDevice() ||
      isAlreadyInstalled() ||
      localStorage.getItem(DISMISSED_KEY)
    ) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };

    const handleAppInstalled = () => {
      localStorage.setItem(DISMISSED_KEY, 'true');
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    const timer = setTimeout(() => {
      if (localStorage.getItem(DISMISSED_KEY)) return;

      if (deferredPrompt.current) {
        setPlatform('android');
        setVisible(true);
      } else if (isIOSSafari()) {
        setPlatform('ios');
        setVisible(true);
      }
      // Other mobile browsers (Chrome on iOS, Samsung without prompt, etc.) — skip
    }, SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
    deferredPrompt.current = null;
    setVisible(false);
  };

  if (!visible || !platform) return null;

  return (
    <div
      role="banner"
      aria-label={t('install.banner.title')}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        zIndex: 9999,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <span style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}>📱</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
          {t('install.banner.title')}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.4 }}>
          {platform === 'ios'
            ? t('install.banner.iosInstruction')
            : t('install.banner.description')}
        </div>

        {platform === 'android' && (
          <button
            onClick={handleInstall}
            style={{
              marginTop: '0.75rem',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {t('install.banner.addButton')}
          </button>
        )}

        {platform === 'ios' && (
          <button
            onClick={handleDismiss}
            style={{
              marginTop: '0.5rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem 1rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {t('install.banner.gotIt')}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label={t('install.banner.dismiss')}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};

export default InstallBanner;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/InstallBanner.tsx
git commit -m "feat: add InstallBanner PWA home screen prompt for mobile"
```

---

## Task 7: Integrate InstallBanner into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add the import**

Near the top of `App.tsx` where other component imports are (alongside `FeedbackButton`, `TourOverlay`, etc.), add:

```typescript
import InstallBanner from './components/InstallBanner';
```

- [ ] **Step 2: Render the component**

Find the final `<FeedbackButton isMobile={isMobile} />` line near the end of the JSX return and add `<InstallBanner />` directly after it, before the closing `</div>`:

```tsx
      <FeedbackButton isMobile={isMobile} />
      <InstallBanner />
    </div>
  );
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify the build succeeds**

```bash
cd frontend && npm run build
```

Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: render InstallBanner in App"
```

---

## Task 8: Push to dev

- [ ] **Step 1: Confirm we're on dev and push**

```bash
git status
git log --oneline -5
git push origin dev
```

Expected: push succeeds, Vercel triggers a deployment to dev.grocerygenius.org.

- [ ] **Step 2: Verify deployment**

Wait ~1-2 minutes, then check https://dev.grocerygenius.org. The app should load normally. No visible errors in browser console.

To test the install banner without waiting 30 seconds: open DevTools → Application → Local Storage → delete `gg_install_dismissed` if present, then run in the console:

```javascript
// Manually trigger the banner early (Chrome DevTools)
// In Chrome, use "Add to home screen" under the install icon in the address bar
// On mobile, visit the dev URL and wait 30s
```

To test error logging: open DevTools console and run:
```javascript
// Trigger an unhandled rejection
Promise.reject(new Error('test error from console'));
// Then check Supabase dashboard → Table Editor → error_logs
```
