# ARCANIS — Phase 1 Build Plan
**Full Product: Spell Creation + Ghost-Deck Battles + Spark Economy | Version 1.0**

---

## PREREQUISITE

**Phase 0 must validate demand before Phase 1 begins.** Do not start Phase 1 until:
- K-factor ≥ 0.1 (growth loop is functional, even if weak)
- Average spells per user ≥ 2 (creation is the hook)
- At least 50 signups in first 2 weeks

If Phase 0 fails these thresholds, redesign or pivot before investing in Phase 1.

---

## SCOPE — WHAT SHIPS

```
SHIPS:
  ✓ Magic-link auth (from Phase 0)
  ✓ Power Budget formula engine (expanded from Phase 0)
  ✓ Spell creation with full Spark economy
  ✓ Spark pack purchases (Lemon Squeezy integration)
  ✓ 36 platform base spells (pre-seeded, balanced)
  ✓ Ghost-deck async PvE battles (PvE framing, NOT competitive PvP)
  ✓ Battle replay viewer
  ✓ Public share pages with OG images (from Phase 0)
  ✓ Battle result sharing (second viral surface)
  ✓ Spell library with full stats view
  ✓ Dashboard (HP/MP, Spark balance, recent battles)
  ✓ Profile staleness decay for ghost deck pool
  ✓ Anti-abuse system (full implementation)
  ✓ 4 categories: Attack, Defense, Regen, Debuff
  ✓ 2 cast types: Instant, Charged
  ✓ 2 minigames: Timing Strike, Pattern Match
  ✓ Referral system (basic)
  ✓ Battle log storage + replay data

DOES NOT SHIP:
  ✗ Animus ranks (deferred until Live Duel)
  ✗ Full 10-category surface (remaining 6 categories: V1)
  ✗ Full 5-cast-type surface (remaining 3 cast types: V1)
  ✗ Remaining 4 minigames (V1)
  ✗ Freestyle Mode (V1)
  ✗ Fusion (V2)
  ✗ Community page (V1)
  ✗ Halls / friends (V1)
  ✗ Quest system (V1)
  ✗ Tower assessments (V1)
  ✗ Subscription tiers (V1 — only Spark packs)
  ✗ Founder's Pass (V1)
  ✗ Spell animations (deferred until revenue)
  ✗ Live Duel (later, liquidity-gated)
  ✗ Will visibility playtest decision (ship hidden, test post-launch)
```

---

## TECH STACK

Same as Phase 0, with additions:

| Addition | Technology | Purpose |
|---|---|---|
| Real-time | Socket.IO (already in project) | Battle sessions (human player's own connection) |
| Battle state | Redis (Upstash) | Active battle state, matchmaking pool |
| Payments | Lemon Squeezy | Spark pack purchases |
| Email | Resend | Magic-link delivery |
| Cron | Render cron or external | Profile staleness decay, ghost deck pool refresh |

---

## DATABASE SCHEMA — PHASE 1

### New Tables (add to `drizzle/schema.ts`)

```sql
-- Extend existing users table:
ALTER TABLE users ADD COLUMN magic_link_token VARCHAR(64);
ALTER TABLE users ADD COLUMN magic_link_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;

-- Spark economy
CREATE TABLE spark_balances (
  user_id INT PRIMARY KEY REFERENCES users(id),
  balance INT NOT NULL DEFAULT 5,
  total_earned INT NOT NULL DEFAULT 5,
  total_spent INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE spark_transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  amount INT NOT NULL,
  type ENUM('signup_grant', 'creation_spend', 'pack_purchase', 'referral_bonus') NOT NULL,
  spell_id VARCHAR(36),
  pack_size VARCHAR(16),          -- 'small', 'medium', 'large' for purchases
  stripe_session_id VARCHAR(128), -- Lemon Squeezy reference
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ghost deck pool
CREATE TABLE ghost_decks (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  deck_data JSON NOT NULL,        -- snapshot of user's deck at time of pool entry
  playstyle_vector JSON NOT NULL, -- { aggression: 0-1, risk_tolerance: 0-1, resource_discipline: 0-1 }
  terrain_preferences JSON,       -- which terrains this ghost performs well on
  skill_rating FLOAT DEFAULT 1000,-- ELO-like rating for matchmaking
  last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Battle records (extend existing battles table)
-- Already has: id, player1_id, player2_id, winner_id, terrain, mode, turns, battle_log
-- Add: ghost_deck_id VARCHAR(36), battle_type ENUM('system', 'ghost', 'live')

-- Battle replays
CREATE TABLE battle_replays (
  id VARCHAR(36) PRIMARY KEY,
  battle_id VARCHAR(36) NOT NULL REFERENCES battles(id),
  replay_data JSON NOT NULL,      -- sequential turn actions for viewer
  highlight_moment TEXT,          -- brief description of the best moment
  is_featured BOOLEAN DEFAULT FALSE,
  featured_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Share tracking
CREATE TABLE share_events (
  id VARCHAR(36) PRIMARY KEY,
  spell_id VARCHAR(36),
  battle_id VARCHAR(36),
  share_type ENUM('spell_card', 'battle_result') NOT NULL,
  share_platform ENUM('link', 'twitter', 'discord', 'other') NOT NULL,
  user_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE share_clicks (
  id VARCHAR(36) PRIMARY KEY,
  share_event_id VARCHAR(36) NOT NULL REFERENCES share_events(id),
  visitor_fingerprint VARCHAR(64), -- browser fingerprint hash
  converted_to_signup BOOLEAN DEFAULT FALSE,
  converted_user_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events
CREATE TABLE analytics_events (
  id VARCHAR(36) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  user_id INT,
  session_id VARCHAR(64),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disposable email domains (seed data)
CREATE TABLE blocked_email_domains (
  domain VARCHAR(128) PRIMARY KEY
);
-- Seed with ~50 known disposable domains
```

### Existing Tables Modified

```sql
-- spells table: add generation_metadata column
ALTER TABLE spells ADD COLUMN generation_metadata JSON;
-- Stores: { provider, generation_time_ms, verification_result, pb_calculation }

-- battles table: add ghost_deck_id and battle_type
ALTER TABLE battles ADD COLUMN ghost_deck_id VARCHAR(36);
ALTER TABLE battles ADD COLUMN battle_type ENUM('system', 'ghost', 'live') DEFAULT 'system';
```

---

## BUILD ORDER

### Sprint 1 (Weeks 1-2): Spark Economy + Formula Engine Expansion

#### 1.1 Spark Ledger Service

Create `server/spark-service.ts`:

```typescript
// Core operations
async function getBalance(userId: number): Promise<number>
async function deduct(userId: number, amount: number, spellId: string): Promise<boolean>
async function grant(userId: number, amount: number, type: SparkGrantType): Promise<void>
async function getTransactionHistory(userId: number, limit: number): Promise<SparkTransaction[]>
async function purchasePack(userId: number, packSize: 'small' | 'medium' | 'large'): Promise<PurchaseResult>

// Rate limiting: max 20 creations per user per day (hard cap, regardless of Spark)
// Fraud detection: flag accounts with >50 creations/day for review
```

Spark balance is stored in Redis for fast reads, persisted to MySQL for durability:

```
Redis key: spark:balance:{userId}
  → Updated on every grant/spend
  → Synced to MySQL asynchronously (every 60s or on user logout)

Redis key: spark:daily_count:{userId}
  → Reset at midnight UTC
  → Hard cap: 20 creations/day
```

#### 1.2 Power Budget Engine Expansion

Expand from Phase 0's 4 categories to full Phase 1 set:

```typescript
// Phase 1 categories (4)
const PHASE_1_CATEGORIES = ['Attack', 'Defense', 'Regen', 'Debuff'];

// Phase 1 cast types (2)
const PHASE_1_CAST_TYPES = ['Instant', 'Charged'];

// Phase 1 elements (12 — all elements available)
const PHASE_1_ELEMENTS = [
  'Fire', 'Water', 'Wind', 'Earth',
  'Lightning', 'Void', 'Arcane', 'Light',
  'Shadow', 'Nature', 'Frost', 'Chaos'
];

// Phase 1 tiers: Basic only (Advanced and Mega locked behind progression)
const PHASE_1_TIERS = ['Basic'];
```

This gives: 12 elements × 4 categories × 2 cast types × 1 tier = **96 unique stat profiles** (deterministic from the formula engine). Players can create any combination, but each combination always produces the same base stats.

#### 1.3 LLM Output Schema (Phase 1)

```json
{
  "name": "string",
  "element": "string (from PHASE_1_ELEMENTS)",
  "primary_category": "string (from PHASE_1_CATEGORIES)",
  "secondary_category": "null (Hybrid not in Phase 1)",
  "cast_type": "string (from PHASE_1_CAST_TYPES)",
  "flavor_text": "string (1-2 sentences, atmospheric)",
  "lore_line": "string (one evocative line)",
  "behavior_type": "string (describes combat behavior)",
  "research_complexity_score": "number (1-10)",
  "assessment_questions": {
    "tier_2": "string[10]"
  },
  "is_physical": "boolean",
  "physical_delivery": "string | null",
  "trap_condition": "null (Trap cast type not in Phase 1)",
  "trap_visibility": "null"
}
```

The engine then computes all numeric stats deterministically.

---

### Sprint 2 (Weeks 3-4): Ghost-Deck Battle System

#### 2.1 Ghost Deck Pool Manager

Create `server/ghost-pool.ts`:

```typescript
// When a user creates or updates their deck:
async function upsertGhostDeck(userId: number): Promise<void>
  // 1. Snapshot current deck (spell IDs + stats)
  // 2. Compute playstyle vector from battle history
  // 3. Store/update in ghost_decks table
  // 4. Reset staleness timer

// Playstyle vector computation:
function computePlaystyleVector(userId: number): PlaystyleVector
  // aggression: ratio of Attack/Charged picks vs Defense/Regen picks
  // risk_tolerance: ratio of Charged picks vs Instant picks
  // resource_discipline: avg MP spent per turn relative to available pool
  // Defaults for new players: { aggression: 0.5, risk_tolerance: 0.5, resource_discipline: 0.5 }

// Staleness decay (run daily via cron):
async function applyStalenessDecay(): Promise<void>
  // Last login < 7 days:    is_active = TRUE, full frequency
  // Last login 7-30 days:   is_active = TRUE, 75% frequency
  // Last login 30-90 days:  is_active = TRUE, 50% frequency
  // Last login 90-180 days: is_active = TRUE, 25% frequency
  // Last login > 180 days:  is_active = FALSE (removed from pool)
  // Deck edit: resets staleness to 0

// Matchmaking (for ghost battles):
async function selectGhostDeck(playerId: number, terrain: string): Promise<GhostDeck>
  // 1. Filter active ghost decks
  // 2. Exclude player's own ghost deck
  // 3. Weight by: skill_rating proximity, terrain preference match, staleness
  // 4. Select weighted random
  // 5. Return ghost deck with piloting instructions
```

#### 2.2 Rule-Based Combat Engine (Piloting Ghost Decks)

Create `server/combat-engine.ts`:

This is the engine that pilots ghost decks. It reads a ghost deck's playstyle vector and makes decisions accordingly.

```typescript
// Core decision function
function selectGhostAction(
  ghostDeck: GhostDeck,
  playstyleVector: PlaystyleVector,
  battleState: BattleState
): BattleAction

// Decision logic:
// 1. Filter available spells (not on cooldown, sufficient MP)
// 2. Score each spell based on:
//    a. Category alignment with playstyle vector
//    b. Current battle state (HP ratio, MP ratio, Will state)
//    c. Terrain modifier
//    d. Opponent state (low HP → favor burst; high HP → favor sustain)
// 3. Apply playstyle weighting:
//    - High aggression: multiply Attack/Charged scores by 1.5x
//    - High risk tolerance: multiply Charged/Continuous scores by 1.3x
//    - High resource discipline: favor lower MP-cost spells when MP < 40%
// 4. Add randomness: weighted random selection from top 3 candidates
//    (prevents the ghost from being perfectly predictable)

// Summon handling (if ghost has active summon):
// Autonomous: summon executes assigned directive every turn
// Controlled: ghost picks summon skill using same scoring logic

// Trap handling:
// Ghost sets trap if: Cast type is Trap AND (opponent has Continuous active OR random 30% chance)
```

#### 2.3 Battle State Machine

Create `server/battle-state.ts`:

```typescript
interface BattleState {
  id: string;
  terrain: string;
  player: {
    userId: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    will: number;        // internal, never shown to player
    deck: Spell[];
    activeContinuous: ActiveSpell | null;
    activeChanneled: ActiveSpell | null;
    trapSlot: TrapSlot | null;
    summon: SummonState | null;
  };
  ghost: {
    ghostDeckId: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    will: number;
    deck: Spell[];
    playstyleVector: PlaystyleVector;
    activeContinuous: ActiveSpell | null;
    activeChanneled: ActiveSpell | null;
    trapSlot: TrapSlot | null;
    summon: SummonState | null;
  };
  currentTurn: number;
  maxTurns: number;     // 30 turns max
  turnTimer: number;    // 45 seconds per turn
  battleLog: TurnAction[];
  status: 'waiting' | 'in_progress' | 'player_win' | 'ghost_win' | 'timeout';
}
```

#### 2.4 Turn Resolution

The turn resolution follows the Master Doc Section 11.6 exactly:

```
Turn Resolution Order:
  1. Player selects spell (or trap)
  2. Ghost selects spell (via combat engine)
  3. Minigame triggers (player only — ghost auto-resolves)
  4. Terrain modifiers applied
  5. Charged spells: charge phase resolves
  6. Instant spells: resolve immediately
  7. Trap check: does either side have a trap that triggers?
  8. Continuous/Channeled: check interruption thresholds
  9. HP/MP/Will updated
  10. Summon actions resolve
  11. Win condition checked
  12. Battle log updated
```

#### 2.5 Minigames (Phase 1: 2 of 6)

**Timing Strike** (Fire, Lightning, Chaos elements):
```
- A bar moves across the screen
- Player clicks when the bar is in the green zone
- Timing accuracy determines damage within spell's damage range
- Auto-resolves to mid-range if <5 seconds remain on turn timer
```

**Pattern Match** (Water, Frost, Nature elements):
```
- A 3x3 grid flashes a pattern (2-4 cells light up in sequence)
- Player must reproduce the pattern by clicking cells
- Accuracy determines damage within spell's damage range
- Pattern complexity scales with spell tier
```

Both minigames are implemented in `client/src/components/Minigames.tsx` (already exists as a skeleton).

#### 2.6 Battle UI

Refactor `client/src/pages/Battle.tsx`:

```
Layout:
  ┌─────────────────────────────────────────┐
  │  [Terrain Background - CSS animated]    │
  │                                         │
  │  ┌──────────┐       ┌──────────┐       │
  │  │ Ghost    │       │ Player   │       │
  │  │ HP: ████ │       │ HP: ████ │       │
  │  │ MP: ██░░ │       │ MP: ███░ │       │
  │  └──────────┘       └──────────┘       │
  │                                         │
  │  ┌─────────────────────────────────┐    │
  │  │  Battle Log                     │    │
  │  │  "Your Ember Lance hits for 28" │    │
  │  │  "The construct trembles..."    │    │
  │  └─────────────────────────────────┘    │
  │                                         │
  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
  │  │Spell1│ │Spell2│ │Spell3│ │Spell4│  │
  │  │ ⚔️   │ │ 🛡️   │ │ 💚   │ │ 🔻   │  │
  │  └──────┘ └──────┘ └──────┘ └──────┘  │
  │                                         │
  │  [Set Trap]    Turn 5/30    Timer: 32s  │
  │                                         │
  └─────────────────────────────────────────┘

Category icons on spell cards:
  Attack: ⚔️   Defense: 🛡️   Regen: 💚   Debuff: 🔻
  (Phase 1 only — 4 categories)
```

---

### Sprint 3 (Weeks 5-6): Share System + Battle Replay

#### 3.1 Battle Result Sharing

After a battle completes:

```
┌─────────────────────────────────────────┐
│  ⚔️ VICTORY!                           │
│                                         │
│  Your Ember Lance defeated the          │
│  Shadow Wraith in 8 turns.             │
│                                         │
│  Terrain: Volcanic Rift                 │
│  Spells used: Ember Lance, Stone Fist   │
│                                         │
│  [📋 Copy Link]  [🐦 Tweet]  [💬 Discord]│
│                                         │
│  [Watch Replay]                         │
│  [Battle Another]                       │
│                                         │
└─────────────────────────────────────────┘
```

Battle share generates a formatted result card:

```
Share Card Layout:
  ┌─────────────────────────────────────┐
  │  ⚔️ VICTORY                         │
  │                                     │
  │  [Player Name]                      │
  │  def. Ghost of [Opponent Name]      │
  │                                     │
  │  8 turns | Volcanic Rift            │
  │  Ember Lance → 28 damage (final)   │
  │                                     │
  │  Created on Arcanis                 │
  │  arcanis.app/battle/:battleId       │
  └─────────────────────────────────────┘

OG image: Generated at battle completion, stored alongside battle replay
```

#### 3.2 Battle Replay Viewer

Create `client/src/pages/Replay.tsx` (route: `/replay/:battleId`):

```
The replay viewer reads the battle_replays table and renders
each turn sequentially:

- Each turn: show both players' spell cards flipping,
  HP bars animating, terrain background, battle log text
- Play/pause button, speed control (1x, 2x, 4x)
- Skip to turn N
- Total duration: ~30-60 seconds for an 8-turn battle at 2x speed

This is a READ-ONLY viewer — no Socket.IO needed.
The battle already happened; we're just playing back the log.
```

#### 3.3 Share Page Expansion

Extend `/spell/:spellId` to also handle `/battle/:battleId`:

```
Battle Share Page (public, no auth):
  ┌─────────────────────────────────────────┐
  │                                         │
  │  [Battle Result Card - Large]           │
  │                                         │
  │  [Player Name]'s [Spell Name]           │
  │  defeated the Ghost of [Opponent]       │
  │                                         │
  │  [Watch Full Replay]                    │
  │                                         │
  │  [✨ Create Your Own Spell]             │
  │                                         │
  └─────────────────────────────────────────┘
```

---

### Sprint 4 (Weeks 7-8): Spark Economy + Payments

#### 4.1 Lemon Squeezy Integration

Create `server/payment-service.ts`:

```typescript
// Spark Pack Products (configured in Lemon Squeezy dashboard):
// Small:  10 Spark  — $2.99
// Medium: 30 Spark  — $7.99
// Large:  80 Spark  — $19.99

// Flow:
// 1. Client requests purchase → server creates Lemon Squeezy checkout session
// 2. User completes payment on Lemon Squeezy hosted page
// 3. Lemon Squeezy sends webhook to server
// 4. Server verifies webhook signature, credits Spark balance
// 5. Server logs transaction in spark_transactions

async function createCheckoutSession(userId: number, packSize: string): Promise<string>
  // Returns Lemon Squeezy checkout URL

async function handleWebhook(payload: string, signature: string): Promise<void>
  // Verify signature
  // Extract: user_id (from metadata), pack_size, amount
  // Credit Spark balance
  // Log transaction
```

#### 4.2 Spark Purchase UI

Create `client/src/components/SparkShop.tsx`:

```
Accessible from:
  - Dashboard (Spark balance section)
  - Lab page (when Spark is low)
  - Post-creation (when Spark is low)

Layout:
  ┌─────────────────────────────────────────┐
  │  Spark Shop                             │
  │                                         │
  │  Your balance: 3 Spark                  │
  │                                         │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐│
  │  │ Small    │ │ Medium   │ │ Large    ││
  │  │ 10 Spark │ │ 30 Spark │ │ 80 Spark ││
  │  │ $2.99    │ │ $7.99    │ │ $19.99   ││
  │  │          │ │ Best     │ │ Best     ││
  │  │ [Buy]    │ │ Value    │ │ Value    ││
  │  │          │ │ [Buy]    │ │ [Buy]    ││
  │  └──────────┘ └──────────┘ └──────────┘│
  │                                         │
  │  Spark never expires while your         │
  │  account is active.                     │
  └─────────────────────────────────────────┘
```

#### 4.3 Platform Base Spells (36 Spells)

Create `server/seed-platform-spells.ts`:

All 36 spells from Master Doc Section 5.6, pre-generated with the Power Budget engine:

```typescript
const PLATFORM_SPELLS = [
  // Fire
  { name: "Ember Lance", element: "Fire", category: "Attack", castType: "Instant", tier: "Basic" },
  { name: "Conflagration Wave", element: "Fire", category: "Attack", castType: "Charged", tier: "Basic" },
  { name: "Solar Collapse", element: "Fire", category: "Attack", castType: "Charged", tier: "Basic" },
  // Water
  { name: "Tidal Strike", element: "Water", category: "Attack", castType: "Instant", tier: "Basic" },
  { name: "Undertow Bind", element: "Water", category: "Debuff", castType: "Instant", tier: "Basic" },
  { name: "Abyssal Surge", element: "Water", category: "Attack", castType: "Instant", tier: "Basic" },
  // ... all 36 spells
];

// Each platform spell is:
// 1. Generated by the Power Budget engine (deterministic stats)
// 2. Given flavor text and lore by the LLM (one-time, at seed time)
// 3. Given card art by Hugging Face FLUX (one-time, at seed time)
// 4. Stored with is_platform_spell = TRUE
// 5. Available to ALL players immediately (no unlock required)
```

---

### Sprint 5 (Weeks 9-10): Anti-Abuse + Profile Management

#### 5.1 Full Anti-Abuse System

```
Layer 1: Pre-Creation (expanded from Phase 0)
  - Disposable email detection: 50+ domains blocked
  - Device fingerprinting: hash browser fingerprint
    - Max 3 accounts per fingerprint
    - Max 5 accounts per IP per day
  - Rate limiting:
    - Magic-link requests: 1 per email per 60s
    - Account creation: 5 per IP per day

Layer 2: Creation-Time
  - Spark ledger: hard gate, no Spark = no generation
  - Daily creation cap: 20 per user per day (regardless of Spark)
  - Sequential creation: must complete one spell before starting next
  - Generation timeout: 30s max per spell (prevents resource abuse)

Layer 3: Post-Creation
  - Behavioral analysis:
    - Flag accounts creating at >2 spells/minute (inhuman speed)
    - Flag accounts that create but never battle (possible farming)
    - Flag accounts that share every card immediately (bot behavior)
  - Content fingerprinting:
    - Hash spell name + description
    - Flag near-identical content from different accounts within 1 hour
  - Auto-pause: accounts exceeding 20 creations/day require review

Layer 4: Economic
  - Spells cannot be traded or transferred in Phase 1
  - Referral bonus: 1 Spark to both parties
    - Invitee must complete first creation to trigger inviter bonus
    - Max 10 referral bonuses per account (prevents referral farming)
  - Spark rollback: if abuse is detected post-creation, deduct Spark
    and remove the spell
```

#### 5.2 Profile Staleness Cron

```
Runs daily at 03:00 UTC (lowest traffic period):

1. Query all ghost_decks where is_active = TRUE
2. For each deck:
   a. Check user's last_login_at
   b. Apply staleness decay:
      - < 7 days: no change
      - 7-30 days: set weight = 0.75
      - 30-90 days: set weight = 0.50
      - 90-180 days: set weight = 0.25
      - > 180 days: set is_active = FALSE
3. Log decay actions in analytics_events
4. Send notification to users approaching 90-day threshold:
   "Your spell deck hasn't been used in a while. Log in to keep it in the battle pool."
```

#### 5.3 Battle Replay Storage

```
After every battle completes:
  1. Serialize the full battle_log from the battle state
  2. Store in battle_replays table
  3. Identify highlight moment:
     - Largest single-turn damage
     - Closest HP margin before win
     - Successful trap trigger
     - Summon MVP (most damage dealt)
  4. Generate OG image for battle result
  5. Make replay viewable at /replay/:battleId

Storage cost: ~1-2KB per turn × ~10 turns = ~10-20KB per battle
At 100 battles/day: ~1-2MB/day, ~60MB/month — negligible
```

---

### Sprint 6 (Weeks 11-12): Dashboard + Polish

#### 6.1 Dashboard

Refactor `client/src/pages/Dashboard.tsx`:

```
Layout:
  ┌─────────────────────────────────────────┐
  │  Dashboard                              │
  ├─────────────────────────────────────────┤
  │                                         │
  │  ┌─────────────────────────────────┐    │
  │  │  [Avatar]  Mage Name            │    │
  │  │  HP: ██████████ 100/100         │    │
  │  │  MP: ████████░░ 80/100          │    │
  │  │  (No Will display — ever)       │    │
  │  └─────────────────────────────────┘    │
  │                                         │
  │  Spark: ●●●●○ (4 remaining)  [Buy More]│
  │  Spells: 8 created                      │
  │                                         │
  │  Recent Battles:                        │
  │  ┌─────────────────────────────────┐    │
  │  │ ⚔️ Won vs Ghost of Sera (8 turns)│   │
  │  │ 🛡️ Lost vs Ghost of Draveth     │   │
  │  │ ⚔️ Won vs Ghost of Aldric       │   │
  │  └─────────────────────────────────┘    │
  │                                         │
  │  [Create Spell]  [Battle]               │
  │                                         │
  └─────────────────────────────────────────┘
```

#### 6.2 Referral System

```
Referral Flow:
  1. User finds referral link: /ref/:referralCode
  2. New user clicks link → lands on landing page with referral code in URL
  3. New user signs up via magic-link
  4. On first spell creation:
     a. New user receives 1 bonus Spark (on top of signup grant)
     b. Referrer receives 1 Spark (if referrer has completed ≥1 creation)
  5. Max 10 referral bonuses per account

Referral UI:
  - Dashboard has a "Invite Friends" section
  - Shows referral link with copy button
  - Shows count: "3 friends joined, 2 created spells"
```

#### 6.3 Landing Page Polish

Expand the Phase 0 landing page:

```
New sections:
  - "How it works" with animated step-by-step
  - "Featured Spells" carousel (top 5 most-shared community spells)
  - "Recent Battles" (3 most recent battle results, auto-updating)
  - "Join [X] mages who have created [Y] spells" (social proof counter)
  - Footer with links to terms, privacy, about
```

#### 6.4 Mobile Optimization

Phase 1 must work on mobile (many users will discover via shared links on phones):

```
Mobile-specific:
  - Spell creation form: single-column layout
  - Battle UI: responsive grid, larger touch targets
  - Spell cards: auto-scale to viewport width
  - Share buttons: native share API on mobile (if available)
  - Minigames: touch-optimized (larger tap targets, longer hold durations)
```

---

## API ROUTES — PHASE 1

### tRPC Router Structure

```typescript
appRouter = router({
  auth: router({
    requestMagicLink: publicProcedure    // Send magic-link email
    verifyMagicLink: publicProcedure     // Verify token, create session
    me: protectedProcedure               // Get current user
    logout: publicProcedure              // Clear session
  }),

  lab: router({
    createSpell: protectedProcedure      // Full creation pipeline
    getMySpells: protectedProcedure      // User's spell library
    getSpell: publicProcedure            // Single spell (for share pages)
    getFeaturedSpells: publicProcedure   // Top shared spells (for landing)
  }),

  game: router({
    startBattle: protectedProcedure      // Select ghost deck, create battle state
    submitTurn: protectedProcedure       // Player's turn action
    getBattleState: protectedProcedure   // Current battle state
    getBattleHistory: protectedProcedure // User's battle history
    getBattleReplay: publicProcedure     // Replay data (for share pages)
  }),

  spark: router({
    getBalance: protectedProcedure       // Current Spark balance
    getTransactions: protectedProcedure  // Transaction history
    createCheckout: protectedProcedure   // Lemon Squeezy checkout URL
  }),

  social: router({
    shareSpell: protectedProcedure       // Log share event
    shareBattle: protectedProcedure      // Log share event
    getShareStats: protectedProcedure    // Share count for a spell/battle
    getReferralLink: protectedProcedure  // User's referral link
    getReferralCount: protectedProcedure // How many referrals
  }),

  system: router({
    notifyOwner: protectedProcedure      // Existing system router
  }),
})
```

---

## DEPLOYMENT — PHASE 1

```
Frontend: Vercel (free tier)
  - Auto-deploy from GitHub
  - Custom domain

Backend: Render (Starter plan — $7/month)
  - NOT free tier (free tier sleeps, kills live battles)
  - Web service with health check
  - Cron job for profile staleness decay (daily)

Database: TiDB Cloud (free tier → paid when needed)
  - Free tier: 5GB storage, sufficient for Phase 1 early

Redis: Upstash (free tier → pay-as-you-go)
  - Free tier: 10k commands/day
  - Upgrade trigger: >10k commands/day consistently

Email: Resend (free tier: 100/day → paid when needed)
  - Magic-link delivery
  - Upgrade trigger: >100 emails/day

Payments: Lemon Squeezy
  - Merchant of Record (handles VAT)
  - 5% + $0.50 per transaction
  - Spark pack revenue covers this

Image Gen: Hugging Face (free tier → paid when needed)
  - Spell card art generation
  - Upgrade trigger: >500 images/day

Monitoring: UptimeRobot (free tier)
  - Ping backend every 10 minutes

Estimated monthly cost at Phase 1 launch: ~$7-15/month
  - Render Starter: $7
  - Everything else: free tier
  - Scales with usage
```

---

## MEASUREMENT PLAN — PHASE 1

### Daily Metrics (automated dashboard)

```
Acquisition:
  - New signups (magic-link verified)
  - Source tracking (which share link brought them)

Activation:
  - Signup → first creation rate (target: >60%)
  - First creation → first battle rate (target: >40%)
  - Time to first creation (target: <5 minutes)

Engagement:
  - Daily active users (DAU)
  - Spells created per day
  - Battles played per day
  - Avg session duration
  - Avg spells per user (target: >5)

Retention:
  - Day 1 retention (target: >30%)
  - Day 7 retention (target: >15%)
  - Day 30 retention (target: >8%)

Revenue:
  - Spark packs purchased per day
  - Revenue per day
  - Conversion rate: free → first purchase (target: >2%)
  - ARPU (average revenue per user)
  - ARPPU (average revenue per paying user)

Growth:
  - K-factor (target: >0.3)
  - Share → signup conversion rate
  - Referral signups per week
```

### Weekly Kill Criteria

```
STOP and reassess if ANY of these are true after 4 weeks:

1. DAU < 20 for 2 consecutive weeks (nobody is playing)
2. K-factor < 0.1 (growth loop isn't compounding)
3. Day 7 retention < 5% (nobody comes back)
4. Zero Spark pack purchases after 50+ users (nobody will pay)
5. >50% of users never battle after creating (battle isn't the hook)

If 1-3: Redesign core loop or pivot.
If 4: Revenue thesis is wrong — investigate non-generative monetization.
If 5: Battle system needs work — investigate friction points.
```

---

## SCOPE SUMMARY

```
Phase 0: 2-4 weeks  → Demand validation (creation hook)
Phase 1: 10-12 weeks → Full product (creation + battles + economy)

Total from zero to shipped product: ~14-16 weeks (3.5-4 months)

What you're shipping:
  A browser-based spell creation game where players describe spells
  in natural language, receive AI-generated balanced stats and card art,
  battle those spells against ghost decks of other players, and share
  their creations publicly.

What you're NOT shipping (and that's fine):
  Ranked PvP, full progression, full classification surface,
  subscriptions, community features, animations, fusion.

The 36 platform spells + 96 player-created stat profiles
= 132 unique spell configurations at launch.
That's enough for a real metagame.
```
