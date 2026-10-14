# Prompt for the next session (written 2026-10-15, mid-deploy)

Paste everything below the line into a new Claude Code session opened in `D:\Arcanis`.

---

Read `PROGRESS.md` first (the "Snapshot" and "Exact next step" sections), then `docs/launch_checklist.md` (section 2 is the deploy guide, section 5 the verification), then `CLAUDE.md`. Do not re-audit the repo; trust those files. Work on branch `track-a` (check out `track-a` first if the session opens on another branch).

Where we are: Arcanis Phase 1a (the creation soft launch) is being deployed from branch `track-a`. Production is backed up and migrated to 0019. Vercel (Step A) is done: https://arcanis-three.vercel.app, building `track-a`. Render (Step B, service `arcanis-jpm1`) was finishing its deploy when the last session ended. Steps C and D, verification, the merge into `main` and the first-users plan are still to come. Master Doc v7.7, Phase Plan v2.3, Build Plan v2.7.

Wording to know: I call this soft launch "Phase 0" and the battle release "Phase 1". The docs call them Phase 1a and Phase 1b. The battle work sits on branch `track-b` (local only); leave it alone during the deploy.

Hard rules:
- No live provider calls (LLM, image, moderation, email) without my permission in this session. See CLAUDE.md Engineering rules. Tests with fake providers are fine. Me using the deployed site myself is fine.
- `pnpm dev` uses the production database unless `DATABASE_URL` is set to the `TEST_DATABASE_URL` value. Use the test database for anything local, and start a dev server only when I ask.
- Back up (`pnpm db:backup`) before any production migration.
- Never use em dashes anywhere.
- This machine is low on memory. Run `node_modules/.bin/tsc` and `node_modules/.bin/vitest` directly, not through pnpm, and not alongside other heavy work. The full suite takes about 10 minutes. If port 3100 is still held by an old dev server, stop it first.
- The word "Tower" must not appear in client source (a test enforces it).
- There is no `gh` CLI on this machine.
- Refinement stays off (`FEATURES.refinement`).

What I want now, one step at a time, waiting for my confirmation before each next step:
(a) Check Render: does https://arcanis-jpm1.onrender.com/health answer OK? If the deploy failed, I will paste the log; fix it.
(b) Step C: `VITE_PUBLIC_URL` on Vercel and redeploy. Step D: the keep-awake monitor.
(c) Help me verify the live site (checklist section 5). Much of it has never been clicked through: the Codex question after a creation and the Codex votes, the Spark confirmation, the feedback page and the first-spell prompt, the Sanctum at `/sanctum`, and the landing page for signed-in and signed-out visitors. Expect me to report problems; fix them, commit and push to `track-a` (Vercel and Render redeploy from it).
(d) Then propose merging `track-a` into `main` and wait for my yes.
(e) Then plan with me how to pull in the first users: the first invited cohort, where share links get posted, and what to watch on `/admin/metrics` and `/admin/feedback`.

Before doing anything, tell me in a few lines what you understand the current state and next step to be, and ask only about real decisions.
