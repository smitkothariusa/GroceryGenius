import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase client and the rate-limit bridge before importing authFetch.
// vi.hoisted keeps these defined before the hoisted vi.mock factories run.
const { getSession, refreshSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}));
vi.mock('./supabase', () => ({
  supabase: { auth: { getSession, refreshSession } },
}));
vi.mock('./rateLimitBridge', () => ({ notifyRateLimited: vi.fn() }));
vi.mock('./errorService', () => ({ logError: vi.fn() }));

import { authFetch, AUTH_SESSION_LOST_EVENT } from './apiClient';
import { logError } from './errorService';

const NOW_SEC = 1_000_000;

function sessionExpiringIn(deltaSec: number, token: string) {
  return { data: { session: { access_token: token, expires_at: NOW_SEC + deltaSec } } };
}

describe('authFetch — proactive token refresh', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getSession.mockReset();
    refreshSession.mockReset();
    vi.spyOn(Date, 'now').mockReturnValue(NOW_SEC * 1000);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  it('refreshes and uses the new token when the stored one is expired/near-expiry', async () => {
    getSession.mockResolvedValue(sessionExpiringIn(30, 'stale-token')); // 30s left (< 60s guard)
    refreshSession.mockResolvedValue(sessionExpiringIn(3600, 'fresh-token'));

    await authFetch('https://api.example.com/x', { method: 'POST', body: 'unique-body-1' });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    const headers = (globalThis.fetch as any).mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('refreshes and uses the new token when getSession returns a NULL session (the mobile lock bug)', async () => {
    // The actual production failure: getSession() returned null (auth lock
    // contended on a frozen mobile PWA), so authFetch sent no Authorization
    // header and the backend 401'd with "missing authorization header".
    getSession.mockResolvedValue({ data: { session: null } });
    refreshSession.mockResolvedValue(sessionExpiringIn(3600, 'recovered-token'));

    await authFetch('https://api.example.com/nullsession', { method: 'POST', body: 'unique-body-null' });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    const headers = (globalThis.fetch as any).mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer recovered-token');
  });

  it('does NOT refresh when the stored token is comfortably valid', async () => {
    getSession.mockResolvedValue(sessionExpiringIn(3600, 'good-token')); // 1h left

    await authFetch('https://api.example.com/y', { method: 'POST', body: 'unique-body-2' });

    expect(refreshSession).not.toHaveBeenCalled();
    const headers = (globalThis.fetch as any).mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer good-token');
  });

  it('falls through with the existing token if the refresh itself fails', async () => {
    getSession.mockResolvedValue(sessionExpiringIn(10, 'stale-token'));
    refreshSession.mockResolvedValue({ data: { session: null } }); // refresh token also dead

    await authFetch('https://api.example.com/z', { method: 'POST', body: 'unique-body-3' });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    const headers = (globalThis.fetch as any).mock.calls[0][1].headers as Headers;
    // Still sends the stale token; the backend 401s and the caller prompts re-login.
    expect(headers.get('Authorization')).toBe('Bearer stale-token');
  });

  it('logs a diagnostic (and sends no auth header) when no token can be obtained at all', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'refresh_token_not_found' } });

    await authFetch('https://api.example.com/notoken', { method: 'POST', body: 'unique-body-notoken' });

    const headers = (globalThis.fetch as any).mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
    expect(logError).toHaveBeenCalledTimes(1);
    expect((logError as any).mock.calls[0][1]).toBe('api:authFetch.no-token');
  });
});

describe('authFetch — session-lost sign-in bounce', () => {
  let events: number;
  const onLost = () => { events++; };

  beforeEach(async () => {
    vi.restoreAllMocks();
    getSession.mockReset();
    refreshSession.mockReset();
    vi.spyOn(Date, 'now').mockReturnValue(NOW_SEC * 1000);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    window.addEventListener(AUTH_SESSION_LOST_EVENT, onLost);
    // The once-per-loss flag is module-global and leaks across tests. Re-arm it
    // the same way production does — a healthy session attaching a token resets
    // it — then zero the counter so each test starts armed and clean.
    getSession.mockResolvedValue(sessionExpiringIn(3600, 'rearm-token'));
    await authFetch('https://api.example.com/rearm', { method: 'POST', body: `b-rearm-${Math.random()}` });
    events = 0;
    (logError as any).mockClear(); // shared mock accumulates across tests
  });
  afterEach(() => {
    window.removeEventListener(AUTH_SESSION_LOST_EVENT, onLost);
  });

  it('dispatches the bounce event when refresh reports the session is gone', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'Auth session missing!' } });

    await authFetch('https://api.example.com/gone', { method: 'POST', body: 'b-gone' });
    expect(events).toBe(1);
  });

  it('does NOT dispatch on a transient network failure during refresh (keeps the user signed in)', async () => {
    // The user may still have a valid session that's momentarily unreachable —
    // logging them out here would be a false positive.
    getSession.mockResolvedValue({ data: { session: null } });
    refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'Failed to fetch' } });

    await authFetch('https://api.example.com/net', { method: 'POST', body: 'b-net' });
    expect(events).toBe(0);
    // Still logs the diagnostic — we just don't force sign-out on it.
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('dispatches only once across repeated tokenless calls (no sign-out storm)', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid Refresh Token' } });

    await authFetch('https://api.example.com/a', { method: 'POST', body: 'b-a' });
    await authFetch('https://api.example.com/b', { method: 'POST', body: 'b-b' });
    await authFetch('https://api.example.com/c', { method: 'POST', body: 'b-c' });
    expect(events).toBe(1);
  });

  it('re-arms after a healthy session: a later loss dispatches again', async () => {
    // Lost once…
    getSession.mockResolvedValue({ data: { session: null } });
    refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'Auth session missing!' } });
    await authFetch('https://api.example.com/lost1', { method: 'POST', body: 'b-lost1' });
    expect(events).toBe(1);

    // …then a healthy request re-arms the signal…
    getSession.mockResolvedValue(sessionExpiringIn(3600, 'good-token'));
    await authFetch('https://api.example.com/ok', { method: 'POST', body: 'b-ok' });
    expect(events).toBe(1);

    // …so a second loss dispatches again.
    getSession.mockResolvedValue({ data: { session: null } });
    await authFetch('https://api.example.com/lost2', { method: 'POST', body: 'b-lost2' });
    expect(events).toBe(2);
  });
});
