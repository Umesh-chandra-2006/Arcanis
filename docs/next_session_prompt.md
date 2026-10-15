# Prompt for the next session (written 2026-10-15, after M1 and the merge into `main`)

Paste everything below the line into a new Claude Code session opened in `D:\Arcanis`.

---

Read, in this order: `PROGRESS.md` (the "Snapshot", "Exact next step" and "Founder decisions, 2026-10-15 (marketing)" sections), `docs/marketing_plan.md` (all of it, v1.1), Track M and the gate at the top of `docs/tasks.md`, `docs/launch_checklist.md` sections 5 and 6, the 2026-10-15 re-audit section at the top of `docs/provider_quotas.md`, then `CLAUDE.md`. Do not re-audit the repo; trust those files. Work on branch `track-a` (check it out if the session opens on another branch).

Where we are: Arcanis Phase 1a (the creation soft launch) is live and verified. Client: https://arcanis-three.vercel.app (Vercel). API: https://arcanis-jpm1.onrender.com (Render `arcanis-jpm1`), kept awake by cron-job.org. `track-a` was fast-forwarded into `main`; both are at `193d1fc`. I may or may not have switched Vercel and Render to deploy from `main` yet; ask me. M1 is decided: no payment method yet, `DAILY_CREATION_LIMIT` is 200 on Render, the main text model is Gemini `gemini-flash-lite-latest` with Groq as fallback, the domain is `arcanis.world` at Spaceship, the big launch waits for battles, build M5 (share buttons) and M6 (attribution) now, plan M7 (weekly challenge) with me before building it. M0 is benched until marketing is done. Production is at migration 0019. Master Doc v7.7, Phase Plan v2.3, Build Plan v2.7.

My gate: marketing and the Phase 1a launch come first. Until Track M in `docs/tasks.md` is done, do no other work (no battles, no `track-b`, no features outside Track M) except fixing bugs on the live site. If something else seems urgent, ask me.

Wording to know: I call this soft launch "Phase 0" and the battle release "Phase 1". The docs call them Phase 1a and Phase 1b. The battle work sits on branch `track-b` (local only); leave it alone.

Hard rules:
- No live provider calls (LLM, image, moderation, email) without my permission in this session. See CLAUDE.md Engineering rules. Tests with fake providers are fine. Me using the deployed site myself is fine. The auto-mode classifier blocks Claude from running live calls and production data changes even with my permission; when that happens, give me the exact `!` command to run myself.
- `pnpm dev` uses the production database unless `DATABASE_URL` is set to the `TEST_DATABASE_URL` value. Use the test database for anything local, and start a dev server only when I ask.
- Back up (`pnpm db:backup`) before any production migration or production data change.
- Never use em dashes anywhere.
- This machine is low on memory. Run `node_modules/.bin/tsc` and `node_modules/.bin/vitest` directly, not through pnpm, and not alongside other heavy work. The full suite takes about 10 minutes.
- The word "Tower" must not appear in client source (a test enforces it).
- There is no `gh` CLI on this machine.
- Refinement stays off (`FEATURES.refinement`).
- Release flow: commit on `track-a`, and fast-forward `main` (`git push origin track-a:main`) only after my yes.

What I want now, one step at a time, waiting for my confirmation before each next step:
(a) Finish M2: ask whether I switched Vercel and Render to `main`; if not, walk me through it. Then check with me: `/health` answers `OK`, the Render log shows `193d1fc` on `main`, sign-in works, CI on `main` is green. Tick M2, A16's merge item and launch checklist section 5.
(b) M3: walk me through pointing `arcanis.world` at Vercel (DNS at Spaceship), the three env vars (`FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` on Render, `VITE_PUBLIC_URL` on Vercel), the redeploys, and the share-link check on Discord, X and WhatsApp. Check the code for any other place the old `arcanis-three.vercel.app` address is hard-coded.
(c) Ask me for yesterday's numbers from `pnpm cost-report --days 1` (or run it if it makes no provider calls; it only reads the database) to see whether flash-lite hit its daily cap after the model switch.
(d) Propose M5 (share buttons on the reveal: X and WhatsApp, prefilled text, share link with `?ref=`), then M6 (channel attribution to `/admin/metrics`), each as a short plan before building. Tests with fake providers and a client build for each.
(e) Then plan M7 (weekly challenge) with me: theme cadence, reward (never Spark), start date.

Before doing anything, tell me in a few lines what you understand the current state, the gate and the next step to be, and ask only about real decisions.
