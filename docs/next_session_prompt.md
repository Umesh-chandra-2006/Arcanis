# Prompt for the next session (written 2026-10-15, after the deploy and the marketing plan)

Paste everything below the line into a new Claude Code session opened in `D:\Arcanis`.

---

Read, in this order: `PROGRESS.md` (the "Snapshot", "Exact next step" and "Founder decisions, 2026-10-15 (marketing)" sections), `docs/marketing_plan.md` (all of it), Track M and the gate at the top of `docs/tasks.md`, `docs/launch_checklist.md` sections 5 and 6, then `CLAUDE.md`. Do not re-audit the repo; trust those files. Work on branch `track-a` (check out `track-a` first if the session opens on another branch).

Where we are: Arcanis Phase 1a (the creation soft launch) is deployed and I verified it on 2026-10-15 (all green). Client: https://arcanis-three.vercel.app (Vercel). API: https://arcanis-jpm1.onrender.com (Render `arcanis-jpm1`), kept awake by cron-job.org. Both build `track-a`, which is not merged into `main` yet (`main` is at `0e0bdb5`, so the merge is a fast-forward). Production is at migration 0019; the dummy `@example.com` accounts are deleted. We then wrote a marketing plan (`docs/marketing_plan.md`). Master Doc v7.7, Phase Plan v2.3, Build Plan v2.7.

My gate: marketing and the Phase 1a launch come first. Until Track M in `docs/tasks.md` is done, do no other work (no battles, no `track-b`, no features outside Track M) except fixing bugs on the live site. If something else seems urgent, ask me.

Wording to know: I call this soft launch "Phase 0" and the battle release "Phase 1". The docs call them Phase 1a and Phase 1b. The battle work sits on branch `track-b` (local only); leave it alone.

Hard rules:
- No live provider calls (LLM, image, moderation, email) without my permission in this session. See CLAUDE.md Engineering rules. Tests with fake providers are fine. Me using the deployed site myself is fine.
- `pnpm dev` uses the production database unless `DATABASE_URL` is set to the `TEST_DATABASE_URL` value. Use the test database for anything local, and start a dev server only when I ask.
- Back up (`pnpm db:backup`) before any production migration or production data change.
- Never use em dashes anywhere.
- This machine is low on memory. Run `node_modules/.bin/tsc` and `node_modules/.bin/vitest` directly, not through pnpm, and not alongside other heavy work. The full suite takes about 10 minutes.
- The word "Tower" must not appear in client source (a test enforces it).
- There is no `gh` CLI on this machine.
- Refinement stays off (`FEATURES.refinement`).

What I want now, following Track M in order, one step at a time, waiting for my confirmation before each next step:
(a) M0: the two loose ends from the verification. The feedback table was empty after my run, so confirm with me that feedback reaches `/admin/feedback` (fix it if not, push to `track-a`). Check whether the 11 old archivist seed spells are deleted (archivist spell count 36); if not, give me the command to run `D:\Arcanis-backups\delete-old-seeds.mjs` myself.
(b) M1: walk me through the four open decisions in `docs/marketing_plan.md` Section 8, with your recommendation for each. Record my answers in the plan and in `PROGRESS.md`.
(c) M2: propose merging `track-a` into `main` and wait for my yes. After it, walk me through switching Vercel and Render to `main`.
(d) Then continue down Track M (domain, provider budget, share buttons, attribution, weekly challenge, cohort, content, public opening), proposing each task before starting it. Tick tasks in `docs/tasks.md` and `PROGRESS.md` as they close.

Before doing anything, tell me in a few lines what you understand the current state, the gate and the next step to be, and ask only about real decisions.
