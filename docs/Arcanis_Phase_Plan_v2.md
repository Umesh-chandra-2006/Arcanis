# Arcanis: Phase Plan v2.0

**Companion to: Arcanis Master Documentation v7.0 (the bible)**
**Status:** Commercial product. Supersedes the build order in the old Phased Build Plan v1.0 and Section 24 of Master Doc v6.0.

---

## 1. Purpose

This document sets the order in which Arcanis is built, why that order was chosen, and the evidence required to move from one phase to the next. The Master Doc defines what every system is. This doc defines when it gets built and what has to be true before the next phase is funded with time or money.

The governing principle: **every phase must either reduce a named risk or prove a named hypothesis.** No phase exists just because the feature list says so.

## 2. Named Risks and Hypotheses

| ID | Type | Statement | Resolved in |
|---|---|---|---|
| R1 | Risk | Live PvP needs liquidity the product will not have at launch | Phase 1 (async PvP) |
| R2 | Risk | Unbounded LLM and image cost destroys margin | Phase 0 (measure) + Phase 1 (verification pipeline, Spark ledger) |
| R3 | Risk | LLM output is unbalanced or unsafe, and paying users see it | Phase 1 (Two-Step Verification) |
| R4 | Risk | Hidden Will system causes opaque-feeling losses in PvP | Phase 1 telemetry, reviewed at Gate 1 (design stays locked; tune feedback, not secrecy) |
| R5 | Risk | Players resent AI-generated content | Framing: LLM as creative collaborator; Phase 1 copy and share assets |
| H1 | Hypothesis | The creation loop alone is satisfying and retains | Gate 1 |
| H2 | Hypothesis | Spell cards and battle results spread without paid acquisition | Gate 1 (viral coefficient) |
| H3 | Hypothesis | Players pay for Spark beyond their free allowance | Gate 2 |
| H4 | Hypothesis | Players want progression on top of the core loop | Gate 3 |

## 3. Phase Overview

| Phase | Name | Core output | Risk/hypothesis addressed |
|---|---|---|---|
| 0 | Measure and decide | Provider selection, real cost per generation, balance harness | R2, R3 |
| 1 | Creation + Async Battles | Launchable core loop with Spark ledger, magic-link identity, share loop | R1, R3, H1, H2 |
| 2 | Monetization | Lemon Squeezy, subscriptions, Spark packs, Founder's Pass | H3 |
| 3 | Progression | Progression Service, XP tracks, proficiency, Tower assessments | H4 |
| 4 | Community and Social | Halls, friends, boards, spell showcase, Tower daily arcs | Retention |
| 5 | Competitive Layer | Live Duel (liquidity-gated), Animus ranks, Freestyle Mode | Prestige, upsell |
| 6 | Full V1 content | Arc quests, avatar unlocks, Free Mode, animations, full onboarding | Depth |
| V2+ | Expansion | Fusion, multi-cast, per-spell minigames, multi-summon | Long horizon |

---

## 4. Phase 0: Measure and Decide (1 to 2 weeks, mostly before code)

**Goal:** replace every cost and balance estimate with a measured number.

Deliverables:
- Pick Layer 1 text model, image model, and moderation classifier. Run 100+ real spell-creation prompts through each candidate. Record: cost per call, latency, schema-failure rate, Layer 2a clamp rate (how often output needed clamping), moderation false-positive rate.
- Compute true all-in cost per spell creation and per fusion. Set Spark pricing from this, not from estimates.
- Build a **balance harness**: script that simulates N thousand async battles between generated spells and reports win rates by category and cast type. This answers the real balance risk (strategic imbalance inside the caps), which the stat clamp alone does not.
- Decide whether Layer 2c fires often enough to matter for cost (target: under 10 to 15 percent of generations).

**Exit criteria:** a one-page cost sheet with measured numbers, and a provider choice per surface. If all-in cost per spell exceeds roughly $0.08, revisit model tiering before building anything else.

## 5. Phase 1: Creation + Async Battles (the launch build)

**Goal:** a player can sign up in under a minute, create a spell, battle a real player's profile with it, and share the card. Detailed spec lives in the Phase 1 Build Plan v2.0.

In scope: Gateway, Lab, Game services; magic-link auth; Spark ledger (grants and spend only, no purchases yet); Two-Step Verification pipeline; 36 platform spells; async Open Brawl plus vs-System bot; playstyle vector; public spell preview with OG images; referral grants; moderation; analytics events.

Out of scope: payments, XP tracks, proficiency, Tower, Halls, friends, Live Duel, Freestyle, fusion, animations, arc quests.

**Gate 1 (move to Phase 2 only if most of these hold after 4 to 6 weeks of live use):**
- Signup to first-creation conversion at or above 50 percent
- First creation to share rate at or above 15 percent
- Day-7 retention at or above 15 percent among players who finished a first battle
- Viral coefficient (share-click to signup) measured; at or above 0.3 is encouraging, below 0.1 means the loop leaks and needs rework before spending on monetization
- Layer 2c trigger rate and moderation rejection rate inside budget
- No spell category or cast type with a battle win rate outside roughly 40 to 60 percent band after balancing pass

Thresholds are starting hypotheses, not facts. Adjust them once Phase 0 data exists, but write the adjusted numbers down before launch so results cannot be rationalized afterward.

## 6. Phase 2: Monetization

**Goal:** test whether people pay.

- Lemon Squeezy integration: subscriptions (Ember, Archmage), Spark packs, Founder's Pass, Chaosborn purchase
- Spark ledger purchase flow and rollover cap
- Non-generative cosmetics storefront (borders, frames, extra deck slots, priority research queue)
- Refund and chargeback handling policy
- Pricing experiments (pack sizes, first-purchase bonus)

**Gate 2:** paid conversion at or above 2 percent of active users, gross margin at or above 65 percent on measured COGS, refund rate under 5 percent. If conversion is under 1 percent, fix the creation-to-purchase moment before building progression.

## 7. Phase 3: Progression

**Goal:** give retained players a reason to stay for months.

Progression Service live (event-driven, Redis pub/sub). Three XP tracks, circle advancement through Circle 3 at first, spell proficiency tiers 1 to 3, Tower assessment batch cron (Two-Step Verified), Will growth events, Physical 1.5x battle-win multiplier, elemental affinity thresholds 1 to 3. Higher circles and thresholds ship as content once data shows players approaching them.

**Gate 3:** progression participants retain meaningfully better than non-participants at day 30.

## 8. Phase 4: Community and Social

Halls, friends, Spell Showcase, elemental and circle boards, Tower daily arcs (Part 1 lore drops double as shareable growth content), "Most Forked Concept" board, featured spell of the week. Moderation tooling expands (report flow, repeat-offender policy, appeals).

## 9. Phase 5: Competitive Layer

- **Live Duel** introduced only when concurrent usage makes a live queue resolve within an acceptable wait. Define the threshold operationally from Phase 1 to 4 data. Built on the same battle engine; only the opponent input source changes.
- Animus ranks become the Live Duel reward track.
- Freestyle Mode (the one LLM-cost battle surface), with session caps by tier and Two-Step Verification on each turn.

## 10. Phase 6: Full V1 Content

Elemental arcs, circle arcs, cross-element and terrain mastery arcs, remaining avatar unlocks, Free Mode, full onboarding polish, spell animations (feature flag on once revenue covers cost), remaining categories and cast types in creation if not already released as content drops.

## 11. V2 and Beyond

Fusion and multi-cast (Circle 4 feature), per-spell minigames, multiple simultaneous summons, Hall vs Hall events, replay sharing, community spell voting.

---

## 12. Sequencing Rules (apply to every phase)

1. Nothing ships that makes an AI call without Two-Step Verification and a Spark deduction path.
2. Nothing ships that lets an unauthenticated user trigger spend.
3. Progression can never be purchased. Spark buys creation capacity and cosmetics only.
4. Will stays hidden and unexplained in every phase. Tune the feedback strings, never the secrecy.
5. Every phase ends with a written gate result, pass or fail, before the next phase starts.

## 13. Open Questions That Affect Sequencing

- Whether payments should move into Phase 1 for a small paid beta (currently Phase 2 to keep launch scope tight; trade-off is slower learning on H3).
- The exact Live Duel concurrency threshold (set after real usage data).
- Whether to release additional creation categories as timed content drops (recommended: yes, as a retention and marketing beat).
