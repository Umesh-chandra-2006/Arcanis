# Prompt for the next session (written 2026-11-01, after the launch review)

Paste everything below the line into a new Claude Code session opened in `D:\Arcanis`.

---

Read, in this order: `PROGRESS.md` (the "Snapshot" and "Exact next step" sections and the 2026-11-01 session log row), `docs/marketing_plan.md`, Track M and the gate at the top of `docs/tasks.md`, Section 6 of `docs/launch_checklist.md`, then `CLAUDE.md`. Do not re-audit the repo; trust those files, and check the repo where they disagree. Work on branch `track-a` (check it out if the session opens on another branch).

Where we are: Arcanis Phase 1a (the creation soft launch) is live. Client: https://arcanis.world (Vercel; the old https://arcanis-three.vercel.app still works). API: https://arcanis-jpm1.onrender.com (Render `arcanis-jpm1`), kept awake by cron-job.org. Production is at migration 0019 on the founder-owned TiDB cluster. Master Doc v7.8, Phase Plan v2.4, Build Plan v2.8. `main` and `track-a` were both at `8a0f875` when this was written, and both services deploy from `main`. CI is green at that commit. Uncommitted handover edits sit on `track-a`: `PROGRESS.md`, `docs/tasks.md`, `docs/launch_checklist.md` and this prompt. Show me `git status` and propose one docs commit; commit after my yes.

Deployed on 2026-11-01, from the launch review:
- Landing page: a one-line description of the game, "3 free spells (1 Spark each)", three example chips, and a sign-up panel that leads with the emailed code.
- Link previews and SEO basics: home page Open Graph and Twitter tags, `og.jpg`, PNG icons, `robots.txt`, `sitemap.xml`.
- The password is asked after the first spell (my decision, Master Doc v7.8). The welcome dialog still cannot be skipped.
- Every dialog stays on screen and scrolls on a short phone.
- The launch video tool, the database restore scripts and the doc updates.

Next steps, in order:
1. **My paste test (M3).** I paste the home page and one share link into Discord, X and WhatsApp and tell you what they show. The redirect is flipped and verified, and the files and bot tags were checked live on 2026-11-01. Apps cache previews, so an older link can show the old version for a while. I also confirm in the Render dashboard that it deployed `8a0f875`; `/health` does not report a version, and only two server comments changed.
2. **Real phone check before anyone is invited** (`docs/launch_checklist.md` Section 6): example chip, Lab with that chip's element and category, forge, move on, welcome dialog with the keyboard open. This has only been run against a fake local API, so real email and the real forge are untested on this flow. I do this myself on the deployed site. Do not change the "Your design is waiting" toast until I have checked it.
3. **Rest of the launch review list** (the prioritized list is not in the repo; these are the open items): privacy and terms pages, none exist, and the update-emails box in the welcome dialog is ticked by default, which is not valid consent in the EU (I need to decide the wording, and it should be checked by someone qualified); visits, drafts and a funnel on `/admin/metrics` (the events are already stored; keep the first-party analytics, no third-party tool); a more obvious mobile menu and a visible sign-in link in the mobile header; one word for creating a spell ("Forge" or "Research"); drop "sigil" from the sign-in screens; the Lab's `balance ?? 5` fallback (the grant is 3); per-page titles and real 404 status codes. On a 320 px phone the Forge button now sits below the first screen.
4. **M5 share buttons** (WhatsApp and the phone share sheet) are planned, waiting for my go; the plan and proposed share text are in the 2026-10-24 session log row. Then M6 (channel attribution to `/admin/metrics`, plan first; campaign data cannot be recovered later, so M5 and M6 should come before I post anywhere). Then plan M7 (weekly challenge) with me: theme cadence, reward (never Spark), start date.
5. **Videos.** Launch video v2 is at `D:\arcanis_launch_v2_vertical.mp4`, with placeholders to replace before posting (hook card, montage spells, Codex vote counts). Of the content videos (M9), `PROGRESS.md` last recorded only `2_moods` and `3_name` rendered. Ask me what has changed, then render any others one id per run in the background with nothing else heavy running: `sh phase0/tools/launch-video/render-all.sh rate`, then `forge`, `elements`, `launch`. The spells are written by hand (my decision); do not forge anything live.

Decisions already made, do not reopen them:
- The GitHub repo is public. Two testers' email addresses remain in the git history on `origin/main`. Git history is not being rewritten, and I contact the two testers myself. Never write anyone's personal email into a committed file.
- Run `pnpm cost-report --days 7` only after the cohort has used the site for a week.

My gate: marketing and the Phase 1a launch come first. Until Track M in `docs/tasks.md` is done, do no other work (no battles, no `track-b`, no features outside Track M) except fixing bugs on the live site and the launch review items above. If something else seems urgent, ask me. M0 stays benched.

Wording to know: I call this soft launch "Phase 0" and the battle release "Phase 1". The docs call them Phase 1a and Phase 1b. The battle work sits on branch `track-b` (local only); leave it alone. When it is rebased, its docs become v7.9 and v2.9 and its migration becomes 0020. My own 37 s battle trailer (`Downloads\Arcanis_Promo_1080p.mp4`) is kept for the Phase 1b launch.

Hard rules:
- No live provider calls (LLM, image, moderation, email) without my permission in this session. See CLAUDE.md Engineering rules. Tests with fake providers are fine. Me using the deployed site myself is fine. The auto-mode classifier blocks Claude from running live calls and production reads or changes even with my permission; when that happens, give me the exact `!` command to run myself.
- `pnpm dev` uses the production database unless `DATABASE_URL` is set to the `TEST_DATABASE_URL` value. Use the test database for anything local, and start a dev server only when I ask. To test signed-in screens without one, build the client and drive it against a fake local API.
- Back up (`pnpm db:backup`) before any production migration or production data change.
- Never use em dashes anywhere.
- This machine is low on memory. Run `node_modules/.bin/tsc` and `node_modules/.bin/vitest` directly, not through pnpm, and not alongside other heavy work (including a video render). The full suite takes about 10 minutes.
- The word "Tower" must not appear in client source (a test enforces it).
- There is no `gh` CLI on this machine.
- Refinement stays off (`FEATURES.refinement`).
- Release flow: commit on `track-a`, and fast-forward `main` (`git push origin track-a:main`) only after my yes.

Before doing anything, tell me in a few lines what you understand the current state, the gate and the next step to be, and ask only about real decisions.
