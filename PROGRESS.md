# Arcanis: Progress

**Read this first in every new session.** It is the single source for "where is the project right now". Update it at the end of every working session: change the snapshot, record decisions, tick tasks, and add a line to the session log. Keep it short; detail belongs in `docs/`.

**Last updated:** 2026-10-11

---

## 1. Snapshot

| Area | State |
|---|---|
| Docs | Master Doc **v7.6**, Phase Plan **v2.3**, Build Plan **v2.6**. Cost sheet `docs/cost_sheet.md`; quotas `docs/provider_quotas.md`; launch runbook `docs/launch_checklist.md`; task checklist `docs/tasks.md`. `docs/status_report.md` is the 2026-10-09 audit with a current-status section at the top. |
| Canonical codebase | **`phase0/`** (stays there, F9). Root prototype archived on branch `archive/root-prototype`. `arcanis-ui/` ported (A17) and deleted. |
| Branch | All work on **`track-a`**, all committed and **pushed to `origin/track-a`** on 2026-10-11. Last commit at handover: the session handover docs commit on top of `3e06291`. Not merged into `main`. CI ran for the first time on this push; **its result has not been seen** (no `gh` CLI on this machine): check https://github.com/Umesh-chandra-2006/Arcanis/actions. |
| Phase 0 (measure) | **Done** (A14): about $0.001 to $0.003 per creation at list price; 2c 1.7%; moderation false positives 0 of 120. |
| Phase 1a (creation soft launch) | **Code complete and pushed** (A0 to A15, A17, local test rounds T1 to T18, growth features). In it: example prompts, try before signup, the Codex wall, research comes first, the forge queue. Built but **switched off**: mending with Refinement Runes (`FEATURES.refinement`, opens with battles). Waiting on the founder: the fresh deploy on Vercel and Render (A16, `docs/launch_checklist.md` section 2). |
| Phase 1b (battles) | Not started (Track B). |
| Production database | Migrated to **0018** on 2026-10-11 after a verified backup; the founder's account is admin there; the 36 base spells are seeded there; backups in `D:\Arcanis-backups`. **The app currently deployed on Render is the old one and is incompatible with this schema until `track-a` is deployed.** |
| Test database | `arcanis_test` on the same cluster, at **0018** with the 36 base spells. It is shared by the test suite and local dev, so test runs use up the daily creation cap: local dev shows "the forge is cooling" unless today's limit is raised (admin page, or `DAILY_CREATION_LIMIT` in the shell). |
| Tests | phase0: **140 tests across 18 files, all passing**, type-check clean (full run 2026-10-11, after T18 and the growth features). |
| Providers | All free tier. Text: Groq `openai/gpt-oss-120b`, Gemini flash-lite fallback. Moderation: OpenAI omni. Email: Brevo (Render's outbound IPs were authorised by the founder in an earlier deploy; this machine's rotating IPv6 address is not, so local sign-in emails can fail). Storage: Cloudinary. **No image generation**: card faces are element art (`CARD_ART=element`). |
| Local dev server | One was left running at the 2026-10-11 handover (port 3100, test database, `DAILY_CREATION_LIMIT=100000` in its shell only). It dies with that session; if port 3100 is still held, stop it before running tests. Start a new one only when the founder asks, with the commands under "Exact next step". `tsx scripts/dev-account-check.ts <email> [--spark N] [--admin]` shows or tops up a test-database account (the founder's has a password, is admin, and had 10 Spark). The machine has 1 to 2 GB free, and `tsc` or the test suite beside a dev server takes many minutes (the full suite takes about 10). Call `node_modules/.bin/tsc` and `node_modules/.bin/vitest` directly: `pnpm check` once hung in an implicit `pnpm install`. |
| Live provider calls | **Founder rule (CLAUDE.md): none without the founder's permission in that session.** The dev-startup model check is now opt-in and the forge queue loop skips test accounts. |

### Exact next step
1. **Check the first CI run** on `track-a` (GitHub, Actions). It has never run before, so a failure there may be an environment difference (MySQL 8.4 container instead of TiDB, Linux) rather than a code bug. Fix what it finds.
2. **Founder does the fresh deploy**, following `docs/launch_checklist.md` section 2 in order: Step A create the Vercel project (root `phase0`, gives the public address `https://<project>.vercel.app`), Step B configure Render `arcanis-jpm1` (build command with `--prod=false`, the environment table, `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` set to the Vercel address), Step C set `VITE_PUBLIC_URL` on Vercel and redeploy, Step D the keep-awake monitor. Both deploy branch `track-a` until it is merged to `main`. The founder has not started this yet and has no Vercel project.
3. **Verify the deploy** (checklist section 5): sign up on the Vercel address, set a password, forge a spell, forge a third and see "research under way", open the Codex, paste a share link into Discord, X and WhatsApp. The founder's production account is admin and has no password yet, so its first sign-in is by emailed code.
4. **Merge `track-a` into `main`** once CI is green and the deploy is verified (open a pull request; ask the founder first), then switch both services to `main`.
5. **Plan how to pull in users** with the founder (the founder asked for this after the deploy): the first invited cohort of 10 to 30, where share links get posted, what to watch on `/admin/metrics`. Then the cost sheet refresh after the first week of traffic.

To run locally against the test database (only when the founder asks), in PowerShell:
```
cd D:\Arcanis\phase0
$env:DATABASE_URL = (Select-String -Path ..\.env -Pattern '^TEST_DATABASE_URL=').Line -replace '^TEST_DATABASE_URL=', ''
$env:DAILY_CREATION_LIMIT = '100000'   # the test database's daily count is used up by test runs
pnpm dev
```
Without the `DATABASE_URL` line `pnpm dev` uses the production database. Every spell forged there and every emailed code is a live provider call.

**Not verified by anyone yet:** the screens built late on 2026-10-11 (research tile and grant notice, the toast after leaving the Lab, the landing page form, the Codex, the Sanctum label) pass the automated tests and the type-check but were never clicked through in a browser. The founder tested the earlier rounds and the first T8 build.

## 2. Decisions (2026-10-09, founder)

| ID | Decision |
|---|---|
| A | First 2 spells per account skip research; research stored as `research_ready_at` timestamp. |
| B | Server scores minigames from raw input events; piloted side samples owner results blended to population median by n/(n+10). Battle track, not a soft-launch blocker. |
| C | Creation-first soft launch (Phase 1a) after blockers. Creation-only Gate 1a written into Phase Plan; day-7 = "returned and created again". Battle gate applies when battles ship. |
| D | Fake door: "coming soon" Spark pack tiles, `spark_pack_intent`, waitlist, no Spark for clicking. Founder sets provider caps; app gets a daily spend circuit breaker. |
| E | 6-digit code in the same email as the link; passwords removed; httpOnly cookie session; existing password users move to code login. |
| F | Founder verifies Lemon Squeezy for an India-based seller. **Phase 2 prerequisite.** Fallback Paddle (MoR); Razorpay is not an MoR. |
| G1 | All 12 elements, add Drain, Instant only until battles ship. Temporary deviation from Build Plan 2.3; Trap and Charged return with battles. |
| G2 | No Tower in Phase 1: drop `assessment_question`, replace "the Tower" narrative voice everywhere. |
| G3 | Payments stay Phase 2. |
| G4 | Gate thresholds confirmed as placeholders; k-factor = invites per user x invite conversion rate; numeric thresholds locked before soft launch. |
| G5 | Server-validated minigames, via B. |
| G6 | One paid Render instance for the monolith before soft launch. |
| H1 | `phase0/` canonical; root app archived on a branch. |
| H2 | Modular monolith; Build Plan 3 updated. DB: founder to confirm host; if it sleeps, is connection-capped, or has no backups, migrate to Supabase now. |
| H4 | Hybrid Power Budget (code budget, LLM allocates, 2a enforces). Soft-launch blocker. Harness gets Power Budget coverage. |
| H12 | Will = capacity (absolute, grows, gates tiers) + current Will (depleted per cast). Bands as % of capacity: Sharp 60+, Steady 30 to 60, Strained 16 to 30, Failing 6 to 16, Broken under 6. Secrecy unchanged; tune via harness. |
| H9 | No numeric Will cost in the UI; spell detail view shows Light / Moderate / Heavy only. |
| H10 | All four security fixes are soft-launch blockers (enumeration, localStorage JWT, plaintext tokens, open analytics). Analytics: anonymous events only from an allowlist, schema-validated, rate-limited. |
| Small | Blockers: images to object storage, 1200x630 OG variant, vercel.json share fix, live model-ID check. Not blocking: delete dead template code, remove Hearth. |
| Docs | Onboarding goes straight to creation; Spell XP reveal removed; Conflagration Wave = Attack / Continuous. |

### Founder decisions, 2026-10-11 (first local test)

| Decision | Detail |
|---|---|
| Optional passwords | Changes the "no passwords" lock (decision E). Accounts still created by emailed code; password is optional, saves email quota; no account enumeration. |
| Welcome step and profile window | One skippable dialog (name, optional password, update emails); profile window with 5 tabs. Changes "straight to creation". |
| Signup grant 3 | Was 5. |
| Sealed potential | Display-only concept grade (Basic/Advanced/Mega) plus stronger Layer 1 stat guidance, so a grand description reads as grand without breaking the tier rule. |
| Base spells | 36 seeded and shown in the Spellbook with filters. Tier per spell assumed (Basic/Advanced/Mega in list order): **founder to confirm**. |

### Founder decisions, 2026-10-11 (second local test)

| Decision | Detail |
|---|---|
| Passwords required | Replaces "optional password". Saves the email quota (Brevo free: 300 a day). Accounts are still created by emailed code or link; the code is the forgot-password path. |
| Password change | Needs the current password, or a sign-in by emailed code or link in the last 15 minutes. Other devices are signed out. |
| Home after sign-in | Not the Lab. |
| Navigation | Below 1024 px the gold "A" logo, top left, is the menu button; on desktop it folds the sidebar to an icon rail. |
| No unasked LLM calls | No live provider call without the founder's permission. Written into CLAUDE.md. |
| Forge queue | A creation refused by the daily breaker waits and is forged when the breaker reopens; in-app notice. Chosen by Claude, founder to confirm: no Spark reserved while waiting (charged when forged), at most 3 waiting designs per player, no email notice, the voice is "the Arcanum" (a higher entity that grants the spell; founder rejected "Forgewarden"). |

### Founder decisions, 2026-10-11 (refinement, T8)

| Decision | Detail |
|---|---|
| Two refinements | Mending (small changes, no research) now; ascension (the spell becomes a higher-tier spell that tops it, full research) designed now and built in Phase 1b. |
| Refinement Runes | A third currency for mending. Changes the "two currencies" lock. 1 minted per Spark-paid creation that passes verification; 1 spent per mend; never bought or granted free. Generation cost is paid by Spark, or by runes that only Spark-paid creation can mint. |
| Mend rules | New linked spell (original never edited); element, category, cast type and tier locked; same Power Budget, so it reshapes and never strengthens; own spells only, unlimited; base spells cannot be mended. |
| Example prompts | Fixed chips in the Lab that fill the form. Claude's call: six examples, no AI. |
| Confirmed by the founder (2026-10-11) | A mend of a spell still in research becomes usable when the original does (otherwise 1 rune skips any wait). A mend counts toward the daily creation limit and is refused, not queued, while the forge cools. A mend is never a "creation" in Gate 1a metrics; cost is reported per Spark spent so mends are inside the $0.08 line. The mended spell keeps the original's art and sealed-potential grade. No runes for spells forged before migration 0018, and no retroactive grant. |
| Tiers and Circles | Basic from Circle 1, Advanced from Circle 4, Mega from Circle 6, Freestyle none (Master Doc 6.1 and 3 corrected). Will capacity per tier is tuned in 1b. |
| Cost sheet | Phase 0 is closed on the 2026-10-10 sheet; it is refreshed in Phase 1a from the first week of soft-launch traffic (task under A16). |
| Phase | Refinement is a Phase 1 feature: mending in 1a, ascension in 1b. |

### Founder decisions, 2026-10-11 (test of T8)

| Decision | Detail |
|---|---|
| Phase wording | The founder calls the creation soft launch "Phase 0" and the battle release "Phase 1". The docs call them Phase 1a and Phase 1b. Read the founder's "Phase 1" as 1b. |
| Refinement off for the soft launch | Built and tested, switched off (`FEATURES.refinement`). Opens with battles (B10). Runes are still minted. |
| Refinement Runes | The currency's name (was Stones). Code and table still say "stone"; renamed in B10. |
| Research comes first | A spell that needs research is not shown or granted until research completes. Replaces the dimmed "Researching" card. |
| Sovereign tier | A fifth tier above Mega, hidden until unlocked; Circle 7 and Element Sovereign affinity. Caps not designed. |
| Forge queue | Spark charged when forged, cap of 3, in-app notice only: all kept. |
| Spark pack sizes, TiDB owner | Both left for the battle phase. The current cluster stays until then. |
| Fusion cost | Moved from Phase 0 scope to Phase 1 in the Phase Plan (it stays an estimate until fusion exists). |

### Founder decisions, 2026-10-10 (later)

| Decision | Detail |
|---|---|
| No generated art in Phase 0/1a | Cards and share images use element art; `CARD_ART=element` default; FLUX stays behind `CARD_ART=generated`. Cloudflare keys no longer needed for launch. |
| Pack prices hidden | Fake-door tiles show Spark amounts and "coming soon" only. |
| Brevo IPs | Authorised by the founder; verified working (free plan, 300 emails a day). |

### Founder actions closed (2026-10-10)

| ID | Decision |
|---|---|
| F1 | All providers on free tiers, no payment method attached (provider cap = $0). App breaker: `DAILY_SPEND_LIMIT_USD=2` real spend plus `DAILY_CREATION_LIMIT` under the tightest free quota (A2 audit; placeholder 50). |
| F2 | TiDB account owner unknown. Keep current cluster for the soft launch with logical backups (A1); migrate to a new founder-owned host in Phase 1b (B0). |
| F3 | Free Render instance kept awake by an external `/health` ping every 10 minutes. **Replaces G6.** |
| F4 | Moderation: OpenAI `omni-moderation`. Needs `OPENAI_API_KEY`. |
| F5 | Cloudinary for the soft launch (keys in `.env`); Cloudflare R2 in Phase 1b (B0). |
| F6 | Gate 1a thresholds locked as written; cost measured at list price (shadow cost) since keys are free. |
| F7 | 1 Spark per creation; signup 5; weekly 3; rollover cap 10; referral 3 to inviter only (Master Doc 23.3 had both sides). |
| F8 | Deploy env vars set fresh at the post-fix redeploy (A10, A16). |
| F9 | `phase0/` is not promoted to the repo root. Disclaimer added to `docs/status_report.md`. |
| F10 | Avatar selection never shows Will. Master Doc 2.1 Will cost ranges = typical targets; 6.2 floors and caps = hard limits. |
| F11 | Lemon Squeezy parked until after the soft launch. |

### Still open (needs founder)
1. **Base spell tiers:** the 36 base spells are seeded as each element's Basic, Advanced and Mega spell in Master Doc 5.6 list order, because the doc states no tier per spell. Asked on 2026-10-11; the founder did not object but did not say yes either. Treated as accepted unless corrected.
2. **Growth suggestions:** all adopted. Built: example prompts, try before signup (browser-kept draft), the Codex (public newest-spells wall). Built but off: mending. Planned for the battle phase: one update email to opted-in players.
2a. Closed 2026-10-11: ascension is paid in Refinement Runes (starting value 5).
2b. **Sovereign tier:** stat caps, MP and Will ranges and Power Budget are not designed.
3. **Spark pack sizes:** 10, 30 and 90 are placeholders in `SPARK_PACKS`; decided in the battle phase (founder, 2026-10-11).
4. **Brevo authorised IPs:** this machine sends over IPv6 and the address rotates, so local sign-in emails keep failing with 401 until the current IPv6 address is authorised or "Authorised IPs" is turned off (recommended; Render needs the same).
5. Closed 2026-10-11: "the Arcanum" is confirmed as the entity's name.
6. **Deploy inputs:** given on 2026-10-11 (Render URL `https://arcanis-jpm1.onrender.com`, now in `vercel.json`; Render's IPs already authorised in Brevo; alert email and admin are the founder's own email). Still needed: the Vercel project's `.vercel.app` address (the founder has not created the project yet), which stands in for the public domain until there is a custom one.
7. Closed 2026-10-11: the fusion cost line moved from Phase 0 to Phase 1 in the Phase Plan.
8. **Try before signup, server version:** the founder floated storing a visitor's request on the server with an emailed time-limited link. Not built (it adds an unauthenticated write path); the browser-kept draft was built instead. The founder has not replied to that reasoning.
9. **Runes minted while refinement is off:** every forged spell still mints a Refinement Rune silently. Told to the founder; not explicitly confirmed.
10. **"Sanctum"** as the sidebar name for Home: Claude's pick after "Tower" was ruled out by decision G2. The founder has not reacted yet.

## 3. Task List

Checklist with acceptance checks: `docs/tasks.md`. Build order: Build Plan v2.6 Section 15.

- **Track A (Phase 1a):** A0 to A15 and A17 done. A16 (soft launch) is prepared; the remaining steps need the founder's accounts.
- **Local test rounds (2026-10-11):** T1 to T16, T8 (example prompts, mending, try before signup, the Codex) and T18 (changes from the founder's test of T8) done. The founder tested up to the first T8 build; the T18 and growth screens are untested in a browser.
- **Track B (Phase 1b battles):** not started. Begins with B0 (new database host, Cloudinary to R2). B2 (seed the 36 platform spells) was done early. B10 (open refinement: switch mending on, rename stone to rune in code, build ascension) added.

## 4. Session Log

| Date | Session | Outcome |
|---|---|---|
| 2026-10-09 | Audit | Read all docs and both codebases, ran tests and type-checks. Wrote `docs/status_report.md`, filled CLAUDE.md "Repo specifics", created this file. Raised decisions A to H. No code changed. |
| 2026-10-09 | Decisions | Founder decided A to H. Updated Master Doc to v7.1, Phase Plan to v2.1, Build Plan to v2.1 (with Track A/B build order), handover.md status, CLAUDE.md locked items and repo specifics, this file. Found DB host is TiDB Cloud. Could not check `VITE_PUBLIC_URL`. No code changed; waiting for go-ahead. |
| 2026-10-09 | Wrap | Created `docs/tasks.md` (Phase 0 to 1 checklist). Updated this file and CLAUDE.md. Committed all docs. |
| 2026-10-10 | Track A | On branch `track-a`: A0 to A13 done and committed (see docs/tasks.md). A17 UI port in progress (shell, card, pages done; screenshot-verified at 375px and desktop). Share-page fix: Vercel sends only preview bots to Render; people get the SPA. A14 corpus run was running in the background; rerun `pnpm corpus:run` then `pnpm cost-report --test --since <start> --write` for the cost sheet. Left: A14 sheet, A15 hardening, A16 launch (needs Cloudflare image keys, email fix, Render URL, redeploy), A17 finish and delete arcanis-ui. |
| 2026-10-11 | First local test and handover | Founder tested locally and asked for six changes, all built (T1 to T6): optional password sign-in (changes the no-passwords lock), signed-in Home, Spellbook with the 36 base spells and filters, signup grant 3, stronger Layer 1 stat guidance plus display-only sealed potential, one-step welcome and a five-tab profile window. Also: element art replaced generated images, pack prices hidden. Master Doc v7.4, Build Plan v2.4. Production migrated to 0016 and seeded. 115 tests passing. The dev server was stopped by the low-memory watchdog before the founder re-tested. Session handed over. |
| 2026-10-11 | Second local test | Founder tested T1 to T6 (all work) and asked for four changes, all built (T9 to T12): required password, Home after sign-in, the forge queue, current password to change a password with a forgot-password path. Also fixed: a failed sign-in email no longer rate-limits the retry; sign-in copy uses "sigil". Found: Brevo rejects this machine's IPv6 address; the test database's creation cap is used up by test runs. Master Doc v7.5, Build Plan v2.5, migration 0017 (test database only). Not committed. |
| 2026-10-11 | Second test, part 2 | Sidebar: logo is the menu button (left) and folds the desktop sidebar. Queue voice renamed to "the Arcanum". Audit of the "176 creations" that tripped the local cap: all were Spark spends in the test database from automated test runs and the previous session's live runs, none in production. Found and closed two sources of unasked live LLM calls from this session: the dev-startup model check (about 38 tiny calls across restarts) and the dev server's queue loop forging designs left by the test suite (13 Groq calls). New founder rule in CLAUDE.md. Session handed over. |
| 2026-10-11 | Commit and T8 | Full suite and type-check passed (128), second test round committed in five commits. Founder decided refinement: mending now with a third currency (Refinement Runes), ascension designed for 1b. Built T8: rune ledger, `spells.mend` sharing creation's verification, refine dialog, rune count in the profile window, six example prompts in the Lab. Master Doc v7.6, Phase Plan v2.3, Build Plan v2.6, migration 0018 (test database only). 140 tests passing. No live provider calls were made. Flagged: Master Doc 6.1 and 3 disagree on the Circle for Advanced. |
| 2026-10-11 | Founder test of T8, deploy prep | Founder tested locally. Built from the feedback: refinement switched off for the soft launch (opens with battles), currency renamed Refinement Runes, research comes first (sealed on the server, research tile, grant notice), a toast when a forge finishes after leaving the Lab, try before signup (browser-kept draft), the Codex (public newest-spells wall), sidebar Home renamed Sanctum. Decided: Advanced from Circle 4, Mega from Circle 6, a hidden Sovereign tier, ascension paid in runes, the Arcanum name kept. Production backed up and migrated to 0018; founder is admin there; vercel.json points at Render; fresh deploy guide in docs/launch_checklist.md. 140 tests passing. Branch pushed. |
| 2026-10-10 | Track A finish | A14 corpus run and cost sheet (found and fixed: hate and real-person prompts passed moderation), A17 UI port and arcanis-ui deleted (found and fixed: blank share pages, SVG previews ignored by crawlers), A15 HTTP end-to-end test and CSP, A16 production smoke test and launch runbook. 112 tests passing. |
| 2026-10-10 | Founder actions | Closed F1 to F11. Master Doc v7.2, Phase Plan v2.2, Build Plan v2.2; tasks.md (A1 now backup, A2 quota audit, A4 creation limit, A9 Cloudinary, new B0); status_report.md disclaimer that `phase0/` stays. No code changed. |
