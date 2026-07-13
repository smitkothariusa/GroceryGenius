/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// One version string per build. Baked into the bundle via `define` below AND
// emitted as version.json (same value) so the running app can fetch version.json
// at runtime and detect when it's stale — the force-update safety net for
// installed PWAs that resume frozen and never run the SW's own update check.
// See src/lib/appVersion.ts.
const APP_VERSION = Date.now().toString();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  plugins: [
    react(),
    {
      // Emit version.json alongside the build with the SAME APP_VERSION baked
      // into the bundle. Not matched by the workbox precache glob (js/css/html/
      // ico/png/svg only), so it is never service-worker-cached and always
      // reflects the freshly-deployed build.
      name: 'gg-emit-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: APP_VERSION }),
        });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      // Registration lives in main.tsx (virtual:pwa-register) so rejection is
      // handled — the auto-injected registerSW.js registers unguarded and
      // spams error_logs from webviews that stub out serviceWorker.register.
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'GroceryGenius',
        short_name: 'GroceryG',
        theme_color: '#667eea',
        background_color: '#667eea',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // IMPORTANT: do NOT add a runtimeCaching rule for *.supabase.co.
        // A NetworkFirst cache of Supabase requests (previously here) served
        // STALE cached auth/session responses on flaky mobile networks, so the
        // client sent an expired token and the backend 401'd — recipe (and any
        // authenticated) requests failed. It reproduced exactly as reported:
        // normal browsers (which had the poisoned cache) failed while incognito
        // (no service worker, no cache) worked, and it survived both app-bundle
        // updates and sign-out/in because the workbox cache is separate from
        // both the app shell and the localStorage session. Caching
        // authenticated API/auth responses in a service worker is an
        // anti-pattern; Supabase must always hit the network. See
        // main.tsx for the one-time cleanup that deletes the leftover
        // 'supabase-cache' on already-affected clients.
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Dummy values only -- src/lib/supabase.ts throws at import time if these
    // are unset, and CI has no real Supabase env vars for the frontend job.
    // Not secrets: no live project is reachable at this URL/key.
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  }
});