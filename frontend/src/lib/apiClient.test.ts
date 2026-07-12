import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { authFetch } from './apiClient';

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
});
