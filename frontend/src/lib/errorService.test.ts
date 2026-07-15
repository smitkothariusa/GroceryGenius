/**
 * error_logs is the production signal we debug from, so the noise filter has
 * two jobs of very unequal cost: dropping third-party junk (nice), and never
 * dropping one of our own errors (essential). The "still logs" cases below
 * matter more than the "filters" ones.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ insert: h.insert }),
  },
}));

import { logError } from './errorService';

/** The error_message that would be written, or null if nothing was logged. */
function logged(): string | null {
  if (h.insert.mock.calls.length === 0) return null;
  return h.insert.mock.calls[0][0].error_message as string;
}

beforeEach(() => {
  h.insert.mockReset();
  h.insert.mockResolvedValue({ error: null });
});

describe('third-party noise is dropped', () => {
  it('drops errors whose stack is Safari-masked injected code', async () => {
    const err = new Error("null is not an object (evaluating 'o.id')");
    err.stack = 'ui@webkit-masked-url://hidden/:264:21748';
    await logError(err, 'runtime:unhandledrejection');
    expect(logged()).toBeNull();
  });

  it('drops errors originating in a browser extension', async () => {
    const err = new Error('boom');
    err.stack = 'at chrome-extension://abcdef/inject.js:1:1';
    await logError(err, 'runtime');
    expect(logged()).toBeNull();
  });

  it('drops iOS in-app-browser WKWebView chatter', async () => {
    await logError(
      new Error('WKWebView API client did not respond to this postMessage'),
      'runtime:unhandledrejection',
    );
    expect(logged()).toBeNull();
  });

  it('drops extension tab messaging', async () => {
    await logError(new Error('Invalid call to runtime.sendMessage(). Tab not found.'), 'runtime');
    expect(logged()).toBeNull();
  });

  it('drops crypto-wallet provider probing', async () => {
    await logError(
      new Error("undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')"),
      'runtime',
    );
    expect(logged()).toBeNull();
  });

  it('drops benign ResizeObserver loop notices', async () => {
    await logError(new Error('ResizeObserver loop completed with undelivered notifications.'), 'runtime');
    expect(logged()).toBeNull();
  });
});

describe('our own errors are still logged', () => {
  it('logs an error with a stack in our own bundle', async () => {
    const err = new Error('API error: 401');
    err.stack = '@https://app.grocerygenius.org/assets/index-6ba01fd9.js:101:6085';
    await logError(err, 'api:recipes.generate');
    expect(logged()).toBe('API error: 401');
  });

  it('logs opaque errors that have no stack — they might be ours', async () => {
    await logError(new Error('Internal error'), 'runtime:unhandledrejection');
    expect(logged()).toBe('Internal error');
  });

  it('does not filter on a substring appearing in an ordinary message', async () => {
    await logError(new Error('failed to load user profile'), 'api:profile');
    expect(logged()).toBe('failed to load user profile');
  });

  it('still serializes PostgrestError-shaped objects rather than "[object Object]"', async () => {
    await logError({ message: 'permission denied', code: '42501' }, 'api:pantry.update');
    expect(logged()).toBe('message: permission denied | code: 42501');
  });
});
