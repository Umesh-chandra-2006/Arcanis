# Arcanis — Phased Build Plan
**Agent-Facing Implementation Document | Version 1.0**

---

## HOW TO USE THIS DOCUMENT

This is the implementation-sequencing companion to the *Arcanis Master Documentation*. That document is the complete game design reference — every system, every number, every locked decision. This document tells you the order to build things in, what belongs in each phase, and what to explicitly leave out until later.

If a mechanic is referenced here but you need its full specification (exact formulas, stat tables, schemas), go to the Master Documentation. This document does not repeat every number — it tells you what to build, when, and why.

**Project name:** Arcanis (formerly "Magic Spar" in early planning — same project, do not build anything under the old name).

**Author context:** This is a solo portfolio project. Two-way design communication is expected. If something in this plan seems structurally wrong for an agent to build alone, flag it rather than silently deviating or silently complying with something broken.

---

## BUILD PHILOSOPHY

The canonical GDD phase order (Core loop → Progression → Lab → Social → V1 complete) has been **deliberately inverted** for this build. Progression, social features, and structured content are grind-layer systems — they only matter once there's something worth grinding for. The actual build order ships the fun first:

**Phase 1 (this build): Spell Creation + Multiplayer Battles.** Players get the full mechanical ceiling immediately — every spell type, every classification system, real-time PvP — with zero XP gates, zero circle requirements, zero grind. This validates the core loop and is marketable on its own. Players who get hooked can then opt into progression when it ships.

Everything else (progression, social, quests, subscriptions) comes after Phase 1 is live and validated.

---

## LLM API KEY SETUP — DO THIS BEFORE WRITING CODE

Arcanis uses two independent LLM roles. Prompt the user for both before scaffolding anything.

```
Arcanis needs two LLM configurations. Both should use FREE tier providers.

1. SPELL CREATION LLM (generates spell stats, classification, summon profiles, flavor text)
   Choose one:
     a) Groq (recommended — fast, generous free tier): https://console.groq.com
     b) Google Gemini Flash: https://aistudio.google.com
     c) OpenRouter (free model routing): https://openrouter.ai
   
   Which provider? [a/b/c]
   API key:

2. IMAGE GENERATION (spell card art)
   Hugging Face Inference API (FLUX model): https://huggingface.co/settings/tokens
   API key:
```

Build a provider-abstraction layer so switching `SPELL_LLM_PROVIDER` in `.env` is the only change needed to swap providers. Do not hardcode a single provider's request/response shape into business logic.

---

## PHASE 1: SPELL CREATION + MULTIPLAYER BATTLES

### 1.0 Scope Boundary

**Build:**
- The Lab: full spell creation flow, LLM-generated stats + classification, parallel image generation, research timer, spell card UI, 36 pre-seeded platform spells
- Open Brawl: real-time multiplayer battles with full mechanical depth — all cast types, terrain, summons, traps, interruption system
- A rule-based (non-LLM) placeholder bot for empty matchmaking queues

**Do not build:**
- Any XP track (Circle, Spell, Elemental)
- Proficiency tiers, Tower assessments
- Circle levels or circle gates of any kind
- Arc quests, challenge quests, daily quests
- Animus ranked mode
- Halls, friends, community boards, leaderboards
- Freestyle Mode (LLM-judged imagination battles)
- Spell animations (stays behind an OFF feature flag — build the flag, don't build the feature)
- Fusion, multi-cast
- Subscriptions, payments, Aether Shards
- Avatar unlocks beyond the default roster
- Spell locking for new players ("this spell awaits your growth" — not applicable, nothing is gated)

If you're unsure whether something belongs in Phase 1, the test is: **does Open Brawl or the Lab need this to function today?** If no, it's a later phase.

### 1.1 Tech Stack for This Phase

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Framer Motion, Zustand |
| Real-time | Socket.io |
| Backend | Node.js — Gateway service, Game service, Lab service (3 services, not 4 — Progression service is not built yet) |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis (free tier) |
| Spell creation LLM | User-configured (Groq / Gemini Flash / OpenRouter) |
| Image generation | Hugging Face Inference API (FLUX) |
| Hosting | Render (backend, free tier), Vercel (frontend, free tier) |

Repository structure:
```
arcanis/
  services/
    gateway/    # Auth, user management
    game/       # WebSocket battle server
    lab/        # Spell creation, LLM proxy, image gen
  frontend/
  shared/       # Types, constants, validation schemas
  .env.example
```

### 1.2 Character Stats for Phase 1

Full stat and Will system detail: Master Documentation Section 2.

- HP, MP: standard, from avatar table (Master Doc Section 13)
- Will: tracked internally per battle session, starts at avatar's Will value. **Never displayed in UI.** Qualitative feedback strings only, surfaced in the battle log at thresholds (Strained / Failing / Broken). No growth system yet — Will resets to avatar default each battle since there's no persistent character progression in Phase 1.

### 1.3 Spell Classification — What Ships in Phase 1

Full classification spec: Master Documentation Section 5. All of it ships in Phase 1 — this is not simplified. Every category (Attack, Defense, Regen, Debuff, Buff, Drain, Environmental, Summon, Physical, Hybrid) and every cast type (Instant, Trap, Charged, Continuous, Channeled) must be functional in battle from day one, since there are no circle gates limiting what's craftable.

**Locked design decisions to implement exactly as specified:**

- **Summon mode system**: Autonomous vs Controlled, chosen at spell creation. Directives shown to the player in battle are derived from the summon's actual generated skill set (a glass-cannon summon only offers "attack," a support summon offers "support," etc.) — do not hardcode a fixed directive menu. Autonomous summons get ~70-75% of Controlled's stat ceiling. Both modes drain Will/MP as base maintenance every turn, plus additional Will/MP on each skill activation.
- **Trap visibility system**: creator chooses hidden or visible at spell creation. Hidden traps cost more Will/MP to set or sustain (never lose effect power). Hidden trap triggers are revealed in the battle log after firing, not before.
- **Physical proficiency multiplier (1.5x on battle wins)**: this is a Phase 2 (progression) concern. Do not implement in Phase 1 — there's no Spell XP system yet to apply it to. Just make sure the `is_physical` flag and lower Will cost are correctly applied to battle mechanics now; the XP multiplier comes later.
- **Spell card design**: dominant FLUX-generated image, dark gradient bottom panel with spell name + one-line lore text only (never stats), element icon in top-right corner, tier-based border complexity (Basic = simple, Advanced = layered, Mega = triple border with glow, Freestyle = distinct). Border/accent color derived from the image's dominant color, not a fixed element palette. Card aspect ratio is portrait/trading-card style, sized for in-game UI, not a fixed social square. Clicking the card opens full stat detail in an overlay.

### 1.4 Spell Creation Flow

Full flow spec: Master Documentation Section 6.3, LLM schema in 5.4.

1. Player inputs: name, element, description, and — if Summon category — Autonomous or Controlled mode choice.
2. Fire LLM call and image generation call in parallel. Do not block one on the other.
3. LLM call goes through the provider abstraction layer, using the user-configured spell creation provider.
4. Validation layer clamps every numeric field to the hard caps in Master Doc Section 6.2 before storage. Never trust LLM output directly — enforce: Summon must be Continuous, Hybrid requires a secondary category, Trap requires a condition and visibility choice, summon stat caps match the spell's tier.
5. Image generation via Hugging Face FLUX. On failure, use a fallback placeholder — never block spell creation on image failure.
6. Research timer starts: stopwatch only, duration derived from `research_complexity_score` (roughly 5-50 minutes). No countdown shown, no time-remaining disclosed.
7. Spell appears in collection immediately, marked "researching" (dimmed card, no lock language), then unlocks to usable when the timer completes.

**Lab slot limit for Phase 1:** 3 spell creations per week per player, tracked in Redis, resets Monday. (Full subscription-tiered limits from Master Doc Section 25 are a later-phase concern — Phase 1 uses the Free-tier limit for everyone since there's no subscription system yet.)

### 1.5 36 Platform Base Spells

Full roster and classification: Master Documentation Section 5.6. Pre-seed all 36 in the database at deploy time with hardcoded stats within tier caps — do not spend LLM calls or Lab slots generating these. Every player has access to all 36 immediately, no unlocks required.

### 1.6 Battle System

Full spec: Master Documentation Sections 10 (Terrain) and 11 (Battle System).

**Battle type shipped:** Open Brawl only (multiplayer, casual, no restrictions). Animus (ranked) is a later phase — it requires progression to mean anything.

**Turn structure**, exactly as Master Doc 11.2 describes: spell/trap selection → minigame resolution → terrain modifiers → interruption check → trap trigger check → stat updates → summon resolution → win check.

**Terrain**: full 15-terrain roster active, randomly assigned at battle start. CSS keyframe-animated static backgrounds, no video assets.

**Minigames**: Section 26.5 of the Master Doc notes most per-element minigames were never individually designed. For Phase 1, use element-*group* minigames (not one design per element — six designs covering all twelve elements):

| Element Group | Elements Covered | Minigame |
|---|---|---|
| Fire, Lightning, Chaos | 3 | Timing strike — moving bar, click at the right moment |
| Water, Frost, Nature | 3 | Pattern match — reproduce a flashed 3x3 grid pattern |
| Wind | 1 | Rapid tap — tap count within a time window |
| Earth, Physical spells | 1 + cross-cutting | Hold and release — power meter, release in the green zone |
| Void, Shadow, Arcane | 3 | Quick reaction — tap the matching symbol from options |
| Light | 1 | Sequence input — reproduce a short symbol sequence in order |

Minigame result determines actual damage within the spell's damage range. Auto-resolve to mid-range damage if under 5 seconds remain on the turn timer.

**Disconnect handling**: exactly as Master Doc 11.4 — timeout auto-casts random Instant spell at minimum damage, 60+ second disconnect is a forfeit.

**Battle state**: held in Redis at `battle:session:{battleId}`, persisted to Supabase on completion. Full state shape example is in the Master Doc's Redis key table (Section 23.2) — extend it to include the fields Phase 1 actually needs (activeContinuous, activeChanneled, trapSlot, summonState per player).

### 1.7 Database Schema — Phase 1 Tables Only

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'ashen',
  hp INTEGER NOT NULL DEFAULT 100,
  mp INTEGER NOT NULL DEFAULT 100,
  will_cap INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  element TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Basic', 'Advanced', 'Mega')),
  primary_category TEXT NOT NULL,
  secondary_category TEXT,
  cast_type TEXT NOT NULL,
  cast_time_ms INTEGER NOT NULL,
  damage_min INTEGER NOT NULL,
  damage_max INTEGER NOT NULL,
  mp_cost INTEGER NOT NULL,
  mp_maintenance_per_turn INTEGER,
  will_cost_min INTEGER NOT NULL,
  will_cost_max INTEGER NOT NULL,
  will_drain_per_turn INTEGER,
  interruption_threshold INTEGER,
  scaling_factor FLOAT,
  mp_modifier FLOAT,
  is_physical BOOLEAN DEFAULT FALSE,
  physical_delivery TEXT,
  trap_condition TEXT,
  trap_visibility TEXT CHECK (trap_visibility IN ('visible', 'hidden')),
  flavor_text TEXT,
  lore_line TEXT,
  image_url TEXT,
  is_platform_spell BOOLEAN DEFAULT FALSE,
  research_status TEXT DEFAULT 'ready' CHECK (research_status IN ('researching', 'ready')),
  research_started_at TIMESTAMPTZ,
  research_complexity_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE summon_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spell_id UUID REFERENCES spells(id) UNIQUE,
  summon_name TEXT NOT NULL,
  summon_hp INTEGER NOT NULL,
  attack_rating INTEGER NOT NULL,
  element TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('autonomous', 'controlled')),
  behaviors JSONB NOT NULL
);

CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  spell_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  winner_id UUID REFERENCES users(id),
  terrain TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'brawl',
  turns_played INTEGER,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lab_slots (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  weekly_spells_used INTEGER DEFAULT 0,
  weekly_reset_at TIMESTAMPTZ DEFAULT NOW()
);
```

No XP, circle, proficiency, affinity, hall, friend, or subscription tables in Phase 1. They get added in later phases without touching this schema destructively — design with that in mind (don't overload these tables with placeholder columns for future systems).

### 1.8 Frontend Pages — Phase 1 Only

| Page | Route | Contents |
|---|---|---|
| Landing | `/` | Intro, sign up / log in |
| Register | `/register` | Username, email, password, avatar selection |
| Login | `/login` | Standard auth |
| Dashboard | `/dashboard` | HP/MP bar (no Will bar, ever), avatar, spell count, recent battles, quick-battle CTA |
| Lab | `/lab` | Creation form, owned spell library as card grid, research queue with stopwatches |
| Battle Select | `/battle` | Open Brawl queue button, terrain preview |
| Battle | `/battle/{id}` | Opponent HP bar, terrain background, spell deck grid with category/cast-type icons, own HP/MP bars, turn timer, minigame overlay, active Continuous/Channeled status, battle log |
| Spell Detail | Modal | Full stats, card image, classification icons |
| Settings | `/settings` | Account details |

**Non-negotiable UI rule carried from the Master Doc:** Will is never shown as a number, bar, or tooltip anywhere. It only ever surfaces as battle-log flavor text at thresholds.

### 1.9 LLM Rate Limiting

Track calls in Redis (`llm:ratelimit:{provider}:minute`, `:day`). Stay under free-tier ceilings — for Groq, aim for 80% of the ~30 req/min, ~14,400 tokens/min free tier limits as a soft ceiling. On rate-limit hit, queue the spell creation and notify the player it's processing rather than erroring out.

### 1.10 Deployment

- 3 Render free-tier accounts (Gateway, Game, Lab) — Progression service doesn't exist yet in Phase 1
- UptimeRobot pinging Game Service `/health` every 10 minutes
- Supabase free tier, Upstash Redis free tier, Vercel free tier for frontend
- GitHub Actions CI/CD, one workflow per service

### 1.11 Build Order Within Phase 1

1. **Scaffold**: monorepo, shared types/schemas, Supabase project + migrations, Redis connection, CI/CD, `.env` templates. Prompt for and store LLM keys here.
2. **Gateway**: registration, login, JWT auth, avatar selection, routing to other services.
3. **Lab Service**: LLM provider abstraction → spell creation endpoint (LLM + parallel image gen + validation + research timer) → seed 36 platform spells → spell library endpoint → Lab slot rate limiting → research status polling.
4. **Game Service**: Socket.io server → matchmaking queue → battle state machine (all cast types, interruption, summon state, terrain) → battle persistence → rule-based bot fallback.
5. **Frontend**: auth pages → Lab page + spell card component → Battle page (terrain, deck grid, HP/MP bars, timer, minigames, battle log) → Dashboard.
6. **Integration**: end-to-end spell creation, full two-player battle session, disconnect/timeout paths, rate-limit behavior, validation-layer stress testing.

**Phase 1 is done when:** two players can each independently create custom spells of every category and cast type through the Lab, and then battle each other in real time using those spells with full mechanical resolution (terrain, interruption, summons, traps) — with zero mention of XP, circles, or proficiency anywhere in the product.

---

## PHASE 2: PROGRESSION (Future — Not This Build)

Ships after Phase 1 is live and validated. Brief scope preview so Phase 1 architecture doesn't box this out:

- Progression Service (4th backend service) goes live, event-driven off Redis pub/sub
- Three XP tracks: Circle XP, Spell XP, Elemental XP (Master Doc Sections 3, 7, 8, 14)
- Circle advancement with multi-source gate checking
- Proficiency tiers per spell, Tower assessment batch cron
- Elemental affinity thresholds and titles
- Will growth events activate (currently static in Phase 1)
- Physical spell 1.5x battle-win proficiency multiplier activates here

**Architectural note for Phase 1 build:** don't hardcode assumptions that Will is static or that spells have no XP state — leave clean extension points (e.g., a spell's proficiency tier should be easy to add as a column later without restructuring the `spells` table relationships).

## PHASE 3: LAB EXPANSION AND SOCIAL PROOF (Future)

- Tower assessment UI and full question-bank flow
- Community boards, spell showcase (read-only)
- Elemental and Circle leaderboards

## PHASE 4: SOCIAL LAYER (Future)

- Halls, friends system
- Animus ranked mode (now meaningful, since progression exists)
- Freestyle Mode (LLM-judged imagination battles)

## PHASE 5: FULL V1 (Future)

- Arc quests (elemental, circle progression, cross-element, terrain mastery)
- Avatar unlocks beyond default roster
- Free Mode
- Full onboarding flow (Master Doc Section 18)
- Subscription tiers and Lemon Squeezy integration
- Spell animation feature flag activation

---

## REFERENCE: WHERE TO FIND WHAT IN THE MASTER DOCUMENTATION

| Need | Master Doc Section |
|---|---|
| Full Will system, thresholds, growth | 2 |
| Circle system (not built in Phase 1, reference only) | 3 |
| Elements and amicability table | 4 |
| Full spell classification (categories, cast types, all locked designs) | 5 |
| Spell tiers, hard stat caps, creation flow, card design | 6 |
| Proficiency system (Phase 2+) | 7 |
| Elemental affinity (Phase 2+) | 8 |
| Fusion system (V2, not this build) | 9 |
| Terrain system, full 15-terrain roster | 10 |
| Battle system, turn structure, Animus ranks | 11 |
| Freestyle Mode (Phase 4+) | 12 |
| Avatar system | 13 |
| XP economy (Phase 2+) | 14 |
| Quest system (Phase 5+) | 15 |
| Tower daily arcs (Phase 5+) | 16 |
| Community, Halls, Friends (Phase 4+) | 17 |
| Onboarding flow (Phase 5+) | 18 |
| Platform pages, full list | 19 |
| Free Mode (Phase 5+) | 20 |
| Technical stack | 21 |
| Zero-cost launch strategy | 22 |
| Distributed system architecture | 23 |
| Full implementation phase roadmap (canonical order) | 24 |
| Subscription tiers (Phase 5+) | 25 |
| Full locked-decision inventory and terminology | 26 |

---

*End of Phased Build Plan. Hand this document plus the Arcanis Master Documentation to your coding agent together — this one tells it what to build now, the other tells it exactly how everything is supposed to work.*
