# Arcanis: Phase 1 Build Plan v2.1

**Agent-facing implementation document. Companion to Master Documentation v7.1 (the bible) and Phase Plan v2.1.**
**Supersedes:** Phased Build Plan v1.0. File name keeps "v2" so links stay stable.

## What changed in v2.1 (2026-10-09)

Founder decisions after the 2026-10-09 repo audit (`docs/status_report.md`). Where this list and older text below disagree, this list and the sections marked v2.1 win.

- **Codebase:** `phase0/` is canonical. The root prototype is archived on a branch and removed from `main`.
- **Architecture (Section 3):** modular monolith (gateway, lab, game as modules of one deployable) on MySQL via Drizzle, one paid Render instance, images in object storage. Replaces "three services, Supabase, Upstash". Database host under review.
- **Delivery (Sections 1, 15):** Phase 1a creation soft launch first, after the soft-launch blockers; Phase 1b battles built in parallel. DoD items are tagged 1a or 1b.
- **Creation subset (Section 2.3):** all 12 elements; categories Attack, Defense, Regen, Debuff, Drain; Instant only until battles ship. Temporary deviation: Trap and Charged return with battles.
- **Identity (Section 5):** 6-digit code in the same email as the link; passwords removed (existing password users move to code login); session in an httpOnly cookie; email-enumeration endpoint removed.
- **Spark (Section 6):** ledger authoritative in MySQL with transactional reserve/commit/refund; weekly free allowance live for 1a.
- **Creation pipeline (Section 7):** hybrid Power Budget (code sets budget, LLM allocates, 2a enforces); research timer stored as `research_ready_at`, first 2 spells exempt; no assessment questions; images to object storage with a 1200x630 OG variant; daily spend circuit breaker.
- **Battles (Section 8):** server-scored minigames from raw input events; piloted side samples the owner's results blended to the population median by n/(n+10); Will tracked as capacity plus current Will with percentage bands.
- **UI (Section 10):** onboarding goes straight to creation; no Spell XP reveal; no "Tower" narrative voice; Will cost shown only as Light / Moderate / Heavy in the spell detail view; fake-door Spark pack tiles.
- **Analytics (Section 12):** anonymous events accepted only from an allowlist, schema-validated and rate-limited; k-factor uses the standard definition; new events for the fake door.
- **Balance harness (Section 11):** adds Power Budget coverage.
- **Schema note (Section 9):** the `shard_ledger.created_at` "typo" note is removed; the SQL already reads `DEFAULT NOW()`, and no shard_ledger table exists in the repo yet.

---

## 0. How to Use This Document

The Master Doc v7.1 defines what every system is, with all numbers and locked decisions. This document defines what to build in Phase 1, in what order, and what is explicitly excluded. If a number or rule is not here, look it up in the Master Doc. If the two conflict, the Master Doc wins and the conflict should be flagged to the founder, not silently resolved.

Project name is **Arcanis** (formerly Magic Spar). Build nothing under the old name.

The founder expects two-way design communication. If something here looks structurally wrong for an agent to build, flag it and propose a fix. Do not silently deviate and do not silently build something broken.

**Phase 1 is a commercial launch build, not a demo.** Anything that touches money, identity, or AI output must meet production standards from the first commit.

## 1. Phase 1 Goal and Definition of Done

**Goal:** a stranger can open a shared spell link, sign up in under a minute, create a verified spell, battle a real player's profile with it, and share the result.

**Done when all are true** (tag shows which release must satisfy it; 1a items must hold before the creation soft launch):
1. [1a] A new user goes from magic-link email (link or 6-digit code) to first generated spell card in under 3 minutes of active time.
2. [1a] Every AI-generated output reaching a user has passed Layer 2a and Layer 2b, with Layer 2c firing on flags (Master Doc Section 21).
3. [1a] Spark is deducted atomically on generation and refunded automatically on any pipeline failure the user did not cause.
4. [1b] Two real players can each create spells, and each can battle the other's stored profile with full mechanical resolution (terrain, interruption, summons, traps) without the other being online.
5. [1a] A public spell preview page renders a correct Open Graph card on Discord, X, and WhatsApp.
6. [1a for creation and share metrics, 1b for battle metrics] Analytics capture the funnel metrics in Section 12.
7. [1a and 1b] No UI surface shows Will as a number, bar, or tooltip, including Will cost (only the Light / Moderate / Heavy strain descriptor in the spell detail view). Feedback strings come from rotating variant pools.
8. [1a: Power Budget coverage; 1b: win rates] A balance harness run (Section 11) shows every generated allocation inside its budget and caps, and no category or cast type outside the target win-rate band on platform spells.
9. [1a] Zero mention of XP, circles, proficiency, or Tower in the product, including "the Tower" as a narrative voice.

## 2. Scope

### 2.1 Build

*v2.1: "service" below means a module of the single deployable (Section 3).*

- Gateway service: magic-link auth, sessions, user and avatar management, Spark and Aether Shard ledger, referral logic, rate limiting, fraud checks, public preview endpoints
- Lab service: LLM provider abstraction, spell creation endpoint, Two-Step Verification pipeline, image generation, moderation, research timer, spell library
- Game service: Socket.io session for the human player, battle state machine (all cast types and categories), terrain engine, async opponent piloting engine, playstyle vector computation, vs-System bot, matchmaking pool, disconnect handling, battle persistence
- Frontend: landing, magic-link flow, onboarding, Dashboard, Lab, Battle Select, Battle, Spell Detail modal, Public Spell Preview, Settings
- 36 platform base spells, seeded
- Referral Spark grants
- Analytics event pipeline
- Admin moderation queue (minimal internal page)
- Fake-door Spark pack tiles and waitlist (Phase Plan Section 5)
- Daily spend circuit breaker and per-call cost telemetry

### 2.2 Do Not Build

Payments or any purchase flow (Spark is grant-only in Phase 1), passwords, social feeds (the root prototype's Hearth feed is Phase 4 scope and is removed), XP tracks, circles, proficiency, Tower, elemental affinity, arc quests, Halls, friends, community boards, Live Duel, Animus ranks, Freestyle Mode, fusion, multi-cast, spell animations (build the feature flag only), avatar unlocks beyond defaults, Free Mode.

**Test for inclusion:** does the creation loop, the async battle loop, the share loop, or the cost and safety layer need it to function at launch? If no, it is a later phase.

### 2.3 Launch Creation Subset (decision, flagged)

**v2.1 decision (temporary deviation, 2026-10-09):** until battles ship, the creation form exposes **all 12 elements**, categories **Attack, Defense, Regen, Debuff, Drain**, and cast type **Instant only**. Trap and Charged are held back because they have no meaning without a battle to resolve them in; they return in the Phase 1b release, restoring the subset below. The engine and validation still support the full taxonomy. (The `phase0/` app exposed only Fire, Water, Earth, Wind; that limit appeared in no doc and is removed.)

Original v2.0 text, which applies again once battles ship: to keep first-session cognitive load low, the **creation form exposes a subset at launch**: categories **Attack, Defense, Regen, Debuff, Drain**; cast types **Instant, Trap, Charged**. Remaining categories (Buff, Environmental, Summon, Physical, Hybrid) and cast types (Continuous, Channeled) release as timed content drops after launch.

**Constraint:** the battle engine and validation layer must support the full taxonomy from day one, because the 36 platform spells already use all of it (for example World Root is Summon, Conflagration Wave is Continuous, Spell Cascade is Channeled). A content drop must be a configuration change (enable categories in the creation form and prompt template), not an engine change. Flag to founder if this conflicts with the earlier "full classification at launch" position.

## 3. Tech Stack

**v2.1: modular monolith.** One Node.js deployable with gateway, lab and game as internal modules. Each module owns its tables and exposes functions only through its own tRPC router or a typed interface; no module queries another module's tables directly. This keeps the Master Doc's four-service responsibility split and makes a later split cheap, without paying for three instances, cross-service auth and network hops before there is load. Split a module out when its load or deploy cadence demands it (game first, most likely, once Live Duel exists).

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind 4, Framer Motion, tRPC client with React Query (Zustand only if battle UI state needs it) |
| API | tRPC 11 over Express |
| Real-time | Socket.io (human player's own battle session), Phase 1b |
| Backend | Node.js modular monolith: gateway, lab, game modules |
| Database | MySQL via Drizzle ORM. Current host: TiDB Cloud (us-east-1), tier under review. Requirement: it must not sleep, must not hit a connection cap at launch volume, and must have backups; if it fails any of those, migrate to Supabase before the soft launch. Separate databases for dev/test and production. |
| Object storage | S3-compatible bucket (recommend Cloudflare R2: no egress fees, CDN in front), behind an interface with `STORAGE_PROVIDER` |
| Cache and queues | None required in 1a (one instance; rate limits and the spend breaker can live in MySQL or process memory). Add Upstash Redis when a second instance or battle sessions require shared state. |
| Layer 1 text model | Provider chosen in Phase 0, behind abstraction (`SPELL_LLM_PROVIDER`) |
| Image model | Paid FLUX-class provider chosen in Phase 0, behind abstraction (`IMAGE_PROVIDER`) |
| Moderation | Purpose-built classifier chosen in Phase 0, behind abstraction (`MODERATION_PROVIDER`) |
| Email (magic link and code) | Transactional email provider behind `EMAIL_PROVIDER` (Resend and Brevo implemented) |
| Frontend hosting | Vercel, with rewrites proxying `/api/*` and the share route to the Render API so cookies are first-party and OG tags render |
| Backend hosting | One paid Render instance before soft launch (free tier sleeps on first click, which leaks shared-link signups) |
| Analytics | Event table in MySQL plus a lightweight dashboard query set (no third-party tracker required for Phase 1) |

Repository layout (v2.1; the `phase0/` app is canonical and keeps its structure until it is promoted to the repo root):

```
phase0/
  client/        # React app (pages, components)
  server/        # Express + tRPC; modules: auth/gateway, lab (creation pipeline), game (1b)
  shared/        # types, constants, caps tables, taxonomy, zod schemas, provider interfaces
  drizzle/       # schema and migrations
tools/
  balance-harness/
  cost-report/
.env.example
```

**Abstraction rule:** every external provider (text model, image model, moderation, email) sits behind an interface in `shared/` with a single env var selecting the implementation. No provider request or response shape appears in business logic.

## 4. API Keys and Config (prompt the founder before scaffolding)

Collect and store in `.env`, never in the repo:
- Text model provider and key (decided in Phase 0)
- Image provider and key
- Moderation provider and key
- Email provider key and verified sender domain
- MySQL `DATABASE_URL` for production, plus a separate one for tests (tests must never run against production data)
- Object storage bucket, endpoint, access key and secret, public base URL
- Upstash Redis URL and token (only once Redis is needed)
- JWT signing secret
- Daily spend breaker limit (USD)
- Optional: device fingerprint library config, disposable-email domain list source

## 5. Identity and Anti-Abuse (Gateway)

Rules from Master Doc Section 18. Implementation requirements:

- **Magic link:** email only, single-use token, 15 minute expiry, signed, stored hashed. Link click creates the account if new and issues a session (httpOnly cookie plus short-lived JWT).
- **6-digit code (v2.1):** the same email carries a 6-digit code for players whose mail app opens the link in an in-app browser. The code is entered in the tab that requested it. Stored hashed, 10 minute expiry, single use, 5 wrong attempts invalidate it, and requests are rate-limited per email and per IP. Using either the link or the code consumes both. Token and code redemption must be atomic (a single conditional update), so a token cannot be redeemed twice.
- **No passwords (v2.1):** password sign-up, sign-in and the forced "set password" step are removed. Existing accounts that have a password simply sign in by link or code; their password hashes are deleted in the migration.
- **Session (v2.1):** httpOnly, Secure, SameSite=Lax cookie. The client never stores a token in localStorage. Because the client is on Vercel and the API on Render, the API is reached through a Vercel rewrite (`/api/*`) so the cookie is first-party; otherwise Safari and in-app browsers drop it.
- **No account enumeration (v2.1):** no endpoint reveals whether an email has an account. The request-link endpoint always returns the same response.
- **Viewing is anonymous. Generation requires a session.** Every generation endpoint rejects unauthenticated calls at the gateway before any provider is touched.
- **Fraud layer (must exist at launch):**
  - Disposable email domain blocklist, refreshed periodically
  - Device fingerprint recorded at signup and at generation; cap accounts per device and per IP range per day
  - New-account throttle: first 24 hours have a lower generation rate ceiling
  - Hard per-identity generation ceilings per hour and per day regardless of Spark balance
- **First free Spark grant** on email confirmation, once per device fingerprint (a second account on the same device does not get the grant).
- **Referral:** referral code attached to the preview link. Inviter and invitee each get a small Spark bonus when the invitee completes their first successful creation. Self-referral and same-device referral are rejected. Bonus is pending until the first creation passes verification.
- **Rate limiting** per user, per IP, and per device on auth, generation, and battle endpoints. v2.1: process memory or MySQL is acceptable while there is exactly one instance; move to Redis before adding a second instance.

## 6. Spark and Aether Shard Ledger (Gateway)

Rules from Master Doc Section 22.

- Spark is an **append-only ledger**, not a mutable counter. Balance is the sum of non-reversed entries. v2.1: the ledger is authoritative in MySQL. Reserve runs in one transaction that locks the user's row (`SELECT ... FOR UPDATE`), computes the balance, and inserts the pending entry only if the balance covers it; commit and refund are conditional status updates on that entry, so a double refund is impossible. A cached balance column is allowed only if it is updated in the same transaction. The current `phase0/server/spark.ts` (mutable balance written without a lock) has a double-spend race and is replaced.
- Entry types in Phase 1: `grant_signup`, `grant_referral_inviter`, `grant_referral_invitee`, `grant_weekly_allowance`, `spend_creation`, `refund_creation`, `admin_adjust`.
- **Spend is atomic:** reserve Spark before the pipeline runs (`spend_creation` pending), commit on success, auto-refund (`refund_creation`) on any failure the user did not cause (provider error, verification exhaustion after retries, moderation rejection of the system's own output).
- **A user-caused rejection** (the user's own input fails moderation) does not refund and counts toward abuse strikes.
- Spark is never granted for gameplay. Weekly allowance for the free tier is a small fixed grant; rollover is allowed up to a cap (value set in config, default to 2x weekly allowance). v2.1: the weekly allowance must be live for the 1a soft launch, because Gate 1a's day-7 creation retention is meaningless if players physically cannot create again. Size is still an open item (Section 17).
- Aether Shards ledger is built with the same structure but has no sinks in Phase 1 beyond reserved hooks. Earning rules arrive with progression. Do not build earning logic yet.

## 7. Lab Service: Spell Creation Pipeline

### 7.1 Request flow

1. Client submits name, element, description, plus Summon mode and Trap visibility fields when those categories are enabled.
2. Gateway verifies session, rate limits, checks the daily spend breaker (Section 7.7), checks Spark balance, reserves cost.
3. **Input moderation (Layer 2b on user text)** runs first. Reject early and cheaply.
4. Code computes the **Power Budget** (Section 7.2a) from tier and classification. Lab fires **Layer 1 text generation** (identity text plus a stat allocation within the budget) and **image generation in parallel**.
5. Text output goes through **Layer 2a** (schema and clamps), then **Layer 2b** (moderation on generated text).
6. Image output goes through **Layer 2b image moderation**.
7. If any check flags borderline, **Layer 2c** (small model semantic check) runs.
8. On any rejection, **silent retry** with an adjusted prompt, up to N attempts (config, default 2). Players never see a failure the pipeline should have caught.
9. On success: upload images to object storage, persist spell (with `research_ready_at`, Section 7.5), commit Spark spend, return the card.
10. On exhaustion: refund Spark, return a friendly retry message, log the failure with full trace.

### 7.2 Layer 2a rules (deterministic)

Implement as pure functions in `shared/validation`, with exhaustive unit tests.

- Clamp every numeric field to the caps in Master Doc 6.2 (damage, MP, Will) and 5.5 (summon HP, attack, behavior count)
- Tier assignment at launch: Basic only for player-created spells (Advanced and Mega unlock with progression later)
- Interruption thresholds per tier from Master Doc 5.2
- Enforce taxonomy: category and cast type must be in the enabled set
- Summon must be Continuous; Hybrid must have a secondary category; Trap must have `trap_condition` and `trap_visibility`; Physical cannot be Summon or Environmental
- Hidden trap resource surcharge applied from a config multiplier, never reducing effect power
- Cast time clamped to the cast type range
- Autonomous summon stat ceiling set to 70 to 75 percent of controlled ceiling
- Reject and retry on out-of-taxonomy strings rather than guessing
- v2.1: enforce the Power Budget total (Section 7.2a); tier always comes from the request, never from model output

### 7.2a Power Budget, hybrid (v2.1, soft-launch blocker)

The `phase0/` app computes every stat deterministically from (element, category, cast type), so all spells sharing a classification are mechanically identical and the description has no mechanical effect. Replace with a hybrid:

- Code computes a **budget** in power points from tier, element, category (primary and secondary) and cast type, plus a per-field allowed range (inside the Master Doc caps) and a points-per-unit cost for each field (for example damage ceiling, MP efficiency, Will cost, cast time).
- The Layer 1 prompt includes the budget and the ranges; the model returns an allocation that fits the description (a slow, heavy spell vs a cheap, quick one).
- Layer 2a clamps each field to its range, recomputes the spent points, and scales an over-budget allocation back proportionally. An under-budget allocation is accepted (players may make weak spells) down to a floor of 85 percent of the budget, below which it is raised proportionally. A malformed allocation falls back to the current deterministic profile, which becomes the default allocation, and logs a 2a flag.
- The per-field point costs and the floor live in config and are tuned through the balance harness.
- Players never see the budget or the points.

### 7.3 Layer 2c

- Small, cheap model; fires only when 2a or 2b flags borderline (for example flavor text contradicts category, trap condition incoherent, description clearly requests something outside the spell premise)
- Returns structured pass or fail with a reason code
- Track trigger rate as a metric. If it exceeds roughly 15 percent of generations, tune the Layer 1 prompt before scaling traffic.

### 7.4 Assessment questions

The v7 schema still lists the Tower assessment question arrays. **Do not generate them in Phase 1.** Tower ships in Phase 3, and generating 40 questions per spell now burns cost for no value. Add the field and a backfill job in Phase 3. v2.1: the `phase0/` app currently generates a single `assessment_question` per spell; remove it from the prompt, schema and UI.

### 7.5 Research timer

Stopwatch only, no countdown, no time disclosed (Master Doc 6.3). Duration derived from `research_complexity_score`, roughly 5 to 50 minutes. Spell shows in the library as "researching" (dimmed card, no lock language) and becomes usable on completion. Priority-research is a Phase 2 cosmetic purchase; leave a hook.

v2.1:
- Store `research_ready_at` (UTC timestamp) on the spell row at creation. "Researching" is simply `now < research_ready_at`; no timers, queues or in-process `setTimeout`, so restarts lose nothing.
- **The first 2 spells per account are exempt:** `research_ready_at` is set to the creation time. The generation wait (roughly 10 to 30 seconds) is presented as the forging moment.
- Sharing and the public preview work during research; research only gates battle use, which arrives in 1b.

### 7.6 Image generation

- Prompt derived from spell name, flavor text, lore line, classification; color emerges from spell identity, not an element palette
- On provider failure after retries, use a generated-on-the-fly neutral placeholder and queue a background regeneration; never block creation on image failure
- Store the original plus a derived **Open Graph variant** (1200x630) and the portrait card variant
- Dominant color extracted from the final image for the card border accent
- v2.1: all variants go to **object storage** behind `STORAGE_PROVIDER`; the database stores URLs only. The `phase0/` app currently stores base64 data URIs in MySQL; migrate existing rows with a one-off script.
- v2.1: the OG variant is a composed image (card art, spell name, element, Arcanis mark) on a 1200x630 canvas, rendered server-side at creation time, not a crop of the square art.

### 7.7 Cost telemetry (mandatory)

Every provider call logs: surface, provider, model, tokens or image units, latency, cost estimate, outcome. A `tools/cost-report` script aggregates cost per successful creation, retry rate, 2a clamp rate, 2b rejection rate, 2c trigger rate. This feeds Gate 1 and Phase 2 pricing.

v2.1 additions:
- Logging happens inside the provider interface wrappers, so no call site can skip it. Rows go to a `provider_calls` table.
- **Daily spend circuit breaker:** before reserving Spark, sum today's (UTC) `cost_estimate_usd` from `provider_calls`. At or above `DAILY_SPEND_LIMIT_USD`, refuse new generations with a friendly message ("The forge is cooling. Try again soon."), log `creation_blocked_spend_cap`, and alert the founder (email). Nothing is reserved, so nothing needs refunding. Admin can reset or raise the limit. This complements, never replaces, the hard caps the founder sets at each provider.
- Verify every configured model ID with a live call at startup in non-production and in CI smoke tests; a retired model ID must fail loudly, not silently fall through the cascade.

## 8. Game Service: Battles

Rules from Master Doc Sections 5, 10, 11.

### 8.1 Battle types in Phase 1

- **vs-System:** generic rule-based bot deck; used for onboarding and as fallback
- **Open Brawl (async):** opponent is a stored player profile

### 8.2 Turn resolution order (fixed)

Spell or trap selection, minigame resolution, terrain modifiers, interruption check, trap trigger check, stat updates, summon resolution, win check.

### 8.3 Engine requirements

- Full support for all 10 categories and 5 cast types, driven by data (spell rows), not hardcoded per spell
- Variable damage formula for Continuous and Channeled per Master Doc 5.2
- Interruption thresholds and consequences, including Will penalties and Channeled backlash
- One trap slot, dispel by Debuff, hidden-trap reveal in the battle log after firing
- One active summon, Autonomous (directive assigned at summon time, derived from the summon's skill set) and Controlled (per-turn skill choice, idle if no command), maintenance drain plus per-skill drain
- Will tracked per session from the avatar baseline, never sent to the client as a number. v2.1 (Master Doc 2.1): two server-side values, capacity (absolute, from the avatar plus growth) and current Will (starts at capacity each battle, depleted per cast, restorable by regen up to capacity). The band is current Will as a percentage of capacity: Sharp 60 percent and above, Steady 30 to under 60, Strained 16 to under 30, Failing 6 to under 16, Broken under 6. Band edges live in config for harness tuning.
- Will feedback: server emits a **feedback event with a band key** only; the client or server picks a phrase from the variant pool at random per trigger. The client must never receive a value that lets it reconstruct Will.
- Terrain: 15 terrains, random assignment, modifiers per Master Doc 10, including classification-based special properties
- Reshape mechanic for Environmental spells (data-driven even though Environmental is not creatable at launch, since Tremor Field and Frost Field exist on the platform list)
- Disconnect: timer expiry auto-casts a random Instant spell at minimum damage; 60 second disconnect forfeits (applies to the human only)

### 8.4 Minigames

Element-group minigames per the v1 plan: timing strike (Fire, Lightning, Chaos), pattern match (Water, Frost, Nature), rapid tap (Wind), hold and release (Earth and Physical), quick reaction (Void, Shadow, Arcane), sequence input (Light). Result maps to damage within the spell range. Auto-resolve to mid-range damage when under 5 seconds remain on the turn timer.

**Anti-cheat note (flag):** with async PvP, minigame results are computed client-side and sent to the server. The server must validate plausibility (timing windows, input counts) and clamp, since a modified client would otherwise always roll max damage. Do not trust the client minigame value.

**v2.1, server-side scoring (decided):** the client never sends an accuracy number.
- At minigame start the server issues a seed and a deadline; the seed fully determines the minigame layout (target windows, pattern, sequence).
- The client sends raw input events (type, client timestamp relative to minigame start, payload such as key or position) once the minigame ends, before the deadline.
- The server replays the minigame from the seed and the events and computes accuracy itself. It rejects implausible input (events outside the minigame duration, faster than human reaction floors, more inputs than the minigame allows, timing patterns that are too regular) by scoring it as the minimum rather than erroring.
- Each scored result is stored in `minigame_results` (user, element group, accuracy, created_at) and feeds the piloting distributions in Section 8.5.
- Auto-resolve under 5 seconds remaining stays, scored as mid-range and not stored as a sample.

### 8.5 Async opponent piloting

- **Profile snapshot:** deck, spell stats, avatar, and playstyle vector, stored on deck edit and refreshed periodically; battles use the snapshot so results are reproducible
- **Playstyle vector** (from the player's own battle history, no LLM): aggression (Attack and Charged picks versus Defense and Regen), risk tolerance (Continuous and Channeled versus Instant), resource discipline (MP and Will spent per turn relative to pool). New players with no history get a neutral default vector.
- **Move selection:** rule-based scoring over the profile's real deck. Score each legal spell by category fit with the aggression weight, cast-type fit with the risk weight, resource cost versus discipline weight, terrain bonus, current HP and MP state, and counter-play (for example avoid Charged when the human has an interruptible threat ready). Choose the highest score with bounded randomness so behavior is plausible, not robotic.
- The piloted side is subject to the same Will, MP, interruption, and summon rules as the human
- **Piloted minigame result (v2.1):** for each piloted cast, take the owner's stored results for that element group (n samples). Draw one of them at random (owner_sample); the piloted accuracy is w x owner_sample + (1 - w) x population_median, with w = n / (n + 10). With n = 0 the piloted side plays at the population median. Population medians are recomputed periodically (daily is enough) and seeded from harness defaults until real data exists. Sampling uses the battle's seed so the battle stays reproducible.
- **Re-engagement:** when a profile is defeated, enqueue a notification event to the owner ("[Name] just defeated your deck. Rematch?"). Phase 1 delivery: in-app inbox plus email digest limited to avoid spam. Web push can follow.
- **Matchmaking:** match the human to a profile by deck strength band (derived from average spell stats, not circle, since circles do not exist yet), avoid immediate rematches against the same profile except by explicit rematch, and exclude the player's own profile. If the pool is empty or too small, fall back to the vs-System bot labelled honestly as a training opponent.
- **Fairness guard:** very fresh decks should not be fed to strong profiles. Band by strength and by sample size.

### 8.6 Persistence

Battle state in Redis at `battle:session:{battleId}` (v2.1: or a MySQL row while there is one instance and no Redis); persisted to the database on completion with a compact turn log for replay later. Record per battle: both profile snapshot IDs, terrain, turns, winner, spells used, Will-band events (for tuning the feedback strings, never shown as numbers).

## 9. Database Schema (Phase 1 additions)

Evolves the v1 plan. Tables below are new or changed; keep tables free of placeholder columns for future systems.

**v2.1:** the database is MySQL via Drizzle, so translate the Postgres SQL below when writing migrations (UUID as `CHAR(36)` or binary, `TIMESTAMPTZ` as `DATETIME(3)` stored in UTC, `JSONB` as `JSON`, arrays as `JSON` or a join table, `CHECK` constraints as app-level enums where the host does not enforce them). The `phase0/` tables keep their `p0_` prefix until the root app is archived; dropping the prefix is a later rename, not a blocker. Additional v2.1 tables and columns:

```sql
-- magic_links: add code
ALTER TABLE magic_links
  ADD COLUMN code_hash TEXT NOT NULL,
  ADD COLUMN code_attempts INTEGER DEFAULT 0;

-- spells: research timer and image URLs (no base64 in the database)
ALTER TABLE spells
  ADD COLUMN research_ready_at TIMESTAMPTZ NOT NULL,
  ADD COLUMN image_url TEXT,
  ADD COLUMN image_card_url TEXT;

-- every provider call (Section 7.7)
CREATE TABLE provider_calls (
  id BIGSERIAL PRIMARY KEY,
  generation_run_id UUID REFERENCES generation_runs(id),
  surface TEXT NOT NULL,                 -- 'spell_text','spell_image','moderation_text','moderation_image','semantic_2c'
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  units JSONB,                           -- tokens in/out or image count/size
  latency_ms INTEGER,
  cost_estimate_usd NUMERIC(10,6),
  outcome TEXT NOT NULL,                 -- 'ok','error','rejected','timeout'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- server-scored minigame results (1b, Section 8.4)
CREATE TABLE minigame_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  element_group TEXT NOT NULL,
  accuracy REAL NOT NULL,
  battle_id UUID REFERENCES battles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- fake-door waitlist (intent clicks go to analytics_events as spark_pack_intent)
CREATE TABLE spark_waitlist (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  pack_clicked TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Remove from the `phase0/` schema: password hash columns, the mutable Spark balance as a source of truth, base64 image columns, `assessment_question`.

```sql
-- users: add identity and abuse fields
ALTER TABLE users
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN signup_device_hash TEXT,
  ADD COLUMN referral_code TEXT UNIQUE,
  ADD COLUMN referred_by UUID REFERENCES users(id),
  ADD COLUMN abuse_strikes INTEGER DEFAULT 0,
  ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active','restricted','banned'));

CREATE TABLE magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE spark_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  entry_type TEXT NOT NULL,
  amount INTEGER NOT NULL,             -- positive grant, negative spend
  status TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('pending','committed','reversed')),
  ref_type TEXT,                       -- e.g. 'spell_creation'
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shard_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  entry_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- spells: add share, verification, and visibility fields
ALTER TABLE spells
  ADD COLUMN image_og_url TEXT,
  ADD COLUMN dominant_color TEXT,
  ADD COLUMN is_public BOOLEAN DEFAULT TRUE,
  ADD COLUMN share_slug TEXT UNIQUE,
  ADD COLUMN verification_trace JSONB;   -- which layers fired, retry count, 2c reason

CREATE TABLE generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  spell_id UUID REFERENCES spells(id),
  attempts INTEGER,
  layer_2a_clamped BOOLEAN,
  layer_2b_flagged BOOLEAN,
  layer_2c_fired BOOLEAN,
  outcome TEXT,                          -- 'success','refunded','user_rejected'
  total_cost_usd NUMERIC(10,5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  deck_spell_ids UUID[] NOT NULL,
  avatar TEXT NOT NULL,
  strength_band INTEGER NOT NULL,
  aggression REAL, risk_tolerance REAL, resource_discipline REAL,
  sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE battles (
  -- extends v1 table
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  human_id UUID REFERENCES users(id),
  opponent_snapshot_id UUID REFERENCES profile_snapshots(id),
  opponent_type TEXT CHECK (opponent_type IN ('profile','system_bot')),
  winner TEXT CHECK (winner IN ('human','opponent')),
  terrain TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'brawl',
  turns_played INTEGER,
  turn_log JSONB,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  kind TEXT NOT NULL,                    -- 'profile_defeated','referral_bonus', etc
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  surface TEXT, content_type TEXT,       -- 'text','image'
  verdict TEXT, reason TEXT,
  escalated_to_2c BOOLEAN DEFAULT FALSE,
  reviewed_by_human BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES users(id),
  invitee_id UUID REFERENCES users(id) UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  anon_id TEXT,
  event TEXT NOT NULL,
  props JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

`lab_slots` from v1 is retired; weekly allowance is a `grant_weekly_allowance` ledger entry.

## 10. Frontend

| Page | Route | Notes |
|---|---|---|
| Landing | `/` | One-line pitch, magic-link email field, examples of shared cards |
| Magic-link callback | `/auth/callback` | Creates session, routes to onboarding or dashboard |
| Onboarding | `/start` | v2.1: straight to the Lab with the first Spark; share prompt after the first card. Name asked when first needed; avatar and the guided vs-System battle come on first battle entry (1b). No Spell XP reveal. |
| Dashboard | `/dashboard` | HP and MP only (no Will, ever), Spark balance (chip opens the fake-door pack tiles), recent battles, rematch inbox, quick-battle CTA |
| Lab | `/lab` | Creation form, live "creating" state, spell library as card grid, researching states, Spark balance |
| Battle Select | `/battle` | Async brawl button, terrain preview |
| Battle | `/battle/:id` | Per Master Doc 19, including active Continuous and Channeled status and battle log |
| Spell Detail | modal | Damage range, MP cost, cast time, classification icons. Will appears only as the strain descriptor Light / Moderate / Heavy (v2.1); never a number. |
| Spark packs (fake door) | modal | v2.1: shown at zero Spark and from the Spark chip. Pack tiles with prices marked "coming soon", waitlist opt-in, no grant. Logs `spark_pack_intent`. |
| Public Spell Preview | `/s/:slug` | No login. Card art, flavor, lore, "Create your own" CTA, referral code carried through. SSR or prerender for OG tags. |
| Settings | `/settings` | Account, notification preferences |

Rules:
- Will is never shown as a number, bar, or tooltip.
- Classification icons on cards and deck grid; mechanical implications never explained upfront.
- After every successful creation, show a one-tap share action producing the public link.
- Share cards must render correctly as OG images, with a distinct 1200x630 variant, not a cropped portrait card.
- Use the founder's design preference for any new design work: black and gold palette unless specified otherwise.
- v2.1: no "Tower" narrative voice anywhere (the `phase0/` app uses "the Tower" as its voice in about 27 places); replace with a neutral Arcanis voice. No password UI.

## 11. Balance Harness (tools/balance-harness)

Script that simulates thousands of async battles between spells (platform spells plus a corpus of generated test spells) across terrains, using the real engine and piloting logic. Report win rate and damage-per-MP by category, cast type, element, and terrain. Flag any category or cast type outside roughly 40 to 60 percent win rate. Run before launch and on every content drop. This addresses strategic imbalance inside the caps, which the stat clamp alone cannot catch.

**v2.1, Power Budget coverage (needed for 1a, before battles exist):**
- Run the creation pipeline (or its Layer 2a stage on recorded Layer 1 outputs) over the test corpus and report, per classification: share of allocations clamped, share rescaled for budget, share hitting the fallback profile, and the spread of each stat.
- Assert that every stored allocation is inside its field ranges, inside the Master Doc caps, and between the budget floor and the budget total.
- Report damage-per-MP and damage-per-Will by category and element so outliers are visible before any battle runs.

**v2.1, battle coverage (1b):** win rates as above, plus Will band dwell time (share of turns spent in each band) per avatar, used to tune the band edges and the strain descriptor cut points.

The test corpus (100+ realistic prompts across all 12 elements and the enabled categories, plus adversarial prompts) lives in `tools/balance-harness/corpus/` and doubles as the Phase 0 cost measurement input.

## 12. Analytics Events (must be live at launch)

`landing_view`, `magic_link_requested`, `signup_confirmed`, `onboarding_battle_started`, `onboarding_battle_finished`, `lab_opened`, `creation_started`, `creation_succeeded`, `creation_refunded`, `share_clicked`, `preview_viewed` (with referrer and slug), `preview_cta_clicked`, `referral_paid`, `battle_started`, `battle_finished`, `rematch_clicked`, `spark_low_viewed` (Phase 2 hook), `session_day_n`.

v2.1 additions: `signup_method` (prop on `signup_confirmed`: `link` or `code`), `spark_pack_intent` (with pack), `spark_waitlist_joined`, `creation_blocked_spend_cap`. Onboarding battle events move to 1b. The `phase0/` app's event names differ from this list and are renamed to match.

**Ingestion rules (v2.1, soft-launch blocker):** server-side events are written directly by the server. The public tracking endpoint accepts anonymous events only from an allowlist (`landing_view`, `preview_viewed`, `preview_cta_clicked`, `share_clicked`), validates each event's props against a zod schema (unknown props dropped, size-limited), and is rate-limited per IP and per anon ID. Authenticated client events take the user from the session, never from the payload.

Derived metrics (definitions in Phase Plan Section 5): signup to first-creation conversion, first-creation to share rate, share-click to signup rate, **k-factor = invites per user x invite conversion rate** (v2.1, replacing the admin page's non-standard formula), day-1 and day-7 retention (creation-based in 1a, battle-based in 1b), creations per active user, battles per active user, cost per successful creation, 2c trigger rate, moderation rejection rate, fake-door intent rate among players who reached zero Spark.

## 13. Moderation and Abuse Handling

- Moderation on user input, generated text, and generated images (Layer 2b)
- User-caused rejections add an abuse strike; thresholds restrict, then ban (values in config)
- Public spell pages respect a report button feeding `moderation_events` and the admin queue
- Admin queue: list flagged items, approve, remove, strike, or ban; minimal internal page is enough for Phase 1
- Takedown path for a public spell (set `is_public = false`, return 410 on its preview URL)
- v2.1: player reviews on spell pages (built in `phase0/`) are user-generated text shown publicly; they pass Layer 2b text moderation before display and are reportable like spells.

## 14. Deployment

- v2.1: one Render web service for the monolith, on a paid instance before soft launch (decided). UptimeRobot on `/health` for alerting.
- v2.1: Vercel serves the client. `vercel.json` must rewrite `/api/*` and the share route (`/spell/:id` and its image route) to the Render API **before** the SPA catch-all, so share links on the main domain get server-rendered OG tags and the session cookie is first-party. `VITE_PUBLIC_URL` must equal the public domain.
- MySQL host (TiDB Cloud today, under review), object storage bucket, Vercel
- GitHub Actions per service, migrations run in CI, secrets from the platform, never committed
- Staging environment separate from production, with provider keys on low spend caps
- Provider spend alerts and hard monthly caps set at each provider

## 15. Build Order

**v2.1 build order (supersedes the v2.0 list below, which is kept for reference).** Work happens in the `phase0/` app. Estimates are working days for one engineer with an agent.

**Track A, Phase 1a soft-launch blockers (in order):**

| # | Task | Est. |
|---|---|---|
| A0 | Housekeeping: archive the root app on a branch and remove it from `main` (with Hearth and the Manus template leftovers, `arcanis-ui/`, `scratch/`); `.env.example`; separate test database; GitHub Actions running type-check and tests | 1 |
| A1 | Database host decision (founder): keep TiDB Cloud if it meets the Section 3 requirement, else migrate to Supabase now, before any schema work | 0 to 3 |
| A2 | Provider interfaces in `shared/` (text, image, moderation, email, storage), each selected by one env var, with cost telemetry inside the wrappers (`provider_calls`); verify model IDs with a live call and replace retired ones | 2 |
| A3 | Spark ledger rewrite: append-only, transactional reserve/commit/refund, per-device signup grant, weekly allowance, concurrency tests | 2 |
| A4 | Daily spend circuit breaker plus founder alert | 0.5 |
| A5 | Identity: 6-digit code in the same email, hashed and atomic link and code redemption, remove passwords and migrate existing users, httpOnly cookie via the Vercel `/api` rewrite, remove the enumeration endpoint | 1.5 |
| A6 | Moderation (Layer 2b) on input text, generated text, generated images and reviews; Layer 2c on flags; silent retry; `moderation_events`, report button, minimal admin queue, takedown | 3 |
| A7 | Hybrid Power Budget plus Layer 2a budget enforcement and property tests; open all 12 elements and Drain, Instant only; tier from the request only | 2.5 |
| A8 | Balance harness skeleton with Power Budget coverage, test corpus, `tools/cost-report` | 2 |
| A9 | Images to object storage, 1200x630 OG variant, card variant, dominant color; migrate existing base64 rows | 1.5 |
| A10 | Share path: `vercel.json` rewrites for the share route and `/api`, `VITE_PUBLIC_URL`, referral code on the preview link, referral grants | 1 |
| A11 | Analytics: allowlisted, schema-validated, rate-limited public endpoint; rename events to Section 12; k-factor fix; Gate 1a metrics on the admin page | 1 |
| A12 | Product copy and flow: remove the Tower voice and `assessment_question`, remove the Will number from the spell card, strain descriptor in the spell detail view, onboarding straight to creation, `research_ready_at` with the first-2 exemption | 1.5 |
| A13 | Fake door: Spark pack tiles, `spark_pack_intent`, waitlist | 0.5 |
| A14 | Offline corpus run through the chosen providers, one-page cost sheet, $0.08 check (Phase Plan Section 4) | 1 |
| A15 | Hardening: end-to-end creation test, failure injection (provider down, moderation reject), abuse tests, OG check on Discord, X and WhatsApp | 1.5 |
| A16 | Soft launch to a small invited cohort; watch cost and funnel for a week, then open | |

Track A total: roughly 22 to 25 working days. Founder actions in parallel: provider spend caps, paid Render instance, DB host decision, object storage account, Gate 1a thresholds locked, weekly allowance and grant sizes, Lemon Squeezy verification (Phase 2 prerequisite).

**Track B, Phase 1b async battles (in parallel once A0 to A3 land):**

| # | Task | Est. |
|---|---|---|
| B1 | Battle engine as pure, data-driven functions: turn order, all 10 categories and 5 cast types, interruption, traps, one summon, 15 terrains, Will capacity and current Will with percentage bands; scenario tests per mechanic | 8 to 10 |
| B2 | Seed the 36 platform spells exactly as Master Doc 5.6 (Conflagration Wave as Attack, Continuous) | 1 |
| B3 | Server-scored minigames (6 element groups): seed, raw input events, replay scoring, plausibility checks | 3 to 4 |
| B4 | `minigame_results` store, population medians, n/(n+10) piloted sampling | 0.5 |
| B5 | Profile snapshots, playstyle vector, rule-based piloting, matchmaking, vs-System bot | 4 |
| B6 | Battle UI, Socket.io session, Will feedback variant pools (6 to 8+ per band, Two-Step Verified), avatar selection and guided first battle | 5 |
| B7 | Persistence, rematch notifications (in-app inbox plus email digest) | 1.5 |
| B8 | Balance harness battle simulation; tune Will bands and strain descriptor cut points; Will leakage tests | 2.5 |
| B9 | Re-enable Trap and Charged in creation; battle analytics events | 1 |

Track B total: roughly 27 to 30 working days.

**v2.0 build order (reference):**

1. **Scaffold:** monorepo, shared types and caps tables, zod schemas, provider interfaces, migrations, CI, env templates. Collect keys.
2. **Phase 0 tooling inside the repo:** cost-report and balance-harness skeletons (even stubbed) so measurement exists from the first generation.
3. **Gateway:** magic link, sessions, fraud checks, rate limits, Spark and shard ledgers, referral logic, public preview endpoints.
4. **Lab:** provider abstraction, Layer 2a library with tests, moderation integration, creation pipeline with retries and refunds, image pipeline with OG variant, seed 36 platform spells, spell library, research timer.
5. **Game:** battle state machine and terrain engine, all cast types and categories with unit tests per mechanic, vs-System bot, playstyle vector, async piloting and matchmaking, minigame validation, persistence, notifications.
6. **Frontend:** landing and magic-link, onboarding, Lab and card component, battle UI with minigames and Will feedback pools, dashboard, public preview with OG.
7. **Integration and hardening:** end-to-end creation and battle, failure injection (provider down, moderation reject, mid-battle disconnect), Spark atomicity tests, abuse tests, balance harness run, load test of the creation endpoint, OG render check on real platforms.
8. **Soft launch:** small invited cohort, watch cost and funnel dashboards for a week, then open.

## 16. Testing Priorities

- Layer 2a: property-based tests that no input can produce an out-of-cap value
- Spark ledger: concurrency tests (double-click create, parallel requests) never overspend or double-refund
- Battle engine: scripted scenario tests for every cast type interaction (interruption, trap dispel, summon dissipation on zero MP, Will-driven summon instability)
- Async piloting: determinism under a fixed seed, plausibility checks (no impossible casts, respects MP and Will)
- Auth and abuse: token reuse, expired links, same-device grant farming, disposable emails
- Information leakage: confirm no payload to the client allows reconstructing Will
- v2.1, Power Budget: property tests that any model allocation, including malformed and adversarial ones, ends inside field ranges, caps, and the budget floor and total
- v2.1, minigame scoring: replay determinism from seed plus events; forged or implausible event streams score as the minimum
- v2.1, identity: code brute force is stopped at 5 attempts; link and code each redeem once under concurrent requests; no endpoint distinguishes existing from new emails
- v2.1, analytics: non-allowlisted anonymous events and oversized props are rejected
- v2.1, spend breaker: generation is refused, with no Spark reserved, once the daily limit is reached
- v2.1: tests run against a separate test database, never the production `DATABASE_URL`

## 17. Open Items Phase 1 Must Resolve (decide with the founder, do not guess)

1. Provider choices and measured costs (Phase 0 output)
2. Weekly free-tier Spark allowance size and rollover cap (v2.1: now a 1a blocker)
3. First-signup Spark grant size and referral bonus size (sized as a fraction of measured creation cost)
4. ~~Launch creation subset confirmation (Section 2.3)~~ Resolved v2.1: 12 elements, Attack/Defense/Regen/Debuff/Drain, Instant only until battles ship
5. Fraud thresholds (device and IP caps)
6. Notification channels at launch (in-app plus email digest versus adding web push)
7. ~~Whether to run a paid beta in Phase 1~~ Resolved v2.1: no; fake door instead
8. (v2.1) Database host: keep TiDB Cloud or migrate to Supabase (Section 3)
9. (v2.1) Moderation provider for Layer 2b (text and image)
10. (v2.1) Object storage provider (recommend Cloudflare R2)
11. (v2.1) Whether to promote `phase0/` to the repo root after the root app is archived (needs Vercel and Render root-directory changes)
