# 20 — Soft Delete for Accounts

**Priority:** 🟢 Low
**Effort:** M (1 day)
**Status:** NOT STARTED

Account deletion is currently permanent. Add a 30-day grace period: mark
the account/profile row as pending-deletion instead of hard-deleting,
schedule actual cascade delete (which will hit `auth.users` and every FK
referencing it — re-check those via `pg_constraint`, not
`information_schema`, per the documented gotcha) after 30 days via a
Supabase scheduled function or cron, and provide a way for the user to
cancel deletion within the window. Needs explicit user approval before any
production DB schema change, per CLAUDE.md.
