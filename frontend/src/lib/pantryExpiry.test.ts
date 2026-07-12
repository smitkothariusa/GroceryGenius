import { describe, it, expect } from 'vitest';
import { isExpiringSoon, daysUntilExpiry, parseLocalDate } from './pantryExpiry';

const DAY = 1000 * 60 * 60 * 24;
// Fixed reference "now" so the tests are deterministic regardless of the
// machine's clock or timezone.
const NOW = new Date('2026-07-11T12:00:00Z');
const dateOnly = (d: Date) => d.toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// Reproductions of the two PRE-FIX implementations that used to live in
// App.tsx, kept here only to lock in (a) that they genuinely disagreed and
// (b) that the new shared predicate matches the one the codebase treated as
// correct (getExpiringItems' day-0-inclusive ceil model).
// ---------------------------------------------------------------------------
const oldGetExpiringItemsPredicate = (item: { expiryDate?: string }, now: Date) => {
  if (!item.expiryDate) return false;
  const daysUntil = Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / DAY);
  return daysUntil <= 3 && daysUntil >= 0;
};
const oldIsExpiringSoon = (item: { expiryDate?: string }, now: Date) => {
  if (!item.expiryDate) return false;
  const diff = new Date(item.expiryDate).getTime() - now.getTime();
  return diff > 0 && diff < 3 * DAY;
};

describe('parseLocalDate — off-by-one regression guard', () => {
  it('parses a YYYY-MM-DD string to the SAME calendar day, regardless of machine timezone', () => {
    // The bug: `new Date("2026-07-15")` parses as UTC midnight. Calling
    // `.toLocaleDateString()` on that then renders in the machine's local
    // timezone — for any timezone west of UTC (all of the Americas), that
    // shifts the displayed/computed date back to July 14th. parseLocalDate
    // must return a Date whose calendar-day fields exactly match the input
    // string, independent of the runner's timezone offset.
    const d = parseLocalDate('2026-07-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // 0-indexed: July
    expect(d.getDate()).toBe(15);
  });
});

describe('pantryExpiry — historical disagreement (regression guard)', () => {
  it('the two old implementations disagreed for an item expiring today', () => {
    // expiryDate is stored as a date-only YYYY-MM-DD string (App.tsx line ~2097).
    const item = { expiryDate: dateOnly(NOW) };
    // getExpiringItems INCLUDED today (drove the red row background + the
    // "expiring soon" donate list)...
    expect(oldGetExpiringItemsPredicate(item, NOW)).toBe(true);
    // ...but isExpiringSoon EXCLUDED it (so the `.expiring-soon` row class was
    // never applied to a today item). This is the user-visible inconsistency.
    expect(oldIsExpiringSoon(item, NOW)).toBe(false);
  });

  it("the prompt's proposed one-line fix (diff > 0 -> diff >= 0) would NOT have fixed it", () => {
    const item = { expiryDate: dateOnly(NOW) };
    const proposedFix = (i: { expiryDate?: string }, now: Date) => {
      if (!i.expiryDate) return false;
      const diff = new Date(i.expiryDate).getTime() - now.getTime();
      return diff >= 0 && diff < 3 * DAY; // >= 0 instead of > 0
    };
    // Still false: a date-only "today" string parses to UTC midnight, so the
    // raw-ms diff is negative — the >=0 tweak doesn't help. Hence the real fix
    // unifies isExpiringSoon onto getExpiringItems' ceil-day model instead.
    expect(proposedFix(item, NOW)).toBe(false);
  });
});

describe('pantryExpiry.isExpiringSoon — fixed, day-0-inclusive', () => {
  it('includes an item expiring exactly today (day 0)', () => {
    expect(isExpiringSoon({ expiryDate: dateOnly(NOW) }, NOW)).toBe(true);
  });

  it('includes items 1, 2 and 3 days out', () => {
    for (const off of [1, 2, 3]) {
      const item = { expiryDate: dateOnly(new Date(NOW.getTime() + off * DAY)) };
      expect(isExpiringSoon(item, NOW)).toBe(true);
    }
  });

  it('excludes items 4+ days out', () => {
    const item = { expiryDate: dateOnly(new Date(NOW.getTime() + 4 * DAY)) };
    expect(isExpiringSoon(item, NOW)).toBe(false);
  });

  it('excludes already-expired items and items with no expiry date', () => {
    expect(isExpiringSoon({ expiryDate: dateOnly(new Date(NOW.getTime() - DAY)) }, NOW)).toBe(false);
    expect(isExpiringSoon({}, NOW)).toBe(false);
  });

  it('exposes the underlying day count via daysUntilExpiry', () => {
    // Math.ceil can yield -0 for a today item; treat it as 0.
    expect(daysUntilExpiry({ expiryDate: dateOnly(NOW) }, NOW)).toBeCloseTo(0);
    expect(daysUntilExpiry({}, NOW)).toBeNull();
  });
});

describe('pantryExpiry — list inclusion and row styling now agree', () => {
  it('day-0-inclusive semantics hold across the clock and offsets, independent of machine timezone', () => {
    // NOTE: this used to assert isExpiringSoon matched
    // oldGetExpiringItemsPredicate exactly, but that predicate parses
    // expiryDate via the UTC-midnight `new Date(str)` — the very bug fixed by
    // daysUntilExpiry/isExpiringSoon switching to parseLocalDate (see
    // pantryExpiry.ts). Asserting equality against the old UTC-based
    // predicate would now correctly FAIL on any machine not running in UTC.
    // Instead, verify the day-0-inclusive/ceil model is self-consistent
    // regardless of the runner's timezone.
    for (let h = 0; h < 48; h++) {
      const now = new Date(NOW.getTime() + h * 3600 * 1000);
      for (let off = -2; off <= 6; off++) {
        const item = { expiryDate: dateOnly(new Date(now.getTime() + off * DAY)) };
        const days = daysUntilExpiry(item, now)!;
        expect(isExpiringSoon(item, now)).toBe(days >= 0 && days <= 3);
      }
    }
  });

  it('a today item is BOTH in the expiring list and flagged for row styling', () => {
    const pantry = [{ id: '1', expiryDate: dateOnly(NOW) }];
    // Mirrors App.tsx: getExpiringItems() filters with isExpiringSoon, and the
    // row `.expiring-soon` class also comes from isExpiringSoon.
    const inList = pantry.filter(i => isExpiringSoon(i, NOW)).some(e => e.id === '1');
    const rowStyled = isExpiringSoon(pantry[0], NOW);
    expect(inList).toBe(true);
    expect(rowStyled).toBe(true);
    expect(inList).toBe(rowStyled);
  });
});
