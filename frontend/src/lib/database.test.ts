/**
 * Regression tests for the pantry/shopping "update a row that's already gone"
 * case. Both updates used .select().single(), which raises PGRST116 ("Cannot
 * coerce the result to a single JSON object", 0 rows) when the target row no
 * longer exists — logged in production as api:pantry.update noise. A 0-row
 * update should be a silent no-op (return null), not an error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  // Result the terminal maybeSingle()/single() resolves to; set per test.
  result: { data: null as unknown, error: null as unknown },
  lastTerminal: '' as string,
  logError: vi.fn(),
}));

// Chainable query builder: every builder method returns the same object; the
// terminal maybeSingle()/single() resolves to h.result and records which one
// was called (so we can assert we no longer use single()).
function makeBuilder() {
  const q: any = {};
  for (const m of ['from', 'select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'limit']) {
    q[m] = vi.fn(() => q);
  }
  q.single = vi.fn(() => { h.lastTerminal = 'single'; return Promise.resolve(h.result); });
  q.maybeSingle = vi.fn(() => { h.lastTerminal = 'maybeSingle'; return Promise.resolve(h.result); });
  return q;
}

vi.mock('./supabase', () => ({
  supabase: { from: (..._a: any[]) => makeBuilder() },
}));

vi.mock('./errorService', () => ({
  logError: (...a: any[]) => h.logError(...a),
}));

import { pantryService, shoppingService } from './database';

beforeEach(() => {
  h.result = { data: null, error: null };
  h.lastTerminal = '';
  h.logError.mockReset();
});

describe('pantryService.update when the row is gone (0 rows)', () => {
  it('returns null without throwing or logging', async () => {
    h.result = { data: null, error: null }; // maybeSingle → no row, no error
    const out = await pantryService.update('missing-id', { name: 'x', quantity: 1, unit: 'pc', category: 'c' });
    expect(out).toBeNull();
    expect(h.logError).not.toHaveBeenCalled();
    expect(h.lastTerminal).toBe('maybeSingle'); // not single() — the PGRST116 source
  });

  it('returns the updated row when it exists', async () => {
    const row = { id: 'i1', name: 'x', quantity: 2, unit: 'pc', category: 'c' };
    h.result = { data: row, error: null };
    const out = await pantryService.update('i1', { name: 'x', quantity: 2, unit: 'pc', category: 'c' });
    expect(out).toEqual(row);
    expect(h.logError).not.toHaveBeenCalled();
  });

  it('still logs and throws on a real (non-PGRST116) error', async () => {
    h.result = { data: null, error: { message: 'permission denied', code: '42501' } };
    await expect(
      pantryService.update('i1', { name: 'x', quantity: 1, unit: 'pc', category: 'c' }),
    ).rejects.toBeTruthy();
    expect(h.logError).toHaveBeenCalledWith(expect.anything(), 'api:pantry.update');
  });
});

describe('shoppingService.update when the row is gone (0 rows)', () => {
  it('returns null without throwing', async () => {
    h.result = { data: null, error: null };
    const out = await shoppingService.update('missing-id', { checked: true });
    expect(out).toBeNull();
    expect(h.lastTerminal).toBe('maybeSingle');
  });
});
