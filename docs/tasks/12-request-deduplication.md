# 12 — Request Deduplication

**Priority:** 🟠 High
**Effort:** S (half day)
**Status:** NOT STARTED

Double-clicking a generate/submit button in the frontend can fire multiple
concurrent identical requests (recipe generation, price comparison, etc.),
wasting OpenAI calls and risking duplicate writes. Add an in-flight request
guard in `lib/apiClient.ts`'s `authFetch` (or at the call site for the
specific buttons affected) — disable the trigger while a request is
pending, and/or dedupe identical concurrent requests by key. Verify against
the actual buttons affected before assuming this needs to be global.
