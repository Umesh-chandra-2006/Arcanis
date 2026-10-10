# Arcanis: Progress

**Read this first in every new session.** It is the single source for "where is the project right now". Update it at the end of every working session: change the snapshot, record decisions, tick tasks, and add a line to the session log. Keep it short; detail belongs in `docs/`.

**Last updated:** 2026-10-11

---

## 1. Snapshot

| Area | State |
|---|---|
| Docs | Master Doc **v7.5**, Phase Plan **v2.2**, Build Plan **v2.5**. Cost sheet `docs/cost_sheet.md`; quotas `docs/provider_quotas.md`; launch runbook `docs/launch_checklist.md`; task checklist `docs/tasks.md`. `docs/status_report.md` is the 2026-10-09 audit and is now history. |
| Canonical codebase | **`phase0/`** (stays there, F9). Root prototype archived on branch `archive/root-prototype`. `arcanis-ui/` ported (A17) and deleted. |
| Branch | All work on **`track-a`** (last commit `bed68f8`). **The whole second test round (T9 to T16, docs v7.5) is uncommitted.** Not pushed, not merged into `main`. CI defined, never run. |
| Phase 0 (measure) | **Done** (A14): about $0.001 to $0.003 per creation at list price; 2c 1.7%; moderation false positives 0 of 120. |
| Phase 1a (creation soft launch) | **Code complete** (A0 to A15, A17) plus two local test rounds (T1 to T12 in `docs/tasks.md`). Waiting on the founder: a test of T9 to T12 (T13), the refine and example-prompt decisions (T8), then the deploy (A16). |
| Phase 1b (battles) | Not started (Track B). |
| Production database | Migrated to **0016** (`track-a` now needs **0017**: back up, then `pnpm db:migrate`, at the deploy); the 36 base spells are seeded there; backups in `D:\Arcanis-backups`. **The currently deployed app is incompatible with it until `track-a` is redeployed.** |
| Test database | `arcanis_test` on the same cluster, at **0017** with the 36 base spells. It is shared by the test suite and local dev, so test runs use up the daily creation cap: local dev shows "the forge is cooling" unless today's limit is raised (admin page, or `DAILY_CREATION_LIMIT` in the shell). |
| Tests | phase0: **128 tests across 17 files, all passing** (full run 2026-10-11, before the sidebar and rename; the type-check and the forge queue tests were rerun after). |
| Providers | All free tier. Text: Groq `openai/gpt-oss-120b`, Gemini flash-lite fallback. Moderation: OpenAI omni. Email: Brevo (IPs authorised for the founder's machine; Render's outbound IPs still to add). Storage: Cloudinary. **No image generation**: card faces are element art (`CARD_ART=element`). |
| Local dev server | May still be running from the 2026-10-11 session (port 3100, test database); it dies with that session. The machine has 1 to 2 GB free, and `tsc` or the test suite beside a dev server takes many minutes. Call `node_modules/.bin/tsc` and `node_modules/.bin/vitest` directly: `pnpm check` once hung in an implicit `pnpm install`. |
| Live provider calls | **Founder rule (CLAUDE.md): none without the founder's permission in that session.** The dev-startup model check is now opt-in and the forge queue loop skips test accounts. |

### Exact next step
1. **Founder tests T9 to T12, T14 and T15 locally** (T1 to T6 were tested and work): the logo menu button below 1024 px and the sidebar fold on desktop, the "Arcanum" wording, the required password at the welcome step, landing on Home after sign-in, "Forgot it?" on the sign-in form and in the Security tab, changing a password with the current one, and the forge queue (to see it, set today's creation limit to 0 on `/admin/metrics`, forge a spell, then restore the limit and wait up to 2 minutes). To run against the test database, in PowerShell:
   ```
   cd D:\Arcanis\phase0
   $env:DATABASE_URL = (Select-String -Path ..\.env -Pattern '^TEST_DATABASE_URL=').Line -replace '^TEST_DATABASE_URL=', ''
   pnpm dev
   ```
   Without the second line `pnpm dev` uses the production database.
2. **Founder answers the open questions** (list in "Still open" below).
3. **Then the deploy**, following `docs/launch_checklist.md` (A16).

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
1. **Base spell tiers:** the 36 base spells are seeded as each element's Basic, Advanced and Mega spell in Master Doc 5.6 list order, because the doc states no tier per spell. Confirm or correct.
2. **Phase 0 suggestions, none built yet:** (a) a "refine this spell" button for 1 Spark, (b) clickable example prompts in the Lab, (c) try-before-signup on the landing page, (d) a public "newest spells" wall, (e) one update email to subscribers before battles ship. Recommended first: (a) and (b). Founder to pick.
3. **Spark pack sizes:** 10, 30 and 90 are placeholders in `SPARK_PACKS`; prices are hidden by founder decision, so this can wait.
4. **Brevo authorised IPs:** this machine sends over IPv6 and the address rotates, so local sign-in emails keep failing with 401 until the current IPv6 address is authorised or "Authorised IPs" is turned off (recommended; Render needs the same).
5. **Forge queue details** (see the decisions table): Spark timing, the cap of 3, in-app notice only, the name "the Arcanum".
6. **Deploy inputs:** the Render service URL (for `pnpm vercel:config`), Render's outbound IPs added to Brevo, `FOUNDER_ALERT_EMAIL`, and which email should be made admin.
7. Fusion Spark cost listed in Phase 0 scope while Fusion is V2 (low priority, doc-only).

## 3. Task List

Checklist with acceptance checks: `docs/tasks.md`. Build order: Build Plan v2.4 Section 15.

- **Track A (Phase 1a):** A0 to A15 and A17 done. A16 (soft launch) is prepared; the remaining steps need the founder's accounts.
- **Local test rounds (2026-10-11):** T1 to T7 and T9 to T12 done; T8 (refine and example prompts, waiting on the founder's refine decisions) and T13 (founder tests T9 to T12) open.
- **Track B (Phase 1b battles):** not started. Begins with B0 (new database host, Cloudinary to R2). B2 (seed the 36 platform spells) was done early.

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
| 2026-10-10 | Track A finish | A14 corpus run and cost sheet (found and fixed: hate and real-person prompts passed moderation), A17 UI port and arcanis-ui deleted (found and fixed: blank share pages, SVG previews ignored by crawlers), A15 HTTP end-to-end test and CSP, A16 production smoke test and launch runbook. 112 tests passing. |
| 2026-10-10 | Founder actions | Closed F1 to F11. Master Doc v7.2, Phase Plan v2.2, Build Plan v2.2; tasks.md (A1 now backup, A2 quota audit, A4 creation limit, A9 Cloudinary, new B0); status_report.md disclaimer that `phase0/` stays. No code changed. |
