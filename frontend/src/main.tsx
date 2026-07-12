import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './mobile.css'
import './mobile-responsive.css'
import './i18n'
import { initGlobalErrorHandlers } from './lib/errorService'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerSW } from 'virtual:pwa-register'

// Capture beforeinstallprompt before React mounts — the event fires early
// and would be missed if we only listen inside a useEffect.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__gg_install_prompt = e;
});

initGlobalErrorHandlers()

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
    setInterval(() => registration.update(), 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update()
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
