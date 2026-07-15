import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './mobile.css'
import './mobile-responsive.css'
import './i18n'
import { initGlobalErrorHandlers } from './lib/errorService'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerSW } from 'virtual:pwa-register'
import { checkForNewVersion } from './lib/appVersion'

// Capture beforeinstallprompt before React mounts — the event fires early
// and would be missed if we only listen inside a useEffect.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__gg_install_prompt = e;
});

initGlobalErrorHandlers()

// One-time cleanup: older builds registered a service worker that cached all
// *.supabase.co responses in a 'supabase-cache' (NetworkFirst, 24h). That
// cache served stale auth/session responses on flaky networks, causing the
// client to send an expired token and get 401s on authenticated requests
// (recipe generation, etc.) — reproduced as "fails in a normal browser, works
// in incognito," surviving both app updates and sign-out/in. The runtimeCaching
// rule is gone (see vite.config.ts), but the already-populated cache lingers on
// affected devices; delete it explicitly so those users recover on next load.
caches?.delete('supabase-cache').catch(() => { /* no-op: best effort */ })

// Detecting a new service worker (below) isn't enough on its own — with
// skipWaiting+clientsClaim (registerType: 'autoUpdate'), the new worker takes
// control in the background, but the ALREADY-OPEN tab keeps running the old
// JS it already loaded until something reloads it. Reload once, automatically,
// the moment control actually changes hands, so an update check finding new
// code turns into everyone actually running it — not just the SW being ready
// in the background for whenever the user next happens to reload manually.
let reloadingForUpdate = false
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (reloadingForUpdate) return
  reloadingForUpdate = true
  window.location.reload()
})

// Independent of the service-worker update lifecycle above: compare this
// bundle's baked-in build version against version.json fetched fresh from the
// network, and hard-update if stale. This is the safety net for installed PWAs
// that resume frozen and never trigger the SW's own update check — the reason
// devices stayed on old builds (missing critical fixes) for days. Run on load
// and every foreground. See lib/appVersion.ts (conservative + reload-loop-safe).
checkForNewVersion()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForNewVersion()
})

// Browsers only re-check the SW script on their own schedule (often ~once/24h,
// and installed mobile PWAs are foregrounded far more than they're freshly
// navigated, so that check can fire even less often in practice) — this is
// why the service-worker kill switch (public/service-worker.js) took days to
// reach some phones. Force an explicit update check periodically and every
// time the app is foregrounded, so a future deploy (or a straggler still
// working through the kill switch) propagates in minutes, not a day+.
registerSW({
  onRegisterError(error) {
    // Webviews/privacy extensions can reject SW registration; not actionable.
    console.warn('Service worker registration failed:', error)
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    // registration.update() REJECTS on the entirely routine failures below, and
    // an uncaught rejection here reaches window.onunhandledrejection, which
    // logs it to error_logs as if it were an app error. That accounted for the
    // large majority of runtime:unhandledrejection rows in production
    // (~64: "Failed to update a ServiceWorker ... unknown error when fetching
    // the script", "Script sw.js load failed", "newestWorker is null",
    // "The object is in an invalid state", "Timed out while trying to start
    // the Service Worker"), drowning out real signals. All of them mean
    // "couldn't check for an update right now" — offline, flaky mobile network,
    // or no new worker to update to — which is expected and self-corrects on
    // the next check, so swallow it rather than report it.
    const checkForUpdate = () => {
      registration.update().catch(() => { /* no-op: see above */ })
    }
    // Check immediately on every load, not just on a future timer/foreground
    // event — incognito windows (no pre-existing SW registration to update
    // FROM) were loading fresh, correct code while normal windows sat on
    // whatever was previously registered until one of the periodic triggers
    // below happened to fire. Every page load is itself an opportunity to
    // check; there's no reason to wait for the first hour or backgrounding.
    checkForUpdate()
    setInterval(checkForUpdate, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary context="root" variant="root">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
