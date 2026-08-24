# ARCANIS — Phase 0 Build Plan
**Demand Validation Prototype | Version 1.0**

---

## PURPOSE

Phase 0 is NOT the game. It is a **demand test** — a single-page spell builder that validates whether "creation is the hook" before investing months into the full product. The entire phase answers one question:

> **Do strangers want to create spells, and will they share the result?**

If the answer is yes, Phase 1 is justified. If no, you've saved yourself 12-18 months of building something nobody wants.

**Timeline:** 2-4 weeks solo. If it takes longer, scope is wrong.

---

## SCOPE — WHAT SHIPS

```
SHIPS:
  ✓ Landing page with value proposition
  ✓ Magic-link email signup (instant, no password)
  ✓ Spell creation form (name, element, description, category, cast type)
  ✓ Power Budget formula engine (LLM identity, formula stats)
  ✓ LLM generates: flavor text, lore line, assessment questions
  ✓ Image generation for spell card art (Hugging Face FLUX)
  ✓ Spell card display with tier-based borders
  ✓ Public share page (no login required to view)
  ✓ Open Graph image tags for external sharing
  ✓ 5 free Spark on signup (no purchase flow yet)
  ✓ Basic anti-abuse (disposable email block, rate limiting)
  ✓ Spell library (view your created spells)

DOES NOT SHIP:
  ✗ Battles (async or otherwise)
  ✗ Community / social features
  ✗ Spark purchase flow (packs, shop)
  ✗ Subscription tiers
  ✗ Progression (XP, circles, proficiency)
  ✗ Tower / quests
  ✗ Referral system
  ✗ Battle replay
  ✗ Animus ranks
  ✗ Freestyle Mode
  ✗ Fusion
  ✗ Halls / friends
  ✗ Multiple cast types (only Instant ships)
  ✗ Multiple categories (only 4 ship: Attack, Defense, Regen, Debuff)
```

---

## TECH STACK

Leverages the existing Arcanis monorepo. No new frameworks.

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + Vite 8 + Tailwind 4 + shadcn/ui | Already in project |
| Backend | Express 4 + tRPC 11 | Already in project |
| Database | Drizzle ORM + TiDB Cloud (MySQL) | Already in project |
| Auth | Magic-link via email (new — replaces current JWT+bcrypt) | See Section 4.1 |
| LLM | Groq (primary) + Gemini (fallback) | Already in project |
| Image Gen | Hugging Face FLUX | Already in project |
| Hosting | Vercel (frontend) + Render (backend) | Free tiers sufficient for Phase 0 |
| Payments | None (free only) | Spark purchase is Phase 1 |

---

## BUILD ORDER

### Week 1: Core Infrastructure

#### 1.1 Database Schema Changes

Add to `drizzle/schema.ts`:

```sql
-- Spark tracking (new)
CREATE TABLE spark_balances (
  user_id INT PRIMARY KEY REFERENCES users(id),
  balance INT NOT NULL DEFAULT 5,
  total_earned INT NOT NULL DEFAULT 5,
  total_spent INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Spark transaction log (new)
CREATE TABLE spark_transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  amount INT NOT NULL,          -- positive = grant, negative = spend
  type ENUM('signup_grant', 'creation_spend', 'referral_bonus') NOT NULL,
  spell_id VARCHAR(36),         -- NULL for grants, set for creation spends
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spell creations tracking (extend existing spells table)
-- Add column: generation_metadata JSON
-- Stores: LLM provider used, generation time, verification result, PB calculation details
```

#### 1.2 Power Budget Engine

Create `server/power-budget.ts`:

```typescript
// Core constants
const BASE_POWER_BUDGET = {
  Basic: 100,
  Advanced: 250,
  Mega: 600,
} as const;

const CATEGORY_MODIFIERS = {
  Attack: 1.0,
  Defense: 0.8,
  Regen: 0.9,
  Debuff: 1.1,
  Buff: 0.9,
  Drain: 1.2,
  Environmental: 1.0,
  Summon: 1.3,
  Physical: 0.7,
  Hybrid: 1.2,
} as const;

const CAST_TYPE_MODIFIERS = {
  Instant: 1.0,
  Trap: 0.95,
  Charged: 1.05,
  Continuous: 1.15,
  Channeled: 1.25,
} as const;

const ELEMENTAL_SHIFTS = {
  Fire:      { damage_max: 0.08, mp_cost: -0.05 },
  Water:     { damage_max: -0.05, mp_maintenance: -0.10 },
  Wind:      { cast_time_ms: -0.15, damage_min: 0.05 },
  Earth:     { interruption_threshold: 0.20, damage_max: -0.08 },
  Lightning: { cast_time_ms: -0.20, mp_cost: 0.10 },
  Void:      { mp_modifier: 0.15, damage_min: -0.10 },
  Arcane:    { scaling_factor: 0.10, mp_cost: 0.05 },
  Light:     { mp_maintenance: -0.15, damage_max: -0.05 },
  Shadow:    { damage_max: 0.10, interruption_threshold: -0.10 },
  Nature:    { mp_maintenance: -0.10, interruption_threshold: 0.10 },
  Frost:     { scaling_factor: 0.15, cast_time_ms: 0.10 },
  Chaos:     { damage_min: -0.20, damage_max: 0.25 },
} as const;

// Stat cost weights (PB per unit)
const STAT_COSTS = {
  damage_per_point: 1.0,
  mp_cost_per_point: -1.5,        // MP cost saves budget
  will_cost_per_point: -0.8,      // Will cost saves budget
  scaling_per_0_1: 15.0,          // Scaling factor (Continuous/Channeled)
  interruption_per_point: -2.0,   // Interruption threshold costs budget
  maintenance_per_turn: -3.0,     // Maintenance cost saves budget
} as const;

// Interface for the output
interface PowerBudgetResult {
  damage_min: number;
  damage_max: number;
  mp_cost: number;
  will_cost_min: number;
  will_cost_max: number;
  cast_time_ms: number;
  scaling_factor: number | null;
  mp_modifier: number | null;
  interruption_threshold: number | null;
  maintenance_cost_per_turn: number | null;
  pb_used: number;
  pb_total: number;
}

export function computeSpellStats(
  element: string,
  category: string,
  castType: string,
  tier: string
): PowerBudgetResult {
  // 1. Compute effective budget
  const basePB = BASE_POWER_BUDGET[tier as keyof typeof BASE_POWER_BUDGET] ?? 100;
  const catMod = CATEGORY_MODIFIERS[category as keyof typeof CATEGORY_MODIFIERS] ?? 1.0;
  const castMod = CAST_TYPE_MODIFIERS[castType as keyof typeof CAST_TYPE_MODIFIERS] ?? 1.0;
  const effectivePB = basePB * catMod * castMod;

  // 2. Distribute budget across stats
  //    This is a deterministic distribution based on category archetype
  const distribution = distributeBudget(effectivePB, category, castType, tier);

  // 3. Apply elemental shifts
  const elementShifts = ELEMENTAL_SHIFTS[element as keyof typeof ELEMENTAL_SHIFTS];
  if (elementShifts) {
    applyElementalShifts(distribution, elementShifts);
  }

  // 4. Clamp to tier caps (from Section 6.2)
  clampToTierCaps(distribution, tier);

  return distribution;
}
```

The `distributeBudget` function implements category-specific archetypes:
- **Attack:** High damage, moderate MP cost, low maintenance
- **Defense:** Low damage, moderate MP cost, high interruption threshold
- **Regen:** Low damage, low MP cost, moderate maintenance
- **Debuff:** Moderate damage, high MP cost, scaling factor

Each archetype defines a target percentage split of the PB across stats, then the function solves for exact values that sum to the budget.

#### 1.3 LLM Provider Abstraction

Refactor `server/llm.ts` to support the two-step verification pipeline:

```typescript
// Layer 1: Generation (LLM produces identity only)
async function generateSpellIdentity(input: SpellCreationInput): Promise<LLMSpellOutput>

// Layer 2a: Schema validation (deterministic, free)
function validateSpellSchema(output: LLMSpellOutput): ValidationResult

// Layer 2b: Moderation (cheap classifier)
function moderateContent(text: string, imageUrl?: string): Promise<ModerationResult>

// Layer 2c: Semantic check (conditional, small model)
function semanticSanityCheck(output: LLMSpellOutput): Promise<SemanticResult>
```

#### 1.4 Auth: Magic-Link System

Replace current JWT+bcrypt with magic-link:

```
Flow:
  1. User enters email on landing page
  2. Server generates a one-time token, stores in authSessions table
  3. Server sends email with link: /auth/verify?token=xxx
  4. User clicks link → server validates token, creates/returns JWT session cookie
  5. User is authenticated

Email sending: Use a free transactional email service
  - Resend (free tier: 100 emails/day) — recommended
  - Mailgun (free tier: 1000 emails/month)
  - Or: for Phase 0 prototype, use a "dev mode" magic-link
    that auto-verifies without email (for testing with friends)
```

**Anti-abuse at this stage:**
- Block known disposable email domains (hardcoded list of ~50 domains)
- Max 3 accounts per IP per day
- Rate limit: 1 magic-link request per email per 60 seconds

---

### Week 2: Spell Creation Flow

#### 2.1 Spell Creation Form UI

Create `client/src/pages/Create.tsx`:

```
Layout:
  ┌─────────────────────────────────────────┐
  │  ARCANIS — Create Your Spell            │
  ├─────────────────────────────────────────┤
  │                                         │
  │  Spell Name: [________________]         │
  │                                         │
  │  Element:   [Fire ▼]                    │
  │  Category:  [Attack ▼]                  │
  │  Cast Type: [Instant ▼]                 │
  │                                         │
  │  Describe your spell:                   │
  │  ┌─────────────────────────────────┐    │
  │  │ A bolt of concentrated fire that│    │
  │  │ erupts from the caster's palm...│    │
  │  └─────────────────────────────────┘    │
  │                                         │
  │  [✨ Create Spell]  (costs 1 Spark)     │
  │                                         │
  │  Spark: ●●●●○ (4 remaining)            │
  │                                         │
  └─────────────────────────────────────────┘
```

**Trimmed surface for Phase 0:**
- 4 elements: Fire, Water, Earth, Wind (one per Primal group)
- 4 categories: Attack, Defense, Regen, Debuff
- 1 cast type: Instant (only — other cast types are Phase 1)
- This gives 4 × 4 × 1 = 16 possible stat profiles (deterministic from the formula engine)

#### 2.2 Spell Generation Pipeline

```
Client submits: { name, element, description, category, castType }
                     │
                     ▼
         ┌─────────────────────┐
         │  Spark Check        │  Does user have ≥ 1 Spark?
         │  (Redis ledger)     │  No → error. Yes → proceed.
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  LAYER 1: Generate  │  LLM produces:
         │  (Groq free tier)   │  - flavor_text
         │                     │  - lore_line
         │                     │  - assessment_questions (tier_2 only for Phase 0)
         │                     │  - behavior_type
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  LAYER 2a: Schema   │  Validate LLM output structure
         │  (deterministic)    │  Verify all required fields present
         │                     │  Verify no disallowed content
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  POWER BUDGET       │  Compute stats from:
         │  ENGINE             │  - element
         │  (deterministic)    │  - category
         │                     │  - cast type
         │                     │  - tier (Basic for Phase 0)
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  LAYER 2b: Moderate │  Check flavor_text + lore_line
         │  (Perspective API)  │  Check generated image
         │                     │  Flag → Layer 2c
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  IMAGE GENERATE     │  Hugging Face FLUX
         │  (parallel with     │  Prompt: name + element + flavor
         │   Layer 2b)         │  + category + classification
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  STORE              │  Save to spells table
         │  + DEDUCT SPARK     │  Save image to S3/storage
         │                     │  Deduct 1 Spark from balance
         │                     │  Log transaction
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  RETURN SPELL CARD  │  Full card data to client
         │                     │  Include share URL
         └─────────────────────┘
```

#### 2.3 Spell Card Component

Refactor `client/src/components/SpellCard.tsx`:

```
Card Layout (Phase 0):
  ┌─────────────────────┐
  │                     │
  │   [Generated        │
  │    Spell Art]       │
  │   (55% height)      │
  │                     │
  ├─────────────────────┤
  │ 🜂 Fire             │  ← Element icon (top-right)
  │                     │
  │  Ember Lance        │  ← Spell name (large, stylized)
  │  "A bolt of         │  ← Flavor text (one line)
  │   concentrated..."  │
  │                     │
  │  ○ Basic            │  ← Tier (border complexity)
  └─────────────────────┘

Border Rules:
  Basic: simple solid border (1px, accent color from image)
  
What's NEVER on the card:
  - Damage numbers
  - MP cost
  - Will cost
  - Stats of any kind
```

#### 2.4 Spell Library Page

Create `client/src/pages/Library.tsx`:

```
Layout:
  ┌─────────────────────────────────────────┐
  │  My Spellbook                    3/5 Spark│
  ├─────────────────────────────────────────┤
  │                                         │
  │  ┌──────┐ ┌──────┐ ┌──────┐           │
  │  │Card 1│ │Card 2│ │Card 3│           │
  │  │      │ │      │ │      │           │
  │  └──────┘ └──────┘ └──────┘           │
  │                                         │
  │  [Create New Spell]                     │
  │                                         │
  └─────────────────────────────────────────┘

Click a card → modal with full spell details (stats visible here, not on card)
```

---

### Week 3: Share Pages + Landing

#### 3.1 Public Share Page

Create `client/src/pages/ShareSpell.tsx` (route: `/spell/:spellId`):

```
This page is PUBLIC — no auth required to view.

Layout:
  ┌─────────────────────────────────────────┐
  │                                         │
  │          [Spell Card - Large]           │
  │          (same card component,          │
  │           larger size)                  │
  │                                         │
  │  Created by: [Player Name]              │
  │  Element: Fire | Category: Attack       │
  │  Cast Type: Instant | Tier: Basic       │
  │                                         │
  │  ┌─────────────────────────────────┐    │
  │  │  "A bolt of concentrated fire   │    │
  │  │   that erupts from the..."      │    │
  │  └─────────────────────────────────┘    │
  │                                         │
  │  [✨ Create Your Own Spell]             │  ← CTA → magic-link signup
  │                                         │
  └─────────────────────────────────────────┘
```

#### 3.2 Open Graph Image Generation

For each spell, generate a shareable OG image variant:

```
OG Image Spec:
  - Size: 1200x630 (Twitter/Discord standard)
  - Layout: Spell card centered, dark background
  - Text overlay: Spell name + "Created on Arcanis"
  - Generated at creation time, stored alongside card art
  - Served via /spell/:spellId with proper og:image meta tags
```

#### 3.3 Landing Page

Refactor `client/src/pages/Home.tsx`:

```
Layout:
  ┌─────────────────────────────────────────┐
  │                                         │
  │     ARCANIS                             │
  │     Create spells. Battle with them.    │
  │                                         │
  │  ┌─────────────────────────────────┐    │
  │  │  [Animated spell card showcase]  │    │
  │  │  (3-5 rotating community spells) │    │
  │  └─────────────────────────────────┘    │
  │                                         │
  │  [✨ Create Your First Spell — Free]    │
  │                                         │
  │  How it works:                          │
  │  1. Describe your spell                 │
  │  2. AI generates stats + art            │
  │  3. Share your creation                 │
  │                                         │
  │  Featured Spells:                       │
  │  ┌──────┐ ┌──────┐ ┌──────┐           │
  │  │Card 1│ │Card 2│ │Card 3│           │
  │  └──────┘ └──────┘ └──────┘           │
  │                                         │
  └─────────────────────────────────────────┘

The "Create Your First Spell" button → magic-link email capture
Featured spells are the 5 most-shared community spells (tracked via share count)
```

#### 3.4 Share Button on Spell Card

After creation, show:

```
┌─────────────────────────────────────────┐
│  ✨ Your spell is ready!                │
│                                         │
│  [Spell Card Display]                   │
│                                         │
│  [📋 Copy Link]  [🐦 Tweet]  [💬 Discord]│
│                                         │
│  12 people viewed your spell yesterday  │
│                                         │
│  [Create Another Spell]                 │
│                                         │
└─────────────────────────────────────────┘

Copy Link → copies /spell/:spellId to clipboard
Tweet → opens twitter.com/intent/tweet?text=...&url=/spell/:spellId
Discord → copies formatted markdown link for Discord
```

---

### Week 4: Polish + Launch

#### 4.1 Analytics (Minimal)

Track these metrics from day one (use a simple analytics endpoint, not a third-party service):

```typescript
// Events to track:
spell_creation_started    // User opened creation form
spell_creation_completed  // Spell generated and stored
spell_shared              // User clicked share button
share_link_copied         // User copied the share link
share_page_viewed         // Someone viewed /spell/:spellId (from share link)
share_page_cta_clicked    // Someone clicked "Create Your Own" on share page
magic_link_requested      // User entered email for magic link
magic_link_verified       // User clicked link and got session
```

Store events in a simple `analytics_events` table:
```sql
CREATE TABLE analytics_events (
  id VARCHAR(36) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  user_id INT,                    -- NULL for anonymous events
  session_id VARCHAR(64),         -- browser session for anonymous tracking
  metadata JSON,                  -- event-specific data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.2 Share Metrics Dashboard

Create a simple internal page (`/admin/metrics`) that shows:

```
Daily Metrics:
  - New signups (magic-link verified)
  - Spells created
  - Spells shared
  - Share page views (from external links)
  - Share page → signup conversion rate
  - Spark consumed vs remaining

Weekly Metrics:
  - Viral coefficient (K-factor): shares_per_user × conversion_per_share
  - Top shared spells
  - Creation → share rate
  - Signup → first creation rate
```

#### 4.3 Seed Content

Before launch, create 10-15 spells yourself across different elements and categories. These are the "featured spells" on the landing page and the initial content that makes the site look alive.

#### 4.4 Deployment

```
Frontend: Vercel (free tier)
  - Connect to GitHub repo
  - Auto-deploy on push to main
  - Custom domain if available

Backend: Render (free tier)
  - Web service, not background worker
  - Health check endpoint at /health
  - Note: free tier sleeps after 15 min inactivity
    - Acceptable for Phase 0 (low traffic)
    - Use cron ping (UptimeRobot) to keep alive during testing

Database: TiDB Cloud (existing)
  - Free tier sufficient for Phase 0

Redis: Upstash (free tier)
  - For Spark balance tracking
  - For rate limiting
  - 10k commands/day free tier is plenty for Phase 0
```

#### 4.5 Launch Checklist

```
Before sharing externally:
  □ Landing page looks good on mobile (test on phone)
  □ Share page renders correctly on Twitter/Discord (check OG tags)
  □ Magic-link flow works end-to-end (test with real email)
  □ Spark deduction works (create 5 spells, verify balance hits 0)
  □ Spell card generation completes in <15 seconds
  □ Image generation produces acceptable quality
  □ Share link copies correctly
  □ Analytics events are firing (check database)
  □ No profanity in generated content (test with edge cases)
  □ Disposable email blocking works (test with mailinator)
  □ Rate limiting works (test rapid requests)
```

---

## MEASUREMENT PLAN

### Week 1 Post-Launch: Baseline

Share the link on 2-3 platforms (Twitter, Reddit r/IndieGaming, one Discord server). Then measure:

| Metric | What to Look For | Threshold |
|---|---|---|
| Landing page → start creation | Is the hook compelling? | >25% |
| Start creation → complete | Is the flow too complex? | >70% |
| Complete creation → share | Is the card share-worthy? | >20% |
| Share click → new visitor | Does the share generate interest? | >10% |
| New visitor → start creation | Does the preview page convert? | >15% |

### Week 2: Viral Coefficient

```
K-factor = (avg shares per user) × (share-click → signup rate)

If K > 0.3:  Growth loop is self-sustaining at small scale. BUILD PHASE 1.
If K 0.1-0.3: Growth loop works but needs paid amplification. CONSIDER PHASE 1.
If K < 0.1:  Growth loop is dead. PIVOT or REDESIGN the share surface.
```

### Week 3: Creation Depth

```
Measure: How many spells does the average user create before churning?

If avg > 3:  "Creation is the hook" hypothesis validated. Users want to create.
If avg 1-2:  Users try it once and leave. The hook is weak — investigate why.
If avg = 1:  Almost everyone creates once and never returns. The hook is broken.
```

### Kill Criteria

```
STOP and reassess if ANY of these are true after 2 weeks:

1. Fewer than 50 total signups (nobody cares)
2. Fewer than 20 total spell creations (nobody wants to create)
3. Fewer than 5 total shares (nobody thinks it's worth sharing)
4. K-factor < 0.05 after 200+ shares (the loop doesn't compound)
5. >50% of users create exactly 1 spell and never return (hook is broken)

If 1-3 are true: The concept doesn't resonate. Redesign or pivot.
If 4 is true: The share surface doesn't work. Redesign the card/share flow.
If 5 is true: Creation isn't the hook. Investigate what is.
```

---

## WHAT PHASE 0 PROVES (OR DISPROVES)

| Hypothesis | How Phase 0 Tests It |
|---|---|
| "Creation is the hook" | Creation completion rate, spells per user, return rate |
| "Spell cards are shareable" | Share rate, share-click conversion, K-factor |
| "LLM generation is fast enough" | Generation latency, completion rate |
| "The formula engine produces balanced stats" | Playtest with yourself + 5 friends (manual, not in-game) |
| "People will sign up for this" | Magic-link conversion rate |
| "The visual quality is acceptable" | Share rate (if cards look bad, people won't share) |

**Phase 0 does NOT prove:**
- Whether people will pay (no payment flow)
- Whether battles are fun (no battles)
- Whether retention holds beyond first session (no progression)
- Whether the growth loop compounds at scale (too small)

These are Phase 1 questions. Phase 0 only validates the creation hook.

---

## RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM generation takes >15s | Medium | High (users abandon) | Show loading animation, generate in background, notify when ready |
| Image generation fails frequently | Medium | Medium (ugly cards) | Fallback to placeholder art with element-colored gradient |
| Magic-link emails go to spam | Medium | High (nobody verifies) | Use established provider (Resend), check deliverability |
| OG images don't render on Discord | Low | High (shares look broken) | Test with Discord's Open Graph debugger before launch |
| Free-tier hosting sleeps | High | Low (annoying, not fatal) | UptimeRobot pings every 10 min |
| Disposable email abuse | Medium | Low (cost is minimal at Phase 0 scale) | Block top 50 disposable domains, rate limit |

---

*End of Phase 0 Build Plan. Upon completion and validation of demand metrics, proceed to Phase 1 Build Plan.*
