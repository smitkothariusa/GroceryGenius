// frontend/src/lib/apiClient.ts
import { supabase } from './supabase';
import { notifyRateLimited } from './rateLimitBridge';
import { logError } from './errorService';

// In-flight request de-duplication: if the exact same request (method + URL +
// body) is already pending, join it instead of firing a second one. Guards
// against double-clicked generate/submit buttons that race ahead of React's
// `disabled` state update (two click events can both fire before the
// re-render that disables the button lands), which would otherwise burn
// duplicate OpenAI calls or risk duplicate writes.
const inFlightRequests = new Map<string, Promise<Response>>();

/**
 * Dispatched on window when authFetch conclusively determines the stored
 * session is gone (a refresh was attempted and Supabase reported no session /
 * a dead refresh token — NOT a transient network failure). App listens and
 * bounces the user to the sign-in screen. Without this, a session that dies
 * mid-use left the app "half logged in": `user` state stayed truthy so the
 * authed UI kept rendering, and every authFetch went out tokenless and 401'd —
 * which looped the barcode scanner firing lookups forever and produced a
 * 170-in-an-hour burst of api:authFetch.no-token rows.
 */
export const AUTH_SESSION_LOST_EVENT = 'gg-auth-session-lost';

// Dispatch the event at most once per lost session. Reset when a token is
// next successfully attached (a healthy session), so a later death after
// re-login can signal again.
let sessionLostSignaled = false;

/**
 * Only bounce to sign-in on a CONCLUSIVE session loss. Matching known
 * "session/refresh-token is gone" errors (and nothing else) keeps a transient
 * network failure during refresh — where the user may still have a valid
 * session that's momentarily unreachable — from wrongly logging them out.
 */
function signalSessionLostIfConclusive(refreshOutcome: string | null): void {
  if (sessionLostSignaled || !refreshOutcome) return;
  const m = refreshOutcome.toLowerCase();
  const conclusive =
    m.includes('auth session missing') ||
    m.includes('refresh_token_not_found') ||
    m.includes('refresh token not found') ||
    m.includes('invalid refresh token') ||
    m.includes('already used');
  if (!conclusive) return;
  sessionLostSignaled = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_LOST_EVENT));
  }
}

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
    // Ensure we have a usable, non-expired token before sending. Two mobile
    // failure modes make getSession() insufficient on its own, both of which
    // caused authenticated requests to go out tokenless and 401 with "missing
    // authorization header" (confirmed in backend logs):
    //   1. getSession() returns a NULL session when the supabase-js auth lock
    //      is contended by a frozen backgrounded PWA/tab (root cause — see the
    //      processLock change in lib/supabase.ts, which prevents this).
    //   2. The stored access token is expired because supabase-js's background
    //      auto-refresh timer was paused while the PWA was frozen.
    // In either case, force a refresh from the stored refresh token so we don't
    // fire an unauthenticated request. If the refresh itself fails (refresh
    // token also dead), we fall through and the backend 401s -> the caller
    // surfaces the sign-in-again prompt (unchanged).
    const nowSec = Math.floor(Date.now() / 1000);
    const tokenMissingOrStale =
      !session || (session.expires_at != null && session.expires_at - nowSec < 60);
    let refreshOutcome: string | null = null;
    if (tokenMissingOrStale) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshed.session) {
        session = refreshed.session;
        refreshOutcome = 'refreshed-ok';
      } else {
        refreshOutcome = `refresh-null:${refreshErr?.message ?? 'no-error'}`;
      }
    }
    const token = session?.access_token;
    const headers = new Headers(init.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      sessionLostSignaled = false; // healthy session — re-arm the signal
    } else {
      // No token after a refresh attempt. Log why (diagnostic), and — if the
      // refresh conclusively reported the session is gone — bounce the user to
      // sign-in rather than leaving them half-logged-in firing tokenless 401s.
      // The request below still goes out and 401s so this call's caller sees
      // its usual failure, but the sign-out stops any repeating caller (e.g.
      // the scanner loop) from firing again.
      logError(
        `authFetch sending request with no token — finalSessionPresent=${session ? 'y' : 'n'} refreshOutcome=${refreshOutcome ?? 'not-attempted'}`,
        'api:authFetch.no-token',
      );
      signalSessionLostIfConclusive(refreshOutcome);
    }
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
