---
name: implement-task
description: Pulls the next task from IMPLEMENTATION_PLAN.md, implements it via subagent(s) on a fix/feature branch, opens a PR to dev, deploys to dev, and waits for user feedback. Only touches main/production when the user gives the explicit release phrase. Use when the user says "implement the next task", "work the backlog", "/implement-task", or names a specific task number from IMPLEMENTATION_PLAN.md.
---

# implement-task

Orchestrates one backlog item end to end: plan → branch → implement → PR →
dev deploy → user feedback → (only on explicit go-ahead) production
release → mark done.

**This skill follows the repo's CLAUDE.md exactly, which overrides
anything below that conflicts with it.** The most load-bearing part of
that: `main` is never touched without the user saying the release phrase
("push to main", "merge to main", "deploy to production", "ship it",
"release it", "go live", or an unambiguous equivalent) **in this specific
instance** — that authorization does not carry over from a previous run of
this skill. Merging into `dev` is standing authorization
and does not require asking.

---

## Step 1 — Pick the task

1. Read `IMPLEMENTATION_PLAN.md`.
2. If the user named a specific task number/title, use that.
3. Otherwise scan the backlog tables in priority order (🔴 then 🟠 then 🟡
   then 🟢), top to bottom within each tier, and pick the first row whose
   Status is `NOT STARTED` or `IN PROGRESS` (resume in-progress work before
   starting anything new).
4. Read the linked spec file in `docs/tasks/`. If it's still a stub (short,
   no "Implementation" section), tell the user it needs to be fleshed out
   before implementation and stop — don't improvise a full implementation
   against a two-line stub without confirming scope, especially for the
   feature-shaped tasks (18, 19) that explicitly call for a product
   decision first.
5. Set the task's Status to `IN PROGRESS` in `IMPLEMENTATION_PLAN.md` and
   commit that alone (docs-only, direct-to-dev is allowed per CLAUDE.md) —
   this marks the task as claimed before work starts.

## Step 2 — Branch

```
git checkout dev
git pull
git checkout -b fix/<short-task-slug>   # or feature/ for net-new functionality (tasks 18-20)
```

State the branch name to the user before proceeding — per CLAUDE.md's
safety reminders, every push announces its target branch.

## Step 3 — Implement via subagent

Delegate the actual coding to a subagent rather than writing it inline —
this keeps the plan/spec reasoning in the main thread and the
implementation detail out of it.

- Use the `Agent` tool, `subagent_type: general-purpose` (or `claude` if
  the task is a broad catch-all), with `isolation: "worktree"` so the
  agent works in a clean checkout of the branch created in Step 2.
- If this environment has an Opus-plan mode available (`/model opusplan`
  or equivalent), prefer it for this step — it's meant for exactly this
  kind of scoped implementation-from-spec work. If that mode isn't
  available here, proceed with whatever model is already active; don't
  block the task on a mode that may not exist in every environment.
- **Prompt the subagent with the full spec content inline**, not just a
  link — it starts with no context. Include: the task's problem statement,
  the implementation steps, the verification checklist, and explicitly
  call out any CLAUDE.md conventions relevant to the files it'll touch
  (auth dependencies, slowapi limits, i18n, `authFetch`-only, mobile
  styles, pinned requirements — whichever apply).
- Tell the subagent to run the relevant verification itself before
  reporting done: `pytest` from `backend/` for backend changes,
  `npx tsc --noEmit` for frontend changes, and the spec's own
  verification checklist.

Review the subagent's actual diff yourself before proceeding — its summary
describes intent, not necessarily what happened.

## Step 4 — Commit and open PR

```
git add <specific files>       # never -A / . — review `git status` first
git commit -m "..."
git push -u origin fix/<short-task-slug>
gh pr create --base dev --title "..." --body "..."
```

## Step 5 — Merge to dev and deploy

Per CLAUDE.md item 3, merging your own PR into `dev` is standing
authorization — no need to ask first.

```
gh pr merge <PR> --squash   # or --merge, match repo convention — check recent PR merge history first
```

Vercel and Render both auto-deploy from `dev` on push (per the
Architecture Map in CLAUDE.md — dev.grocerygenius.org +
grocerygenius-dev.onrender.com). After the merge:

1. Poll Render dev service (`srv-d7bc0gh17lss73922p6g`) deploys until
   `live`: `GET /v1/services/{id}/deploys?limit=1`.
2. Confirm Vercel built the right commit: `vercel inspect
   https://dev.grocerygenius.org --logs`, check the `Cloning ... (Commit:
   <sha>)` line matches.
3. Smoke test per CLAUDE.md: `/health` → 200 on the dev backend, an
   AI route without a token → 401.

## Step 6 — Ask for feedback, then stop

Tell the user:

> I've deployed [task name] to dev. Give feedback.

**Wait for the user's response before doing anything else in this skill.**
Do not proceed to Step 7 on your own initiative, and do not treat silence
or an unrelated message as approval.

## Step 7 — Production release (only on explicit release phrase)

Only proceed if the user's message contains one of: "push to main",
"merge to main", "deploy to production" (or an unambiguous equivalent) —
**said now, in response to this task**, not inferred from a past
conversation or a standing preference. If the user gives feedback that
implies changes are needed, loop back to Step 3 instead.

```
git checkout main
git pull
git merge dev --no-ff
git push origin main
```

Then:

1. Poll Render prod service (`srv-d3o0k1hr0fns73e18mbg`) until `live`.
2. Confirm Vercel prod deploy via `vercel inspect
   https://grocerygenius.org --logs`.
3. Smoke test: `/health` → 200, AI route without token → 401.

## Step 8 — Close out

1. In `IMPLEMENTATION_PLAN.md`, set the task's Status to `DONE` and
   update the "Current Task" section at the top to point at the next
   `NOT STARTED` item in priority order.
2. Commit that update directly to `dev` (docs-only change, allowed
   without a PR per CLAUDE.md item 2) and push.
3. Report to the user:

   > ✅ Task complete and live in production. Next task: [name of new
   > Current Task].

If Step 7 didn't run (no release phrase given), skip the "live in
production" language — report instead that the task is merged to dev and
awaiting a production release decision, and leave Status as `IN
PROGRESS`/whatever reflects "done, not yet released" rather than `DONE`,
so the plan doesn't claim something is live when it isn't.

---

## Things this skill will not do without asking, regardless of momentum

- Push to `main` without the release phrase given in that turn (Step 7).
- Any destructive git operation (`reset --hard`, `branch -D`,
  `push --force`).
- `supabase db push` or any production DB write — CLAUDE.md requires
  explicit approval naming the specific action.
- Start implementing a stub spec (tasks with no "Implementation" section)
  without confirming scope first.
