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

registerSW({
  onRegisterError(error) {
    // Webviews/privacy extensions can reject SW registration; not actionable.
    console.warn('Service worker registration failed:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary context="root" variant="root">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
