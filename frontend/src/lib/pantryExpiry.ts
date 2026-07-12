// Shared source of truth for pantry "expiring soon" logic.
//
// Historically App.tsx had TWO separate implementations of this check:
//   - getExpiringItems() used a ceil-based whole-day model that was day-0
//     (today) INCLUSIVE.
//   - isExpiringSoon() used a raw-millisecond `diff > 0` model that EXCLUDED
//     today (and, because expiryDate is stored as a date-only `YYYY-MM-DD`
//     string that parses to UTC midnight, actually excluded today entirely).
// They therefore disagreed for an item expiring exactly today: it appeared in
// the "expiring soon" list / got the red row background, but did NOT get the
// `.expiring-soon` row styling. Both now delegate here so they can't diverge.

const DAY_MS = 1000 * 60 * 60 * 24;

/** Parses a date-only `YYYY-MM-DD` string as a LOCAL calendar date (midnight
 * in the browser's timezone). `new Date("YYYY-MM-DD")` parses as UTC
 * midnight instead, which made expiry dates display and compute as one day
 * earlier than what the user entered in any timezone west of UTC (e.g. all
 * of the US) — `.toLocaleDateString()` on a UTC-midnight Date renders the
 * previous day once shifted into a negative-offset local timezone. */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** How many whole calendar-days until the item expires (day-0-inclusive,
 * matching the ceil model the pantry UI committed to). `null` if no expiry. */
export function daysUntilExpiry(
  item: { expiryDate?: string },
  now: Date = new Date(),
): number | null {
  if (!item.expiryDate) return null;
  return Math.ceil((parseLocalDate(item.expiryDate).getTime() - now.getTime()) / DAY_MS);
}

/** True when the item expires within the next 3 days, INCLUDING today (day 0). */
export function isExpiringSoon(
  item: { expiryDate?: string },
  now: Date = new Date(),
): boolean {
  const days = daysUntilExpiry(item, now);
  return days !== null && days >= 0 && days <= 3;
}
