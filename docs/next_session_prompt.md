# Prompt for the next session (written 2026-10-11)

Paste everything below the line into a new Claude Code session opened in `D:\Arcanis`.

---

Read `PROGRESS.md` first (the "Snapshot", "Exact next step" and "Still open" sections), then `docs/launch_checklist.md` (section 2 is the fresh deploy guide), then `CLAUDE.md`. Do not re-audit the repo; trust those files. `docs/status_report.md` has a current-status section at the top, and `docs/tasks.md` has the task history (T1 to T18, A16, B10).

Where we are: Arcanis Phase 1a (the creation soft launch) is code complete on branch `track-a`, committed and pushed to GitHub. It is not merged into `main` and not deployed. Master Doc v7.6, Phase Plan v2.3, Build Plan v2.6. 140 tests passed on the last full run. The production database is already migrated to 0018 (backup verified) and my account is admin there. `vercel.json` already points at the Render service `https://arcanis-jpm1.onrender.com`.

Wording to know: I call this soft launch "Phase 0" and the battle release "Phase 1". The docs call them Phase 1a and Phase 1b. When I say "Phase 1", I mean the battle release.

What is in this launch: describe a spell and forge it, example prompts in the Lab, try before signup on the landing page (the draft is kept in the browser only), the Codex (public wall of newest spells), research comes first (a spell that needs research is not shown or granted until research completes), the forge queue ("the Arcanum" grants queued spells), required passwords, the sidebar with "Sanctum" as home. Built but switched off until battles: refinement (mending, paid in Refinement Runes; `FEATURES.refinement` in `phase0/shared/constants.ts`). Do not switch it on.

Hard rules:
- No live provider calls (LLM, image, moderation, email) without my permission in this session. See CLAUDE.md Engineering rules. Tests with fake providers are fine.
- `pnpm dev` uses the production database unless `DATABASE_URL` is set to the `TEST_DATABASE_URL` value. Use the test database for anything local, and start a dev server only when I ask.
- Back up (`pnpm db:backup`) before any production migration.
- Never use em dashes anywhere.
- This machine is low on memory. Run `node_modules/.bin/tsc` and `node_modules/.bin/vitest` directly, not through pnpm, and not alongside other heavy work. The full suite takes about 10 minutes. If port 3100 is still held by an old dev server, stop it first.
- The word "Tower" must not appear in client source (a test enforces it).
- There is no `gh` CLI on this machine.

What I want now:
(a) Check the first CI run on `track-a` (I will paste the result from GitHub Actions if you cannot see it). Fix anything it finds, then commit and push.
(b) Walk me through the fresh deploy one step at a time, following `docs/launch_checklist.md` section 2: Step A the Vercel project (I have not created one yet), Step B Render settings and environment, Step C `VITE_PUBLIC_URL` and redeploy, Step D the keep-awake monitor. Wait for me to confirm each step before the next.
(c) After it is live, help me verify it (checklist section 5). Several screens built at the end of the last session were never clicked through in a browser: the research tile and its grant notice, the toast after leaving the Lab mid-forge, the landing page form, the Codex. Expect me to report problems; fix them.
(d) Then propose merging `track-a` into `main` and wait for my yes.
(e) Then plan with me how to pull in the first users: the first invited cohort, where share links get posted, and what to watch on `/admin/metrics`.

Open items from last session that I have not answered, ask me once, briefly: whether base spell tiers (Basic, Advanced, Mega in list order) are right; whether runes should keep being minted silently while refinement is off; whether "Sanctum" is the name I want for home.

Before doing anything, tell me in a few lines what you understand the current state and next step to be, and ask only about real decisions.
