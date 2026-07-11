# 09 — Investigate & Fix Pantry Expiry Boundary Logic

**Priority:** 🟠 High
**Effort:** S (half day)
**Status:** NOT STARTED

Original claim: items expiring today are wrongly flagged as "expiring
soon." Current code (`pantry.py`, pre-[task 01](01-pantry-persistence.md)
migration) is `0 <= days_until_expiry <= 3`, which already includes day 0 —
on inspection this looks like *correct* behavior (today counts as expiring
soon), not an off-by-one bug. **Don't assume the bug as originally
described is real.** Start by writing a test that encodes the actually
desired behavior (confirm with whoever owns the product decision: should
day-0 items count as "expiring soon" or as already "expired" and shown
separately?), see it fail or pass against current logic, and only change
code if the test reveals a real discrepancy. This logic will move as part
of the [task 01](01-pantry-persistence.md) migration — coordinate order of
work so this isn't fixed twice in two different files.
