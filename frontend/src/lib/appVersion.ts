// Build-time version string, injected by vite `define` (see vite.config.ts).
// version.json (emitted with the SAME value at build time) is fetched at
// runtime to detect when the running bundle is stale.
declare const __APP_VERSION__: string;

/**
 * Pure decision helper (unit-tested): reload ONLY when we have a concrete,
 * non-empty latest version that differs from the one baked into the running
 * bundle. Deliberately conservative — a missing/blank/non-string `latest` (a
 * bad fetch, an HTML error page parsed as JSON, etc.) must never trigger a
 * reload, or we could brick clients with a reload loop.
 */
export function shouldReload(current: string | undefined, latest: unknown): boolean {
  return (
    typeof latest === 'string' &&
    latest.length > 0 &&
    typeof current === 'string' &&
    current.length > 0 &&
    latest !== current
  );
}

let checking = false;

/**
 * Detects when the running PWA bundle is stale and force-updates it.
 *
 * Installed mobile PWAs often RESUME from a frozen state instead of doing a
 * fresh navigation, so the service worker's own update check may not fire for a
 * long time and the app keeps running old code (this is what left users stuck on
 * builds missing critical fixes). This is an independent safety net that does
 * NOT depend on the SW update lifecycle: fetch version.json from the network
 * (bypassing every cache), and if it differs from the build version baked into
 * this bundle, tear down the service worker + its caches and hard-reload onto
 * fresh code. No-ops on any error so it never reloads spuriously (e.g. offline).
 *
 * Reload-loop safety: after the reload, the freshly-fetched bundle's
 * __APP_VERSION__ equals version.json, so shouldReload() returns false and it
 * settles. The conservative shouldReload() guards against a stale/garbage
 * version.json triggering an endless loop.
 */
export async function checkForNewVersion(): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    // Unique query + no-store defeats both browser and CDN caching of the file.
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const current = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined;
    if (!shouldReload(current, data?.version)) return;

    // Stale: remove the SW and clear caches so the reload comes fully from the
    // network (not the SW's precached old shell), then hard-reload.
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
    window.location.reload();
  } catch {
    // Offline or transient failure — never reload spuriously.
  } finally {
    checking = false;
  }
}
