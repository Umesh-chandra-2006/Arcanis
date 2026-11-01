# Prompt for the next session (written 2026-10-24, after M2, the launch video, the M5 plan and the five content videos)

Paste everything below the line into a new Claude Code session opened in `D:\Arcanis`.

---

Read, in this order: `PROGRESS.md` (the "Snapshot", "Exact next step", "Founder decisions, 2026-10-15 (marketing)" sections and the 2026-10-24 session log row), `docs/marketing_plan.md` (all of it), Track M and the gate at the top of `docs/tasks.md`, `docs/launch_video_script.md`, the "Launch video" section of `CLAUDE.md`, then the rest of `CLAUDE.md`. Do not re-audit the repo; trust those files. Work on branch `track-a` (check it out if the session opens on another branch).

Where we are: Arcanis Phase 1a (the creation soft launch) is live. Client: https://arcanis-three.vercel.app (Vercel). API: https://arcanis-jpm1.onrender.com (Render `arcanis-jpm1`), kept awake by cron-job.org. M2 is done: both services deploy from `main` (at `193d1fc`), CI green. `track-a` is one docs commit ahead of `main` and has uncommitted work from 2026-10-24: the M2 ticks, the doc updates, `docs/launch_video_script.md` and `phase0/tools/launch-video/`. Production is at migration 0019. Master Doc v7.7, Phase Plan v2.3, Build Plan v2.7.

Open items from last session:
1. **Uncommitted work.** First, show me `git status` and propose one or two commits on `track-a` (docs, and the launch-video tool). Commit after my yes; do not push `main` without my yes.
2. **Domain (M3).** I have not bought `arcanis.world` yet; I am deciding. Do not treat it as registered. When I decide, walk me through DNS at Spaceship, the env vars (`FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` on Render, `VITE_PUBLIC_URL` on Vercel), the redeploys and the share-link check.
3. **Cost report.** `pnpm cost-report --since 2026-10-15T00:00:00Z` failed last time with `ER_ACCESS_DENIED_ERROR`: the production `DATABASE_URL` in `.env` seems stale (this also breaks `pnpm db:backup`). The auto-mode classifier blocks you from production reads, so give me the `!` command; I run it, and if it fails again I update `.env` from Render.
4. **Launch video v2** is at `D:\arcanis_launch_v2_vertical.mp4` (60 fps, plus `_whatsapp.mp4`; brighter motion-graphic restyle of v1, end card `arcanis.world`). I will give feedback after watching and listening. Placeholders to replace before posting: the hook card's name and lore (I forge the Void prompt from the script on the live site and send you the result), the three base spells in the montage (I may forge the script's funny prompts), the mock Codex vote counts, the end-card address. Re-render with the commands in `CLAUDE.md`; preview stills first, full render in the background.
4b. **Content videos (M9).** All six are built and previewed; only `2_moods` and `3_name` are rendered in `D:\arcanis content vids` (see "Content videos" in `PROGRESS.md`). The batch render was stopped for low memory. Render the rest one id per run in the background, in this order, with nothing else heavy running: `sh phase0/tools/launch-video/render-all.sh rate`, then `forge`, then `elements`, then `launch`. Check each file with ffprobe afterwards. Then I will give feedback after watching and listening. The spells are written by hand (my decision); do not forge anything live.
5. **M5 share buttons** are planned (plan and proposed share text in the 2026-10-24 session log row of `PROGRESS.md`), waiting for my go. Then M6 (channel attribution to `/admin/metrics`, plan first), then plan M7 (weekly challenge) with me: theme cadence, reward (never Spark), start date.

My gate: marketing and the Phase 1a launch come first. Until Track M in `docs/tasks.md` is done, do no other work (no battles, no `track-b`, no features outside Track M) except fixing bugs on the live site. If something else seems urgent, ask me. M0 stays benched.

Wording to know: I call this soft launch "Phase 0" and the battle release "Phase 1". The docs call them Phase 1a and Phase 1b. The battle work sits on branch `track-b` (local only); leave it alone. My own 37 s battle trailer (`Downloads\Arcanis_Promo_1080p.mp4`) is kept for the Phase 1b launch.

Hard rules:
- No live provider calls (LLM, image, moderation, email) without my permission in this session. See CLAUDE.md Engineering rules. Tests with fake providers are fine. Me using the deployed site myself is fine. The auto-mode classifier blocks Claude from running live calls and production reads or changes even with my permission; when that happens, give me the exact `!` command to run myself.
- `pnpm dev` uses the production database unless `DATABASE_URL` is set to the `TEST_DATABASE_URL` value. Use the test database for anything local, and start a dev server only when I ask.
- Back up (`pnpm db:backup`) before any production migration or production data change.
- Never use em dashes anywhere.
- This machine is low on memory. Run `node_modules/.bin/tsc` and `node_modules/.bin/vitest` directly, not through pnpm, and not alongside other heavy work (including a video render). The full suite takes about 10 minutes.
- The word "Tower" must not appear in client source (a test enforces it).
- There is no `gh` CLI on this machine.
- Refinement stays off (`FEATURES.refinement`).
- Release flow: commit on `track-a`, and fast-forward `main` (`git push origin track-a:main`) only after my yes.

Before doing anything, tell me in a few lines what you understand the current state, the gate and the next step to be, and ask only about real decisions.
