# Arcanis: Phase 0 to Phase 1 Tasks

**Source:** Build Plan v2.1 Section 15, decisions of 2026-10-09 (see `PROGRESS.md`). If this file and the Build Plan disagree, the Build Plan wins; flag the conflict.

**How to use:** work top to bottom within a track. Tick `[x]` when every acceptance check passes, and note the date and commit in the task line. Estimates are working days. Every task keeps the engineering rules in `CLAUDE.md` (Two-Step Verification and a Spark path on any AI call, auth on any spend path, Will never reaches the client, no em dashes, no secrets in git).

**Status:** nothing started. Waiting for founder go-ahead.

---

## Founder actions (parallel, block the tasks noted)

- [ ] F1 Set hard spend caps and alerts at every provider (text, image, moderation, email). Blocks A16.
- [ ] F2 Decide database host: keep TiDB Cloud (confirm plan, spend limit, backup retention) or migrate to Supabase. Blocks A1.
- [ ] F3 Upgrade Render to one paid instance. Blocks A16.
- [ ] F4 Choose moderation provider (text and image). Blocks A6.
- [ ] F5 Create object storage account and bucket (recommend Cloudflare R2). Blocks A9.
- [ ] F6 Confirm Gate 1a thresholds (Phase Plan v2.1 Section 5). Blocks A16.
- [ ] F7 Set weekly free Spark allowance, rollover cap, signup grant and referral bonus. Blocks A3 config values (code can land with placeholders).
- [ ] F8 Check `VITE_PUBLIC_URL` (and `VITE_API_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`) in the Vercel and Render dashboards. Blocks A10.
- [ ] F9 Decide whether to promote `phase0/` to the repo root after archiving (needs Vercel and Render root-directory changes). Affects A0.
- [ ] F10 Resolve doc conflicts: avatar selection showing Will (Master Doc 18.2); Will cost ranges (2.1) vs floors/caps (6.2). Blocks B1.
- [ ] F11 Verify Lemon Squeezy for an India-based seller (Phase 2 prerequisite; Paddle fallback). Does not block Phase 1.

---

## Track A: Phase 0 measurement and Phase 1a soft-launch blockers

Order matters: A0 to A3 are foundations; A4 onward can overlap where noted.

### A0 Housekeeping (1)
- [ ] Archive the root app on branch `archive/root-prototype`, then remove from `main`: root `client/`, `server/`, `shared/`, `drizzle/`, root package files, Manus template leftovers (`references/`, `template.json`, root `README.md`), `arcanis-ui/`, `scratch/`, Hearth.
- [ ] Remove stray logs in `phase0/` (`server.log`, `server.err.log`, `smoke-*.log`) and gitignore them.
- [ ] Add `.env.example` with key names only.
- [ ] Separate test database: tests read `TEST_DATABASE_URL` and refuse to run against the production URL.
- [ ] GitHub Actions: install, type-check, test on every push and PR.
- **Done when:** `main` contains only the canonical app plus docs; CI is green; tests cannot touch production data.

### A1 Database host (0 to 3)
- [ ] Apply F2. If migrating: provision, port the Drizzle schema, migrate data, switch `DATABASE_URL`, verify.
- **Done when:** the production DB does not sleep, is not connection-capped at launch volume, and has verified backups.

### A2 Provider interfaces and cost telemetry (2)
- [ ] Interfaces in `phase0/shared/` for text, image, moderation, email, storage, each chosen by one env var (`SPELL_LLM_PROVIDER`, `IMAGE_PROVIDER`, `MODERATION_PROVIDER`, `EMAIL_PROVIDER`, `STORAGE_PROVIDER`).
- [ ] `provider_calls` table; every wrapper logs surface, provider, model, units, latency, cost estimate, outcome. No call site can bypass it.
- [ ] Live call to every configured model ID; replace retired IDs (Groq `llama-3.1-70b-versatile` and `gemini-1.5-flash` are suspected retired). A retired ID fails loudly instead of silently falling through.
- **Done when:** no provider request or response shape exists outside `shared/` providers; one creation produces a full set of `provider_calls` rows.

### A3 Spark ledger rewrite (2)
- [ ] Append-only `spark_ledger` (pending, committed, reversed); balance = sum of non-reversed entries.
- [ ] Reserve in one transaction with `SELECT ... FOR UPDATE`; commit and refund are conditional updates (no double refund).
- [ ] Signup grant once per device fingerprint; weekly free allowance with rollover cap (values from F7, placeholders until then).
- [ ] Migrate existing `p0_spark_balances` into ledger entries.
- [ ] Concurrency tests: parallel creates never overspend; parallel refunds never double-refund.
- **Done when:** the double-spend race in `phase0/server/spark.ts` is gone and tests prove it.

### A4 Daily spend circuit breaker (0.5) (after A2)
- [ ] Before reserving Spark, sum today's UTC `cost_estimate_usd`; at or above `DAILY_SPEND_LIMIT_USD`, refuse with "The forge is cooling", reserve nothing, log `creation_blocked_spend_cap`, email the founder.
- [ ] Admin reset or raise.
- **Done when:** a test proves generation is refused at the limit with no Spark reserved.

### A5 Identity (1.5)
- [ ] 6-digit code in the same email as the link: hashed, 10 minute expiry, single use, 5 attempts, rate-limited per email and IP. Using link or code consumes both.
- [ ] Magic-link tokens stored hashed; redemption is a single conditional update.
- [ ] Remove password sign-up, sign-in, `set_password` step, `/signin` password UI, `EMAIL_HAS_PASSWORD`; delete password hashes in a migration (existing users sign in by link or code).
- [ ] Session in httpOnly, Secure, SameSite=Lax cookie; remove JWT from localStorage.
- [ ] Remove the public `accountStatus` endpoint; request-link always returns the same response.
- **Done when:** Build Plan Section 16 identity tests pass (brute force stopped, single redemption under concurrency, no enumeration).

### A6 Moderation and Layer 2c (3) (after A2, needs F4)
- [ ] Layer 2b on user input (before any generation), generated text, generated images, and reviews (before display).
- [ ] Layer 2c small-model check, only when 2a or 2b flags; structured pass/fail with reason code.
- [ ] Silent retry with adjusted prompt (default 2); refund on exhaustion; user-caused input rejection does not refund and adds an abuse strike.
- [ ] `moderation_events`, report button on public spells and reviews, minimal admin queue, takedown (preview returns 410).
- **Done when:** no unmoderated AI text, image or review can reach a user; 2c trigger rate is logged.

### A7 Hybrid Power Budget (2.5)
- [ ] Budget in power points from tier, element, category, cast type; per-field ranges inside Master Doc caps; point costs and 85 percent floor in config.
- [ ] Layer 1 prompt carries budget and ranges; model returns an allocation plus identity text.
- [ ] Layer 2a clamps fields, enforces caps and budget total (proportional rescale), raises below-floor allocations, falls back to the deterministic profile on malformed output and logs a flag. Tier always from the request.
- [ ] Creation form: all 12 elements; categories Attack, Defense, Regen, Debuff, Drain; Instant only.
- [ ] Property tests: no input, including adversarial allocations, escapes ranges, caps, floor or budget.
- **Done when:** two spells with the same classification but different descriptions can differ mechanically, and every stored allocation passes the property checks.

### A8 Balance harness skeleton and cost report (2)
- [ ] `tools/balance-harness/corpus/`: 100+ realistic prompts across all 12 elements and enabled categories, plus adversarial prompts.
- [ ] Power Budget coverage report: clamp, rescale and fallback rates per classification; stat spread; damage-per-MP and damage-per-Will by category and element.
- [ ] `tools/cost-report`: cost per successful creation, retry rate, schema failure rate, 2a clamp rate, 2b rejection rate, 2c trigger rate, from `provider_calls` and `generation_runs`.
- [ ] Document both commands in `CLAUDE.md`.
- **Done when:** both tools run from one command each and produce a readable report.

### A9 Object storage and OG image (1.5) (needs F5)
- [ ] Upload original, portrait card and 1200x630 OG variant to storage; DB stores URLs only.
- [ ] OG variant is a composed image (art, spell name, element, Arcanis mark), not a crop.
- [ ] Dominant color for the card border.
- [ ] One-off script migrating existing base64 rows.
- **Done when:** no base64 image remains in the DB and the OG endpoint serves a 1200x630 image.

### A10 Share path and referral (1) (needs F8)
- [ ] `vercel.json`: rewrite `/api/*` and the share route (`/spell/:id` and its image route) to Render before the SPA catch-all.
- [ ] `VITE_PUBLIC_URL` equals the public domain.
- [ ] Referral code carried on the preview link; inviter and invitee bonus when the invitee's first creation passes verification; self and same-device referrals rejected.
- **Done when:** a share link on the public domain shows the right card on Discord, X and WhatsApp, and a referred signup pays both sides once.

### A11 Analytics hardening and Gate 1a metrics (1)
- [ ] Public track endpoint: anonymous events only from the allowlist (`landing_view`, `preview_viewed`, `preview_cta_clicked`, `share_clicked`), zod-validated props, size limit, rate limit per IP and anon ID; authenticated events take the user from the session.
- [ ] Rename events to Build Plan Section 12; add `signup_method`, `spark_pack_intent`, `spark_waitlist_joined`, `creation_blocked_spend_cap`.
- [ ] Admin page: Gate 1a metrics per Phase Plan v2.1 definitions, standard k-factor.
- **Done when:** non-allowlisted anonymous events are rejected and every Gate 1a metric is computable from the admin page.

### A12 Product copy and flow (1.5)
- [ ] Replace "the Tower" narrative voice everywhere (about 27 places) with a neutral Arcanis voice.
- [ ] Remove `assessment_question` from prompt, schema and UI.
- [ ] Remove the Will number from `SpellCard.tsx`; spell detail view shows Light / Moderate / Heavy only.
- [ ] Onboarding straight to creation, share prompt after first card, name asked when first needed.
- [ ] `research_ready_at` on spells; first 2 per account exempt; library shows "researching" without lock language.
- **Done when:** DoD item 9 passes (no XP, circles, proficiency or Tower anywhere) and no Will number appears in any payload or screen.

### A13 Fake door (0.5)
- [ ] Spark pack tiles marked "coming soon" at zero Spark and from the Spark chip; `spark_pack_intent` with pack; waitlist opt-in (`spark_waitlist`); no grant.
- **Done when:** intent and waitlist joins are recorded and visible on the admin page.

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

### A16 Soft launch (needs F1, F3, F6)
- [ ] Small invited cohort; watch cost and funnel dashboards for a week; then open.
- [ ] Record the Gate 1a evaluation date (4 to 6 weeks out).

---

## Track B: Phase 1b async battles (parallel once A0 to A3 land)

### B1 Battle engine (8 to 10) (needs F10)
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

### B9 Battle release (1)
- [ ] Re-enable Trap and Charged in creation; battle analytics events; full Gate 1 tracking.
- **Done when:** all Build Plan v2.1 DoD items (1a and 1b) pass. Phase 1 complete.
