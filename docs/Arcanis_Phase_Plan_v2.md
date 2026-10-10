# Arcanis: Phase Plan v2.3

**Companion to: Arcanis Master Documentation v7.6 (the bible)**
**Status:** Commercial product. Supersedes the build order in the old Phased Build Plan v1.0 and Section 24 of Master Doc v6.0. File name keeps "v2" so links stay stable.

## What changed in v2.3 (2026-10-11)

Founder decisions on refinement (Master Doc v7.6, Sections 6.7 and 22.1):

- **Phase 1a scope adds mending** (refine an own spell for 1 Refinement Stone; a stone is minted by each Spark-paid creation) and example prompts in the Lab.
- **Phase 1b scope adds ascension** (refine a spell one tier up, for Spark, with full research, gated by the target tier's requirements). Design only until then.
- **Gate 1a definitions are unchanged (Section 5).** A mend is not a creation: it does not count toward "signup to first creation" or "day-7 creation retention". Mends are logged as their own events and reported beside the gate, not inside it.
- **Cost criterion (Section 5):** a creation can now be followed by at most one stone-paid mend, so the cost report also shows cost per mend and cost per Spark spent (creation plus mends). The $0.08 line applies to cost per Spark spent.

## What changed in v2.2 (2026-10-10)

Founder answers to the open founder actions (Master Doc v7.2):

- **Gate 1a thresholds locked (Section 5).** The starting values are confirmed as written. The cost criterion is measured at list price (shadow cost), because the soft launch runs on free-tier keys with $0 real spend.
- **Infrastructure:** the soft launch runs on one free Render instance kept awake by an external health-check ping (replaces the v2.1 paid-instance line below), Cloudinary for images, the current TiDB cluster, and free-tier provider keys. Cloudflare R2 and a new database host arrive in Phase 1b.
- **Phase 2 prerequisite (Section 6):** Lemon Squeezy verification is parked until after the soft launch.

## What changed in v2.1 (2026-10-09)

Founder decisions after the 2026-10-09 repo audit (`docs/status_report.md`):

- **Phase 0 status recorded (Section 4):** not done. Its measurements now run on the soft-launch traffic plus an offline corpus; the cost sheet is still required.
- **Phase 1 split into 1a and 1b (Section 5):** 1a is a creation-first soft launch (create, preview, share) once the soft-launch blockers in the Build Plan are fixed; 1b adds async battles, built in parallel. Phase 1 is complete only when 1b ships.
- **Creation-only Gate 1 (Section 5):** applies to 1a, with day-7 retention defined as "returned and created again". The battle-based Gate 1 applies once battles ship. Numeric thresholds are written here before launch.
- **k-factor definition fixed:** standard k = invites per user x invite conversion rate (Master Doc 23.6).
- **Fake-door Spark pricing (Section 5):** Phase 1a shows "coming soon" Spark pack tiles and logs intent, to get an early H3 signal without payments.
- **Phase 2 prerequisite (Section 6):** founder verifies Lemon Squeezy can onboard and pay out to an India-based seller; Paddle (MoR) is the fallback.
- **Infrastructure:** one paid Render instance for the modular monolith before soft launch.

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
| 1a | Creation soft launch | Create, preview, share with Spark ledger, magic-link identity, moderation, cost telemetry | R2, R3, H1 (creation half), H2 |
| 1b | Async Battles | Async Open Brawl, vs-System, server-scored minigames, playstyle vector | R1, R4, H1 (battle half) |
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

**Status (v2.1, 2026-10-09):** not done. No cost telemetry, cost sheet, provider comparison, harness or test corpus exists; the `phase0/` app is a creation prototype, not these deliverables. Revised approach: build per-call cost telemetry and the balance harness as Phase 1a blockers, run the offline corpus (100+ prompts) through the chosen providers before soft launch, then treat the soft launch as the real-traffic measurement. The $0.08 check is applied to the offline corpus before launch and re-checked on live data at Gate 1. v2.2: providers run on free tiers through the soft launch; the check uses list-price shadow cost, and the corpus run also records each provider's free quota, since quota, not money, is the soft-launch limit.

## 5. Phase 1: Creation + Async Battles (the launch build)

**Goal:** a player can sign up in under a minute, create a spell, battle a real player's profile with it, and share the card. Detailed spec lives in the Phase 1 Build Plan v2.1.

**Delivery order (v2.1):** battles were measured at about 10 to 15 percent complete versus 50 to 60 percent for creation and share, so Phase 1 ships in two steps:

- **Phase 1a, creation soft launch:** sign up, create, mend (v2.3), preview, share, referral, fake-door Spark pricing. Ships once every soft-launch blocker in Build Plan Section 15 is closed. Doubles as the real-traffic Phase 0 cost measurement.
- **Phase 1b, async battles:** built in parallel, on the same deployable, released to the same users when the Build Plan battle Definition of Done items pass. v2.3: ascension (Master Doc 6.7) ships here, once the tier gates it depends on exist.

Phase 1 is complete, and the full Gate 1 below can be evaluated, only after 1b.

**Fake-door Spark pricing (1a):** when a player hits zero Spark (and from the Spark balance chip), show Spark pack tiles with prices clearly marked "coming soon", log `spark_pack_intent` with the pack clicked, and offer a waitlist email opt-in. No Spark is granted for clicking (that would contaminate the signal). Click intent overstates real conversion, so read it as an upper bound on H3, not a measurement of it.

In scope: Gateway, Lab, Game modules (one deployable, see Build Plan Section 3); magic-link auth; Spark ledger (grants and spend only, no purchases yet); Two-Step Verification pipeline; 36 platform spells; async Open Brawl plus vs-System bot; playstyle vector; public spell preview with OG images; referral grants; moderation; analytics events.

Out of scope: payments, XP tracks, proficiency, Tower, Halls, friends, Live Duel, Freestyle, fusion, animations, arc quests.

**Metric definitions (v2.1, used by both gates):**
- *Signup to first creation:* accounts with at least one successfully stored spell within 24 hours of account creation, divided by accounts created.
- *First creation to share:* players whose first spell was shared (share action used, or its public preview opened by someone other than the owner) within 7 days, divided by players with a first creation.
- *k-factor:* invites per user x invite conversion rate. Invites per user = shares sent in the period / players active in the period. Invite conversion rate = signups attributed to a share link / shares sent. Measured weekly.
- *Day-7 creation retention (1a):* of players whose first creation was on day 0, the share who created at least one more spell on days 7 to 13. Requires a weekly free Spark allowance to be live; without one, this metric measures Spark exhaustion, not interest.
- *Mends (v2.3):* a mend (Master Doc 6.7) is never counted as a creation in any metric above. Reported separately: mends per creating player, and the share of creators who mend at least once.
- *Day-7 battle retention (1b):* of players who finished a first battle on day 0, the share active (battled or created) on days 7 to 13.

**Gate 1a, creation-only (evaluated after 4 to 6 weeks of soft launch). Locked by the founder on 2026-10-10:**
- Signup to first creation: at or above 50 percent
- First creation to share: at or above 15 percent
- k-factor: at or above 0.3 is encouraging; below 0.1 means the loop leaks and needs rework before monetization
- Day-7 creation retention: at or above 10 percent
- All-in cost per creation on live traffic: at or below $0.08 (v2.2: measured at provider list price while the soft launch runs on free-tier keys, so it predicts paid-tier cost; v2.3: measured per Spark spent, so the mends a creation pays for are inside the number)
- Layer 2c trigger rate at or below 15 percent of generations; moderation false-positive rate at or below 2 percent on the reviewed sample
- Fake-door `spark_pack_intent`: recorded per user who hit zero Spark (no threshold; informs Phase 2 priority)

**Gate 1, full (evaluated once battles ship; move to Phase 2 only if most hold):**
- All Gate 1a criteria
- Day-7 battle retention at or above 15 percent
- No spell category or cast type with a battle win rate outside roughly 40 to 60 percent after the balancing pass

Thresholds are starting hypotheses, not facts. Adjust them once offline Phase 0 data exists, but write the adjusted numbers down before launch so results cannot be rationalized afterward.

## 6. Phase 2: Monetization

**Goal:** test whether people pay.

**Prerequisite (v2.1):** the founder verifies that Lemon Squeezy will onboard an India-based seller and pay out to an Indian bank account, and confirms the tax paperwork it requires (GST registration, LUT for zero-rated exports, inward remittance documentation). If it fails, the fallback is Paddle (also a Merchant of Record). Razorpay is not a Merchant of Record and would mean handling global sales tax ourselves, so it is not a like-for-like fallback.

- Lemon Squeezy (or Paddle) integration: subscriptions (Ember, Archmage), Spark packs, Founder's Pass, Chaosborn purchase
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

- Whether payments should move into Phase 1 for a small paid beta (currently Phase 2 to keep launch scope tight; trade-off is slower learning on H3). v2.1: confirmed Phase 2; the fake door in Phase 1a gives an early, weaker H3 signal.
- The exact Live Duel concurrency threshold (set after real usage data).
- Whether to release additional creation categories as timed content drops (recommended: yes, as a retention and marketing beat).
