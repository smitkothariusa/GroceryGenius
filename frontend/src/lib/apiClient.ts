// frontend/src/lib/apiClient.ts
import { supabase } from './supabase';
import { notifyRateLimited } from './rateLimitBridge';

// In-flight request de-duplication: if the exact same request (method + URL +
// body) is already pending, join it instead of firing a second one. Guards
// against double-clicked generate/submit buttons that race ahead of React's
// `disabled` state update (two click events can both fire before the
// re-render that disables the button lands), which would otherwise burn
// duplicate OpenAI calls or risk duplicate writes.
const inFlightRequests = new Map<string, Promise<Response>>();

/** Best-effort synchronous key for a request body. Returns null for bodies
 * we can't cheaply/safely compare (streams, Blobs, etc.) — those requests
 * are never deduped, only fetched normally. */
function bodyKey(body: BodyInit | null | undefined): string | null {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (body instanceof FormData) {
    const parts: string[] = [];
    body.forEach((value, key) => {
      if (value instanceof File) {
        parts.push(`${key}=file:${value.name}:${value.size}:${value.lastModified}`);
      } else {
        parts.push(`${key}=${value}`);
      }
    });
    return parts.sort().join('&');
  }
  if (body instanceof URLSearchParams) return body.toString();
  return null;
}

/**
 * fetch() that attaches the Supabase session access token as a Bearer token.
 * Backend API routes require it and return 401 without one.
 * Uses a Headers object so FormData bodies keep their multipart boundary.
 *
 * Also dedupes identical concurrent requests (same method + URL + body): a
 * second call made while the first is still in flight joins the first's
 * response (via `.clone()`) instead of issuing a duplicate network request.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const url = typeof input === 'string' ? input : input.toString();
  const key0 = bodyKey(init.body);
  const dedupeKey = key0 !== null ? `${method} ${url} ${key0}` : null;

  if (dedupeKey) {
    const existing = inFlightRequests.get(dedupeKey);
    if (existing) {
      const shared = await existing;
      return shared.clone();
    }
  }

  const doFetch = async (): Promise<Response> => {
    let { data: { session } } = await supabase.auth.getSession();
    // Proactively refresh an expired/near-expiry access token before sending.
    // getSession() returns the stored session as-is; supabase-js's background
    // auto-refresh timer is PAUSED while a mobile PWA is backgrounded/frozen by
    // the OS, so after the app is foregrounded the stored access token can
    // already be expired. Sending it gets a 401 from the backend — the most
    // likely cause of "authenticated requests (recipe generation etc.) fail on
    // mobile but work in a fresh incognito login." Refresh here so we never
    // send a known-expired token. If the refresh itself fails (refresh token
    // also dead), we fall through and send whatever we have; the backend 401s
    // and the caller surfaces the sign-in-again prompt.
    const nowSec = Math.floor(Date.now() / 1000);
    if (session?.expires_at && session.expires_at - nowSec < 60) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) session = refreshed.session;
    }
    const token = session?.access_token;
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(input, { ...init, headers });
    // Backend slowapi rate limits (10/min heavy, 30/min light) return 429.
    // Surface a shared "slow down" toast without disturbing each call site's
    // existing success/error handling — callers still see the raw Response.
    if (response.status === 429) notifyRateLimited();
    return response;
  };

  if (!dedupeKey) return doFetch();

  const promise = doFetch().finally(() => {
    inFlightRequests.delete(dedupeKey);
  });
  inFlightRequests.set(dedupeKey, promise);
  const response = await promise;
  return response.clone();
}
