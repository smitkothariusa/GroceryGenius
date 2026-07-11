# 14 — Expand Frontend Test Coverage

**Priority:** 🟠 High
**Effort:** M (1-2 days)
**Status:** NOT STARTED

Builds on the Vitest + Testing Library baseline set up in
[task 03](03-backend-tests.md). Add component-level tests for the
higher-risk interactive pieces: recipe generation flow, pantry add/delete,
shopping list, the receipt scanner (camera capture — recently shipped,
currently untested at the frontend level), and i18n string rendering across
at least 2 of the 6 languages to catch missing-translation-key regressions.
Prioritize by what's changed most recently / is most fragile rather than
chasing 100% coverage.
