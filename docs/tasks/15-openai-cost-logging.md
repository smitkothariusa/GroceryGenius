# 15 — Structured Cost/Usage Logging for OpenAI Calls

**Priority:** 🟠 High
**Effort:** M (1 day)
**Status:** NOT STARTED

`backend/app/services/logging_config.py` and `test_observability.py`
already exist (request ID filtering confirmed) — build on that rather than
starting from scratch. Add structured logging around
`services/openai_client.py`'s `call_chat_completion` and the direct SDK
calls in `vision.py`/`barcode.py`: model used, token counts, estimated
cost, calling route. Feeds into the existing `error_logs`-style observability
pattern rather than a new system. Useful precursor to
[task 08 (recipe caching)](08-recipe-caching.md) for measuring actual cost
savings once caching lands.
