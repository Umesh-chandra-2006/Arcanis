# Arcanis: Phase 0 to Phase 1 Tasks

**Source:** Build Plan v2.2 Section 15, decisions of 2026-10-09 and 2026-10-10 (see `PROGRESS.md`). If this file and the Build Plan disagree, the Build Plan wins; flag the conflict.

**How to use:** work top to bottom within a track. Tick `[x]` when every acceptance check passes, and note the date and commit in the task line. Estimates are working days. Every task keeps the engineering rules in `CLAUDE.md` (Two-Step Verification and a Spark path on any AI call, auth on any spend path, Will never reaches the client, no em dashes, no secrets in git).

**Status:** founder actions closed 2026-10-10. Track A not started; waiting for founder go-ahead on A0.

---

## Founder actions (closed 2026-10-10)

- [x] F1 Spend caps (2026-10-10): every provider stays on a free tier with **no payment method attached**, so the provider-side cap is $0. App side: `DAILY_SPEND_LIMIT_USD=2` on real spend (inert while everything is free) and `DAILY_CREATION_LIMIT` at about 80% of the tightest free quota, set by the A2 quota audit (placeholder 50). If a card is ever added to an account, set a $10/month hard cap with an alert at 50%.
- [x] F2 Database (2026-10-10): the owning TiDB account is not known. Keep the current cluster through the soft launch; A1 takes a logical backup and adds a recurring dump. **Migrate to a new, founder-owned DB host in Phase 1b (task B0).**
- [x] F3 Render (2026-10-10): stay on the free instance, kept awake by an external `/health` ping every 10 minutes (in A16). Replaces decision G6.
- [x] F4 Moderation (2026-10-10): OpenAI `omni-moderation` (text and image). **Still needed: an OpenAI API key in `.env` as `OPENAI_API_KEY` before A6.**
- [x] F5 Storage (2026-10-10): Cloudinary for the soft launch (keys in `.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`); Cloudflare R2 in Phase 1b (B0).
- [x] F6 Gate 1a thresholds (2026-10-10): locked as written in Phase Plan v2.2 Section 5. Cost criterion measured at list price (shadow cost) because providers are on free tiers.
- [x] F7 Spark values (2026-10-10): 1 Spark per creation; signup 5; weekly allowance 3; rollover cap 10; referral 3 to the inviter only. Free-tier quotas are enforced by `DAILY_CREATION_LIMIT` (A4).
- [x] F8 Deploy env vars (2026-10-10): not audited; set fresh at the post-fix redeploy (A10, A16).
- [x] F9 Repo layout (2026-10-10): `phase0/` stays where it is; not promoted to the repo root.
- [x] F10 Doc conflicts (2026-10-10): avatar selection never shows Will; Master Doc 2.1 Will cost ranges are typical targets, 6.2 floors and caps are the hard limits.
- [x] F11 Lemon Squeezy (2026-10-10): parked until after the soft launch. Phase 2 prerequisite, Paddle fallback.

---

## Track A: Phase 0 measurement and Phase 1a soft-launch blockers

Order matters: A0 to A3 are foundations; A4 onward can overlap where noted.

### A0 Housekeeping (1)
- [x] Archive the root app on branch `archive/root-prototype`, then remove it: root `client/`, `server/`, `shared/`, `drizzle/`, root package files, Manus template leftovers (`references/`, `template.json`, root `README.md` replaced by a short one), `scratch/`, Hearth. (2026-10-10) `arcanis-ui/` is kept as the A17 design reference and deleted when A17 is done.
- [x] Remove stray logs in `phase0/` (`server.log`, `server.err.log`, `smoke-*.log`); `*.log` was already gitignored. (2026-10-10)
- [x] Add `.env.example` with key names only. (2026-10-10)
- [x] Separate test database: `arcanis_test` on the same cluster locally (`TEST_DATABASE_URL`), MySQL 8.4 container in CI; `server/test/setup-env.ts` swaps the URL and refuses production; global setup migrates it. (2026-10-10)
- [x] GitHub Actions (`.github/workflows/ci.yml`): install, type-check, test, build on every push and PR. (2026-10-10; green once pushed, not yet run)
- **Done when:** `main` contains only the canonical app plus docs; CI is green; tests cannot touch production data.

### A1 Database backup (0.5)
- [x] Before any schema work: logical dump of the current TiDB database stored outside the repo (`D:\Arcanis-backups`); restored into a scratch DB with every table's row count matching. (2026-10-10)
- [x] `pnpm db:backup` and `pnpm db:restore-check` (`phase0/scripts/`), documented in `CLAUDE.md`. (2026-10-10)
- [ ] Founder, best effort: find which TiDB Cloud account owns host `gateway06.us-east-1.prod.aws.tidbcloud.com` (try each likely email at tidbcloud.com).
- **Done when:** a verified restore exists and the dump script is documented. The host move itself is B0.

### A2 Provider interfaces and cost telemetry (2)
- [x] Interfaces in `phase0/shared/providers.ts`; implementations in `phase0/server/providers/` for text (Groq, Gemini, OpenRouter), image (Cloudflare Workers AI, Hugging Face), moderation (OpenAI, local dev list), email (Brevo, Resend), storage (Cloudinary, inline dev). Selected by `SPELL_LLM_PROVIDER`/`SPELL_LLM_FALLBACK_PROVIDERS`, `SEMANTIC_CHECK_PROVIDERS`, `IMAGE_PROVIDER`, `MODERATION_PROVIDER`, `EMAIL_PROVIDER`, `STORAGE_PROVIDER`. (2026-10-10)
- [x] `p0_provider_calls` (migration 0003, applied to production after a backup); `withTelemetry` logs surface, provider, model, units, latency, cost estimate, outcome for every attempt, success or failure. A test fails if any file outside `server/providers/` calls an external API. (2026-10-10)
- [x] Live model check: `pnpm providers:check [--images]`, plus a non-blocking check at dev startup; retired IDs log `[MODEL RETIRED]`. Replaced `llama-3.1-70b-versatile` with `openai/gpt-oss-120b` (Groq), `gemini-1.5-flash` with `gemini-flash-latest` and `gemini-flash-lite-latest`, OpenRouter Llama with `google/gemma-4-31b-it:free`. (2026-10-10)
- [x] Free-tier quota audit: `docs/provider_quotas.md`. Findings: Hugging Face credits exhausted (images down); Cloudflare Workers AI added as primary image provider (needs founder keys); Brevo blocks unknown IPs; Resend has no verified domain. (2026-10-10)
- [x] Each wrapper records list-price `cost_estimate_usd` (shadow cost, `server/providers/pricing.ts`). (2026-10-10)
- **Done when:** no provider request or response shape exists outside `server/providers/`; one creation produces a full set of `provider_calls` rows. Met; the full per-creation set is exercised end to end in A15.

### A3 Spark ledger rewrite (2)
- [x] Append-only `p0_spark_ledger` (pending, committed, reversed); balance = sum of non-reversed entries; amounts never change. (2026-10-10)
- [x] Reserve in one READ COMMITTED transaction holding the user's row lock (`SELECT ... FOR UPDATE`); commit and refund are conditional updates (no double refund). Stale pending spends (over 10 minutes) are released on the next reserve. (2026-10-10)
- [x] Signup grant once per device: server-issued `arc_did` cookie, plus fingerprint and network prefix (`p0_device_grants`); weekly allowance lazily from the week after signup, capped at 10; values in `SPARK` (`shared/constants.ts`). (2026-10-10)
- [x] Migrated `p0_spark_balances` into opening ledger entries (migrations 0004 to 0006, applied to production after a backup; all 7 balances matched) and dropped the old tables. (2026-10-10)
- [x] Concurrency tests (`server/spark.test.ts`): 8 parallel creates against a balance of 2 succeed exactly twice; 6 parallel refunds refund once. (2026-10-10)
- **Done when:** the double-spend race in `phase0/server/spark.ts` is gone and tests prove it. Met. The tests first failed: TiDB's REPEATABLE READ snapshot hid concurrent spends after the lock; fixed with READ COMMITTED.

### A4 Daily spend circuit breaker (0.5) (after A2)
- [x] `server/spend-breaker.ts`: before reserving Spark, sums today's UTC `cost_estimate_usd` over `BILLED_PROVIDERS` (real spend; empty while every key is free) against `DAILY_SPEND_LIMIT_USD`; refuses with "The forge is cooling. Try again soon.", reserves nothing, logs `creation_blocked_spend_cap`, emails `FOUNDER_ALERT_EMAIL` once per day. (2026-10-10)
- [x] `DAILY_CREATION_LIMIT`: counts today's pending and committed spends; a provider quota exhaustion trips the breaker until the next UTC day or an admin reset. Defaults 2 USD and 50. (2026-10-10)
- [x] Admin reset or raise: `admin.breakerStatus`, `admin.breakerReset`, `admin.breakerSetLimits` (admin role only; UI in A11). State in `p0_breaker_days` (migration 0007, applied to production). (2026-10-10)
- **Done when:** a test proves generation is refused at either limit with no Spark reserved. Met (`server/spend-breaker.test.ts`).

### A5 Identity (1.5)
- [x] 6-digit code in the same email as the link: HMAC-hashed with a server pepper, 10 minute expiry, single use, 5 attempts claimed atomically before comparison, DB-backed rate limits per email, IP and device (`p0_rate_limits`, survives restarts). Using link or code consumes both. (2026-10-10)
- [x] Link tokens stored as SHA-256; redemption is a single conditional update (`p0_login_tokens`). (2026-10-10)
- [x] Passwords removed: sign-up, sign-in, `setPassword`, password UI, `EMAIL_HAS_PASSWORD`; `password_hash` column and `p0_magic_links` dropped (migrations 0008, 0009, applied to production after a backup). One `SignInForm` (email, then code) on Home and `/signin`. (2026-10-10)
- [x] Session: random token in an httpOnly, SameSite=Lax (Secure in production) `arc_session` cookie, hashed in `p0_sessions`, 30 days, revocable on logout; no token in localStorage; `jsonwebtoken` removed. (2026-10-10)
- [x] `accountStatus` removed; `requestSignIn` returns the same response for any valid email. (2026-10-10)
- **Done when:** Build Plan Section 16 identity tests pass. Met (`server/auth-service.test.ts`: 12 parallel wrong guesses stop at 5 attempts; link and code each redeem once under concurrency; identical response for new and existing emails), plus an HTTP smoke test of request, code, session, `me` and logout. Production note: the client must call the API same-origin (Vercel `/api` rewrite, A10) or the cookie is not sent.

### A6 Moderation and Layer 2c (3) (after A2; OpenAI `omni-moderation`)
- [x] Layer 2b on user input (before any generation), generated text, generated images (base64 data URL, verified live) and reviews (before display). Policy is ours, not the provider's `flagged` flag: omni-moderation flags ordinary fantasy combat as `violence`, so plain violence never blocks; per-surface thresholds for sexual, minors, hate, harassment, self-harm, illicit and graphic violence (`server/moderation.ts`; tuned in A14). (2026-10-10)
- [x] Layer 2c (`server/semantic-check.ts`): small model, only when 2b says borderline or 2a fell back; structured pass/fail with a reason code; fails closed. (2026-10-10)
- [x] Silent retry with an adjusted prompt (2 retries, `GENERATION_RETRIES`); refund on exhaustion; user-caused input rejection keeps the Spark and adds an abuse strike (3 strikes: 24h restriction; 6: ban). An unexpected exception after the reservation always refunds. Images regenerate on a flag, then fall back to the placeholder. (2026-10-10)
- [x] `p0_moderation_events`, `p0_generation_runs` (migrations 0010 to 0012, applied to production after a backup); report button on public spells and reviews; admin queue at `/admin/moderation` (approve, take down, strike, ban, restore); takedown makes the preview and image routes return 410. (2026-10-10)
- **Done when:** no unmoderated AI text, image or review can reach a user; 2c trigger rate is logged. Met: every path is covered by `server/spell-pipeline.test.ts` (12 cases with fake providers) and one live creation (`pnpm creation:live`, Groq plus OpenAI, 8.9s, shadow cost $0.0003); `layer_2c_fired` is recorded per run. Note: Layer 1 and the image run in sequence, not in parallel as Build Plan 7.1 step 4 says, because 7.6 derives the image prompt from Layer 1's output.

### A7 Hybrid Power Budget (2.5)
- [x] Budget in power points from tier, category and cast type (element tilts the default profile); per-field ranges inside Master Doc caps; weights, modifiers and the 85 percent floor in `POWER_BUDGET_CONFIG` (`shared/power-budget.ts`). (2026-10-10)
- [x] Layer 1 prompt carries the ranges and the budget share; the model returns real stat values plus identity text. (2026-10-10)
- [x] Layer 2a clamps fields, enforces caps and the budget total (proportional rescale), raises below-floor allocations, settles rounding exactly inside the bounds, falls back to the default profile on malformed output and flags it (which escalates to 2c). Tier always from the request. (2026-10-10)
- [x] Creation form and validation: all 12 elements; Attack, Defense, Regen, Debuff, Drain (drain ratio is a stat); Instant only (`CREATION_ENABLED`, `shared/taxonomy.ts`). Engine taxonomy, caps and enums cover all 10 categories, 5 cast types and 4 tiers. (2026-10-10)
- [x] Property tests (`shared/power-budget.test.ts`): 2,880 random and adversarial allocations across the full taxonomy, plus the default profile for every combination, stay inside ranges, caps, floor and budget with zero tolerance. (2026-10-10)
- **Done when:** two spells with the same classification but different descriptions can differ mechanically. Met (unit test, and live: "slow, heavy meteor" gave damage 25 to 35, MP 15, heavy strain). Code fix flagged: phase0 clamped Instant cast time to 800 to 1200 ms; Master Doc 5.2 says 200 to 800, now enforced. Will cost never leaves the server as a number: spells go out through `toPublicSpell` with a Light/Moderate/Heavy `strain`.

### A8 Balance harness skeleton and cost report (2)
- [x] `phase0/tools/balance-harness/corpus/creation-corpus.json`: 120 realistic prompts (12 elements x 5 categories x 2 styles) plus 15 adversarial (prompt injection, god spells, off-premise, gore, hate, sexual, real person, self-harm, noise). Lives under `phase0/` because there is no root package. (2026-10-10)
- [x] Power Budget coverage report (`pnpm harness`, `--offline`): clamp, rescale and fallback rates, budget use, stat spread, damage per MP and per Will by category and element; one request at a time with backoff. First live report committed (`reports/power-budget-live-2026-10-09.md`): 135 of 135, median Layer 1 1.7 s, 60 of 60 same-classification pairs differ, 53% over budget and rescaled, all injection attempts capped. (2026-10-10)
- [x] `pnpm cost-report [--test] [--days|--since] [--write]`: cost per successful creation, retry, schema failure, 2a clamp and fallback, 2b flag and rejection, 2c trigger rates, latency p50/p95, per-provider call table. (2026-10-10)
- [x] Commands documented in `CLAUDE.md`. (2026-10-10)
- **Done when:** both tools run from one command each and produce a readable report. Met. The first live run found a real bug: per-minute 429s (Groq TPM, Gemini PerMinute) were classified as daily quota, which would have tripped the breaker for the whole day after one burst. Fixed (classifier uses real provider bodies, tested) and the pipeline now backs off 3 s and 8 s before retrying when every provider is only throttled.

### A9 Object storage and OG image (1.5) (Cloudinary)
- [x] `STORAGE_PROVIDER=cloudinary`; new spells upload the original, a 768x1024 portrait card crop and a composed 1200x630 OG image (`server/spell-images.ts`, sharp); DB stores URLs only. (2026-10-10)
- [x] OG variant is a composition (art on the right, spell name, element, Arcanis mark, black and gold frame), not a crop. (2026-10-10)
- [x] Dominant colour stored for the card border. (2026-10-10)
- [x] One-off script `pnpm images:migrate [--dry-run|--refresh]`: moved the 3 base64 rows in production to Cloudinary (backup first); `--refresh` rebuilds variants after a design change. (2026-10-10)
- [x] Background regeneration for placeholder spells (`server/image-retry.ts`, every 15 min, 4 attempts, stops on quota), per Build Plan 7.6. Accent colour picks the most common vivid hue (gold fallback); sharp's plain dominant colour picked murky shadows. (2026-10-10)
- **Done when:** no base64 image remains in the DB and the OG endpoint serves a 1200x630 image. Met: 0 inline images remain; the OG image route redirects to the composed 1200x630 JPEG (verified by download). 13 older spells have no art at all (created while image generation failed); they regenerate once Cloudflare image keys are set.

### A10 Share path and referral (1)
- [x] `vercel.json` rewrites `/api/*`, `/health`, `/spell/:id/image` and `/spell/:id` to Render before the SPA catch-all, generated by `pnpm vercel:config <render-url>`. Until the founder runs it with the Render URL it holds a `RENDER_API_ORIGIN` placeholder, and `build:client` fails on Vercel so a broken deploy cannot ship. (2026-10-10)
- [x] Client always calls `/api/trpc` same-origin (`VITE_API_URL` removed: a cross-site API would drop the session cookie). OG tags use `FRONTEND_URL` (the public domain) because behind the rewrite the Host header is Render's. Share links use `VITE_PUBLIC_URL`. Set at the redeploy: Vercel `VITE_PUBLIC_URL` = public domain; Render `FRONTEND_URL` = public domain, `CORS_ALLOWED_ORIGINS` = public domain, `TRUST_PROXY_HOPS=2`. (2026-10-10)
- [x] Referral code per user on every share link (`?ref=`), captured into an `arc_ref` cookie on the share page; a new account from that browser is attributed (`p0_referrals`, migration 0013 applied to production); the inviter gets 3 Spark once, when the invitee's first creation passes verification; self, same-device and unknown codes are rejected (`server/referrals.test.ts`). (2026-10-10)
- **Done when:** a share link on the public domain shows the right card on Discord, X and WhatsApp, and a referred signup pays the inviter once. Referral half met by tests. The platform OG check needs the deployed domain, so it moves to A16 (after `pnpm vercel:config` and the redeploy).

### A11 Analytics hardening and Gate 1a metrics (1)
- [x] Public track endpoint: anonymous events only from the allowlist (`landing_view`, `preview_viewed`, `preview_cta_clicked`, `share_clicked`); signed-in players may also send `lab_opened`, `spark_low_viewed`; zod schema per event (unknown props dropped), 1 KB limit, rate limit per IP and anonymous id; user always from the session (`shared/analytics-events.ts`). (2026-10-10)
- [x] Events renamed to Build Plan 12 (`magic_link_requested`, `signup_confirmed` with `signup_method` and `referred`, `creation_started/succeeded/refunded/rejected`, `preview_viewed` with referrer, `share_clicked` with channel, `referral_paid`, `session_day_n`, `creation_blocked_spend_cap`); the owner opening their own link no longer counts as a preview. Events before 2026-10-10 use the old names (pre-launch test data). (2026-10-10)
- [x] Admin page `/admin/metrics`: every Gate 1a metric per the Phase Plan v2.2 definitions (mature cohorts only, standard k-factor), pass/fail against the locked thresholds, day-1 return, creations per active player, fake-door intent; spend breaker status with clear-trip and today's limit (A4 UI). Metrics endpoints are admin-only (`METRICS_KEY` removed). (2026-10-10)
- **Done when:** non-allowlisted anonymous events are rejected and every Gate 1a metric is computable from the admin page. Met (`server/analytics.test.ts`, including a seeded cohort checking signup conversion 2/4, day-7 retention 1/3 and k = 0.5). Also fixed: Create and Library bounced signed-in players to Home on reload while the cookie session was still loading (regression from A5).

### A12 Product copy and flow (1.5)
- [x] "The Tower" narrative voice replaced everywhere (client, OG copy, Layer 1 prompt, seed data, and 2 production lore lines plus the `tower_archivist` username); em dashes removed from phase0 sources. (2026-10-10)
- [x] `assessment_question` removed from prompt, schema (migration 0011) and UI. (2026-10-10)
- [x] No Will number in any payload or screen: spells leave the server only through `toPublicSpell`; the card shows no Will; the spell detail view shows Strain (Light, Moderate, Heavy). (2026-10-10)
- [x] Onboarding straight to creation (sign-in lands on `/create`); share prompt on the finished card; "Name your mage" asked the first time a public name is needed (first share or first review), moderated and unique (`profile.setName`, migration 0014). New accounts get a neutral `mage_xxxxxxxx` name: names were derived from the email prefix and shown publicly on reviews. (2026-10-10)
- [x] `research_ready_at`, first 2 exempt (A6/A7 pipeline); library shows a dimmed card with "Researching", no lock language, no time. (2026-10-10)
- **Done when:** DoD item 9 passes (no XP, circles, proficiency or Tower anywhere) and no Will number appears in any payload or screen. Met (`server/leakage.test.ts`: every spell-returning endpoint checked through the real router; client source scan).

### A13 Fake door (0.5)
- [x] Spark pack tiles marked "coming soon" (prices from Master Doc 28.3; Spark counts 10/30/90 are placeholders for the founder in `SPARK_PACKS`), shown when the player reaches zero Spark and from the Spark chip; `spark_pack_intent` with pack, source and balance; waitlist opt-in (`p0_spark_waitlist`, migration 0015 applied to production); no grant ever. `spark_zero_reached` (once per player per day) gives the metric its denominator. (2026-10-10)
- **Done when:** intent and waitlist joins are recorded and visible on the admin page. Met (`server/fake-door.test.ts`; `/admin/metrics` shows pack clicks, waitlist size and intent rate at zero Spark).

### A14 Phase 0 measurement (1) (after A2, A6, A7, A8)
- [ ] Run the corpus through the chosen providers.
- [ ] One-page cost sheet in `docs/`: cost per creation, latency, schema failure rate, 2a clamp rate, 2c trigger rate, moderation false-positive rate (on a hand-reviewed sample).
- [ ] If all-in cost per creation exceeds $0.08, stop and revisit model tiering with the founder.
- **Done when:** the Phase 0 exit criteria in Phase Plan v2.1 Section 4 are met.

### A15 Hardening (1.5)
- [ ] End-to-end creation test (signup by code, create, share, preview).
- [ ] Failure injection: text provider down, image provider down, moderation reject, spend cap hit; Spark always refunded where the user did not cause it.
- [ ] Abuse tests: disposable emails, same-device grant farming, rate limits.
- [ ] OG check on real platforms; Will leakage scan of all payloads.
- **Done when:** all Phase 1a DoD items in Build Plan v2.1 Section 1 pass.

### A16 Soft launch
- [ ] Redeploy with the env vars from A10.
- [ ] Keep-awake monitor (F3): cron-job.org or UptimeRobot hits `/health` every 10 minutes and alerts the founder on downtime. No other free Render service on the account.
- [ ] Small invited cohort; watch cost, quota and funnel dashboards for a week; then open.
- [ ] Record the Gate 1a evaluation date (4 to 6 weeks out).

---

## Track B: Phase 1b async battles (parallel once A0 to A3 land)

### B0 Infrastructure move (2 to 3) (start of 1b; F2, F5)
- [ ] Provision a new, founder-owned database host (MySQL-compatible keeps Drizzle as is; Postgres means a dialect port, decide then); migrate data from the A1 dump plus a final cutover dump; switch `DATABASE_URL`; verify.
- [ ] Cloudflare R2 bucket; implement the R2 storage provider; copy every image from Cloudinary; switch `STORAGE_PROVIDER`; rewrite stored URLs.
- **Done when:** production runs on the new DB and R2, with verified backups, and nothing references the old cluster or Cloudinary.


### B1 Battle engine (8 to 10)
- [ ] Pure, data-driven turn resolution in fixed order (Build Plan 8.2); all 10 categories and 5 cast types; variable damage; interruption and consequences; one trap slot; one summon (autonomous and controlled); 15 terrains with modifiers and reshape.
- [ ] Will capacity and current Will, percentage bands from config, server emits band keys only.
- [ ] Scenario tests per mechanic (Build Plan Section 16).

### B2 Platform spells (1)
- [ ] Seed the 36 spells exactly as Master Doc 5.6 (Conflagration Wave: Attack, Continuous), stats inside caps.

### B3 Server-scored minigames (3 to 4)
- [ ] Six element-group minigames; server-issued seed and deadline; client sends raw input events; server replays and scores; implausible input scores as minimum; auto-resolve under 5 seconds.
- [ ] Tests: replay determinism, forged streams score minimum.

### B4 Piloted sampling (0.5)
- [ ] `minigame_results`; daily population medians per group (harness defaults until real data); piloted accuracy = w x owner_sample + (1 - w) x population_median, w = n / (n + 10), seeded per battle.

### B5 Opponents (4)
- [ ] Profile snapshots, playstyle vector, rule-based move scoring with bounded randomness, matchmaking by strength band and sample size, vs-System bot labelled honestly.
- [ ] Tests: determinism under fixed seed, no impossible casts.

### B6 Battle UI (5)
- [ ] Socket.io session, battle screen per Master Doc 19, minigame overlays, Will feedback variant pools (6 to 8+ per band, Two-Step Verified), avatar selection (no Will shown) and guided first battle.

### B7 Persistence and rematch (1.5)
- [ ] Battle records with turn log and Will-band events; rematch notification (in-app inbox plus email digest).

### B8 Balance and Will tuning (2.5)
- [ ] Harness battle simulation: win rates by category, cast type, element, terrain; Will band dwell time per avatar; tune band edges and strain descriptor cut points.
- [ ] Will leakage tests on every battle payload.

### A17 UI port from `arcanis-ui` (after A12, before A16)
- [ ] Port the `arcanis-ui` visual system (black and gold tokens, fonts, panels, element icons, bars, spell card, app shell) into `phase0/client`.
- [ ] Restyle every phase0 page (Home, SignIn, Create, Library, ShareSpell, Reviews, AdminMetrics, fake-door tiles) on that system, keeping the A12 copy rules (no Will numbers, no Tower, no XP).
- [ ] Mobile at 375px with no horizontal scroll; light/dark not required (black and gold default).
- [ ] Delete `arcanis-ui/` once ported.
- **Done when:** every phase0 screen uses the arcanis-ui components and tokens, `pnpm check` is clean, and the creation flow still passes the A15 end-to-end test.

### B9 Battle release (1)
- [ ] Re-enable Trap and Charged in creation; battle analytics events; full Gate 1 tracking.
- **Done when:** all Build Plan v2.1 DoD items (1a and 1b) pass. Phase 1 complete.
