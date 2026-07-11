/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
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
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
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