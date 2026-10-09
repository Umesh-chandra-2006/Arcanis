# Arcanis: Phase 1 Build Plan v2.0

**Agent-facing implementation document. Companion to Master Documentation v7.0 (the bible) and Phase Plan v2.0.**
**Supersedes:** Phased Build Plan v1.0.

---

## 0. How to Use This Document

The Master Doc v7.0 defines what every system is, with all numbers and locked decisions. This document defines what to build in Phase 1, in what order, and what is explicitly excluded. If a number or rule is not here, look it up in the Master Doc. If the two conflict, the Master Doc wins and the conflict should be flagged to the founder, not silently resolved.

Project name is **Arcanis** (formerly Magic Spar). Build nothing under the old name.

The founder expects two-way design communication. If something here looks structurally wrong for an agent to build, flag it and propose a fix. Do not silently deviate and do not silently build something broken.

**Phase 1 is a commercial launch build, not a demo.** Anything that touches money, identity, or AI output must meet production standards from the first commit.

## 1. Phase 1 Goal and Definition of Done

**Goal:** a stranger can open a shared spell link, sign up in under a minute, create a verified spell, battle a real player's profile with it, and share the result.

**Done when all are true:**
1. A new user goes from magic-link email to first generated spell card in under 3 minutes of active time.
2. Every AI-generated output reaching a user has passed Layer 2a and Layer 2b, with Layer 2c firing on flags (Master Doc Section 21).
3. Spark is deducted atomically on generation and refunded automatically on any pipeline failure the user did not cause.
4. Two real players can each create spells, and each can battle the other's stored profile with full mechanical resolution (terrain, interruption, summons, traps) without the other being online.
5. A public spell preview page renders a correct Open Graph card on Discord, X, and WhatsApp.
6. Analytics capture the funnel metrics in Section 12.
7. No UI surface shows Will as a number, bar, or tooltip. Feedback strings come from rotating variant pools.
8. A balance harness run (Section 11) shows no category or cast type outside the target win-rate band on platform spells.
9. Zero mention of XP, circles, proficiency, or Tower in the product.

## 2. Scope

### 2.1 Build

- Gateway service: magic-link auth, sessions, user and avatar management, Spark and Aether Shard ledger, referral logic, rate limiting, fraud checks, public preview endpoints
- Lab service: LLM provider abstraction, spell creation endpoint, Two-Step Verification pipeline, image generation, moderation, research timer, spell library
- Game service: Socket.io session for the human player, battle state machine (all cast types and categories), terrain engine, async opponent piloting engine, playstyle vector computation, vs-System bot, matchmaking pool, disconnect handling, battle persistence
- Frontend: landing, magic-link flow, onboarding, Dashboard, Lab, Battle Select, Battle, Spell Detail modal, Public Spell Preview, Settings
- 36 platform base spells, seeded
- Referral Spark grants
- Analytics event pipeline
- Admin moderation queue (minimal internal page)

### 2.2 Do Not Build

Payments or any purchase flow (Spark is grant-only in Phase 1), XP tracks, circles, proficiency, Tower, elemental affinity, arc quests, Halls, friends, community boards, Live Duel, Animus ranks, Freestyle Mode, fusion, multi-cast, spell animations (build the feature flag only), avatar unlocks beyond defaults, Free Mode.

**Test for inclusion:** does the creation loop, the async battle loop, the share loop, or the cost and safety layer need it to function at launch? If no, it is a later phase.

### 2.3 Launch Creation Subset (decision, flagged)

To keep first-session cognitive load low, the **creation form exposes a subset at launch**: categories **Attack, Defense, Regen, Debuff, Drain**; cast types **Instant, Trap, Charged**. Remaining categories (Buff, Environmental, Summon, Physical, Hybrid) and cast types (Continuous, Channeled) release as timed content drops after launch.

**Constraint:** the battle engine and validation layer must support the full taxonomy from day one, because the 36 platform spells already use all of it (for example World Root is Summon, Conflagration Wave is Continuous, Spell Cascade is Channeled). A content drop must be a configuration change (enable categories in the creation form and prompt template), not an engine change. Flag to founder if this conflicts with the earlier "full classification at launch" position.

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind, Framer Motion, Zustand |
| Real-time | Socket.io (human player's own battle session) |
| Backend | Node.js, three services: gateway, game, lab |
| Database | Supabase (PostgreSQL) |
| Cache and queues | Upstash Redis |
| Layer 1 text model | Provider chosen in Phase 0, behind abstraction (`SPELL_LLM_PROVIDER`) |
| Image model | Paid FLUX-class provider chosen in Phase 0, behind abstraction (`IMAGE_PROVIDER`) |
| Moderation | Purpose-built classifier chosen in Phase 0, behind abstraction (`MODERATION_PROVIDER`) |
| Email (magic link) | Transactional email provider (Resend or equivalent) |
| Frontend hosting | Vercel |
| Backend hosting | Render (free tier acceptable until real load; plan paid upgrade triggers) |
| Analytics | Event table in Postgres plus a lightweight dashboard query set (no third-party tracker required for Phase 1) |

Repository layout:

```
arcanis/
  services/
    gateway/
    game/
    lab/
  frontend/
  shared/        # types, constants, caps tables, taxonomy, zod schemas
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
- Supabase URL and service key
- Upstash Redis URL and token
- JWT signing secret
- Optional: device fingerprint library config, disposable-email domain list source

## 5. Identity and Anti-Abuse (Gateway)

Rules from Master Doc Section 18. Implementation requirements:

- **Magic link:** email only, single-use token, 15 minute expiry, signed, stored hashed. Link click creates the account if new and issues a session (httpOnly cookie plus short-lived JWT).
- **Viewing is anonymous. Generation requires a session.** Every generation endpoint rejects unauthenticated calls at the gateway before any provider is touched.
- **Fraud layer (must exist at launch):**
  - Disposable email domain blocklist, refreshed periodically
  - Device fingerprint recorded at signup and at generation; cap accounts per device and per IP range per day
  - New-account throttle: first 24 hours have a lower generation rate ceiling
  - Hard per-identity generation ceilings per hour and per day regardless of Spark balance
- **First free Spark grant** on email confirmation, once per device fingerprint (a second account on the same device does not get the grant).
- **Referral:** referral code attached to the preview link. Inviter and invitee each get a small Spark bonus when the invitee completes their first successful creation. Self-referral and same-device referral are rejected. Bonus is pending until the first creation passes verification.
- **Rate limiting** in Redis per user, per IP, and per device on auth, generation, and battle endpoints.

## 6. Spark and Aether Shard Ledger (Gateway)

Rules from Master Doc Section 22.

- Spark is an **append-only ledger**, not a mutable counter. Balance is the sum of entries (cached in Redis at `spark:balance:{userId}`, reconciled against Postgres).
- Entry types in Phase 1: `grant_signup`, `grant_referral_inviter`, `grant_referral_invitee`, `grant_weekly_allowance`, `spend_creation`, `refund_creation`, `admin_adjust`.
- **Spend is atomic:** reserve Spark before the pipeline runs (`spend_creation` pending), commit on success, auto-refund (`refund_creation`) on any failure the user did not cause (provider error, verification exhaustion after retries, moderation rejection of the system's own output).
- **A user-caused rejection** (the user's own input fails moderation) does not refund and counts toward abuse strikes.
- Spark is never granted for gameplay. Weekly allowance for the free tier is a small fixed grant; rollover is allowed up to a cap (value set in config, default to 2x weekly allowance).
- Aether Shards ledger is built with the same structure but has no sinks in Phase 1 beyond reserved hooks. Earning rules arrive with progression. Do not build earning logic yet.

## 7. Lab Service: Spell Creation Pipeline

### 7.1 Request flow

1. Client submits name, element, description, plus Summon mode and Trap visibility fields when those categories are enabled.
2. Gateway verifies session, rate limits, checks Spark balance, reserves cost.
3. **Input moderation (Layer 2b on user text)** runs first. Reject early and cheaply.
4. Lab fires **Layer 1 text generation** and **image generation in parallel**.
5. Text output goes through **Layer 2a** (schema and clamps), then **Layer 2b** (moderation on generated text).
6. Image output goes through **Layer 2b image moderation**.
7. If any check flags borderline, **Layer 2c** (small model semantic check) runs.
8. On any rejection, **silent retry** with an adjusted prompt, up to N attempts (config, default 2). Players never see a failure the pipeline should have caught.
9. On success: persist spell, commit Spark spend, start research timer, return the card.
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

### 7.3 Layer 2c

- Small, cheap model; fires only when 2a or 2b flags borderline (for example flavor text contradicts category, trap condition incoherent, description clearly requests something outside the spell premise)
- Returns structured pass or fail with a reason code
- Track trigger rate as a metric. If it exceeds roughly 15 percent of generations, tune the Layer 1 prompt before scaling traffic.

### 7.4 Assessment questions

The v7 schema still lists the Tower assessment question arrays. **Do not generate them in Phase 1.** Tower ships in Phase 3, and generating 40 questions per spell now burns cost for no value. Add the field and a backfill job in Phase 3.

### 7.5 Research timer

Stopwatch only, no countdown, no time disclosed (Master Doc 6.3). Duration derived from `research_complexity_score`, roughly 5 to 50 minutes. Spell shows in the library as "researching" (dimmed card, no lock language) and becomes usable on completion. Priority-research is a Phase 2 cosmetic purchase; leave a hook.

### 7.6 Image generation

- Prompt derived from spell name, flavor text, lore line, classification; color emerges from spell identity, not an element palette
- On provider failure after retries, use a generated-on-the-fly neutral placeholder and queue a background regeneration; never block creation on image failure
- Store the original plus a derived **Open Graph variant** (1200x630) and the portrait card variant
- Dominant color extracted from the final image for the card border accent

### 7.7 Cost telemetry (mandatory)

Every provider call logs: surface, provider, model, tokens or image units, latency, cost estimate, outcome. A `tools/cost-report` script aggregates cost per successful creation, retry rate, 2a clamp rate, 2b rejection rate, 2c trigger rate. This feeds Gate 1 and Phase 2 pricing.

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
- Will tracked per session from the avatar baseline, never sent to the client as a number
- Will feedback: server emits a **feedback event with a band key** only; the client or server picks a phrase from the variant pool at random per trigger. The client must never receive a value that lets it reconstruct Will.
- Terrain: 15 terrains, random assignment, modifiers per Master Doc 10, including classification-based special properties
- Reshape mechanic for Environmental spells (data-driven even though Environmental is not creatable at launch, since Tremor Field and Frost Field exist on the platform list)
- Disconnect: timer expiry auto-casts a random Instant spell at minimum damage; 60 second disconnect forfeits (applies to the human only)

### 8.4 Minigames

Element-group minigames per the v1 plan: timing strike (Fire, Lightning, Chaos), pattern match (Water, Frost, Nature), rapid tap (Wind), hold and release (Earth and Physical), quick reaction (Void, Shadow, Arcane), sequence input (Light). Result maps to damage within the spell range. Auto-resolve to mid-range damage when under 5 seconds remain on the turn timer.

**Anti-cheat note (flag):** with async PvP, minigame results are computed client-side and sent to the server. The server must validate plausibility (timing windows, input counts) and clamp, since a modified client would otherwise always roll max damage. Do not trust the client minigame value.

### 8.5 Async opponent piloting

- **Profile snapshot:** deck, spell stats, avatar, and playstyle vector, stored on deck edit and refreshed periodically; battles use the snapshot so results are reproducible
- **Playstyle vector** (from the player's own battle history, no LLM): aggression (Attack and Charged picks versus Defense and Regen), risk tolerance (Continuous and Channeled versus Instant), resource discipline (MP and Will spent per turn relative to pool). New players with no history get a neutral default vector.
- **Move selection:** rule-based scoring over the profile's real deck. Score each legal spell by category fit with the aggression weight, cast-type fit with the risk weight, resource cost versus discipline weight, terrain bonus, current HP and MP state, and counter-play (for example avoid Charged when the human has an interruptible threat ready). Choose the highest score with bounded randomness so behavior is plausible, not robotic.
- The piloted side is subject to the same Will, MP, interruption, and summon rules as the human
- **Re-engagement:** when a profile is defeated, enqueue a notification event to the owner ("[Name] just defeated your deck. Rematch?"). Phase 1 delivery: in-app inbox plus email digest limited to avoid spam. Web push can follow.
- **Matchmaking:** match the human to a profile by deck strength band (derived from average spell stats, not circle, since circles do not exist yet), avoid immediate rematches against the same profile except by explicit rematch, and exclude the player's own profile. If the pool is empty or too small, fall back to the vs-System bot labelled honestly as a training opponent.
- **Fairness guard:** very fresh decks should not be fed to strong profiles. Band by strength and by sample size.

### 8.6 Persistence

Battle state in Redis at `battle:session:{battleId}`; persisted to Postgres on completion with a compact turn log for replay later. Record per battle: both profile snapshot IDs, terrain, turns, winner, spells used, Will-band events (for tuning the feedback strings, never shown as numbers).

## 9. Database Schema (Phase 1 additions)

Evolves the v1 plan. Tables below are new or changed; keep tables free of placeholder columns for future systems.

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

(The `shard_ledger.created_at` default above should be `DEFAULT NOW()`; correct that when writing the migration.)

`lab_slots` from v1 is retired; weekly allowance is a `grant_weekly_allowance` ledger entry.

## 10. Frontend

| Page | Route | Notes |
|---|---|---|
| Landing | `/` | One-line pitch, magic-link email field, examples of shared cards |
| Magic-link callback | `/auth/callback` | Creates session, routes to onboarding or dashboard |
| Onboarding | `/start` | Avatar, name, first guided vs-System battle, then Lab with first Spark |
| Dashboard | `/dashboard` | HP and MP only (no Will, ever), Spark balance, recent battles, rematch inbox, quick-battle CTA |
| Lab | `/lab` | Creation form, live "creating" state, spell library as card grid, researching states, Spark balance |
| Battle Select | `/battle` | Async brawl button, terrain preview |
| Battle | `/battle/:id` | Per Master Doc 19, including active Continuous and Channeled status and battle log |
| Spell Detail | modal | Full stats, classification icons |
| Public Spell Preview | `/s/:slug` | No login. Card art, flavor, lore, "Create your own" CTA, referral code carried through. SSR or prerender for OG tags. |
| Settings | `/settings` | Account, notification preferences |

Rules:
- Will is never shown as a number, bar, or tooltip.
- Classification icons on cards and deck grid; mechanical implications never explained upfront.
- After every successful creation, show a one-tap share action producing the public link.
- Share cards must render correctly as OG images, with a distinct 1200x630 variant, not a cropped portrait card.
- Use the founder's design preference for any new design work: black and gold palette unless specified otherwise.

## 11. Balance Harness (tools/balance-harness)

Script that simulates thousands of async battles between spells (platform spells plus a corpus of generated test spells) across terrains, using the real engine and piloting logic. Report win rate and damage-per-MP by category, cast type, element, and terrain. Flag any category or cast type outside roughly 40 to 60 percent win rate. Run before launch and on every content drop. This addresses strategic imbalance inside the caps, which the stat clamp alone cannot catch.

## 12. Analytics Events (must be live at launch)

`landing_view`, `magic_link_requested`, `signup_confirmed`, `onboarding_battle_started`, `onboarding_battle_finished`, `lab_opened`, `creation_started`, `creation_succeeded`, `creation_refunded`, `share_clicked`, `preview_viewed` (with referrer and slug), `preview_cta_clicked`, `referral_paid`, `battle_started`, `battle_finished`, `rematch_clicked`, `spark_low_viewed` (Phase 2 hook), `session_day_n`.

Derived metrics: signup to first-creation conversion, first-creation to share rate, share-click to signup rate (viral coefficient), day-1 and day-7 retention, creations per active user, battles per active user, cost per successful creation, 2c trigger rate, moderation rejection rate.

## 13. Moderation and Abuse Handling

- Moderation on user input, generated text, and generated images (Layer 2b)
- User-caused rejections add an abuse strike; thresholds restrict, then ban (values in config)
- Public spell pages respect a report button feeding `moderation_events` and the admin queue
- Admin queue: list flagged items, approve, remove, strike, or ban; minimal internal page is enough for Phase 1
- Takedown path for a public spell (set `is_public = false`, return 410 on its preview URL)

## 14. Deployment

- Gateway, Game, Lab on Render (separate services). Upgrade to paid instances before launch if cold starts would hurt the signup funnel; the free tier sleeping on first click is a conversion leak. UptimeRobot on `/health` as a stopgap.
- Supabase, Upstash, Vercel
- GitHub Actions per service, migrations run in CI, secrets from the platform, never committed
- Staging environment separate from production, with provider keys on low spend caps
- Provider spend alerts and hard monthly caps set at each provider

## 15. Build Order

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

## 17. Open Items Phase 1 Must Resolve (decide with the founder, do not guess)

1. Provider choices and measured costs (Phase 0 output)
2. Weekly free-tier Spark allowance size and rollover cap
3. First-signup Spark grant size and referral bonus size (sized as a fraction of measured creation cost)
4. Launch creation subset confirmation (Section 2.3)
5. Fraud thresholds (device and IP caps)
6. Notification channels at launch (in-app plus email digest versus adding web push)
7. Whether to run a paid beta in Phase 1 (current plan: no, payments are Phase 2)
