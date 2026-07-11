// frontend/src/lib/rateLimitBridge.ts
/**
 * Tiny event bridge so `authFetch` (a plain async function, not a React
 * hook/component) can notify the toast-owning component about a 429
 * rate-limit response from the backend, without needing to call the
 * `useToast()` hook itself.
 *
 * `authFetch` calls `notifyRateLimited()` on every 429 it sees; the
 * component that owns the toast state (App.tsx) calls `onRateLimited()`
 * once, in a `useEffect`, to subscribe and show a "slow down" toast.
 */

const RATE_LIMIT_EVENT = 'gg:rate-limited';

// Debounce window: a burst of 429s (e.g. several in-flight requests hitting
// the limit at once) should only surface a single toast.
const DEDUPE_WINDOW_MS = 5000;

let lastNotifiedAt = 0;

/** Notify subscribers that a request was rate-limited (HTTP 429). Debounced. */
export function notifyRateLimited(): void {
  const now = Date.now();
  if (now - lastNotifiedAt < DEDUPE_WINDOW_MS) return;
  lastNotifiedAt = now;
  window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT));
}

/**
 * Subscribe to rate-limit notifications. Returns an unsubscribe function
 * for use as a `useEffect` cleanup.
 */
export function onRateLimited(handler: () => void): () => void {
  window.addEventListener(RATE_LIMIT_EVENT, handler);
  return () => window.removeEventListener(RATE_LIMIT_EVENT, handler);
}
