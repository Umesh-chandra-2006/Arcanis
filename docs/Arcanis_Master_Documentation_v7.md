__ARCANIS__

Game Design Document, Master Reference
*Complete Vision Blueprint | Version 7.1*

Author: Umesh Chandra Tirumani
Status: Architecture Complete | Phase 1 in progress | **Commercial Product**

*Formerly "Magic Spar." Renamed to Arcanis. Version 7.1 supersedes all prior versions, including v7.0 and v6.0. This is the authoritative reference document ("the bible") for the project. The file name keeps "v7" so links stay stable.*

---

## VERSION 7.1, WHAT CHANGED FROM v7.0 (2026-10-09)

Founder decisions taken after the 2026-10-09 repo audit (`docs/status_report.md`). Locked decisions are clarified, not reopened; Will secrecy is unchanged.

- **Will: capacity vs current Will (Section 2.1, clarification).** Will is two hidden numbers: *capacity* (absolute, 0 to 500, grows, gates tier access) and *current Will* (starts each battle at capacity, depleted per cast). State bands are now percentages of capacity, which fixes v7.0's absolute bands that put every new avatar (95 to 125 Will) in Strained from turn one. Exact tuning through the balance harness.
- **Will cost display (Sections 2.1, 6.5).** No numeric Will cost anywhere in the UI. The spell detail view shows a qualitative strain descriptor (Light, Moderate, Heavy) and nothing else about Will.
- **Hybrid Power Budget for spell stats (Sections 5.4, 6.3, 21.2).** Code computes a power budget from tier and classification; the LLM allocates stats within it; Layer 2a enforces the budget total and the caps. Prevents every spell with the same classification from being mechanically identical.
- **Research timer (Section 6.3).** First 2 spells per account skip the research wait. The timer is stored as a `research_ready_at` timestamp, not an in-process timer.
- **No assessment questions at creation until the Tower ships (Sections 5.4, 6.3).** Phase 1 creation does not generate Tower questions.
- **Minigame scoring and async piloting (Sections 11.2, 11.6).** The server scores minigames from raw input events. The piloted side samples its owner's stored performance per element group, blended toward the population median by sample size.
- **Identity (Section 18.1).** The magic-link email also carries a 6-digit code, for players whose email opens in an in-app browser. No passwords anywhere.
- **Onboarding (Section 18.2).** Signup goes straight to creation. The first battle comes later. The post-battle "Spell XP" reveal is removed.
- **Platform spell fix (Section 5.6).** Conflagration Wave is category Attack, cast type Continuous (v7.0 listed "Continuous" as its category).
- **Viral coefficient (Section 23.6).** Defined as the standard k-factor: invites (shares) per user x invite conversion rate.
- **Architecture (Sections 24, 25, 26).** Phase 1 ships as a modular monolith (one deployable, four internal modules matching the four services) on MySQL, with card images in object storage. Services split when load or team size requires it. Payments fallback recorded: Paddle (also a Merchant of Record).

**Still open after v7.1 (flagged, not resolved):** Section 2.1 Will cost ranges vs Section 6.2 Will floors/caps disagree (for example Advanced 30 to 60 vs 28 to 65); Section 18.2 avatar selection shows Will numerically, which conflicts with Section 2.1; Fusion Spark cost appears in Phase 0 scope while Fusion is V2.

---

## VERSION 7.0, WHAT CHANGED FROM v6.0

Arcanis is no longer positioned as a portfolio artifact. **It is being built as a revenue-generating product from day one.** This version reflects a full strategic pivot arrived at through deliberate market and design review. The systems below are new or fundamentally restructured relative to v6.0:

- **Async-first PvP** replaces live-queue matchmaking as the default battle experience (Section 11). Live PvP becomes a later, liquidity-gated premium layer, not a launch dependency.
- **Two-Step Verification** is now a standing architectural law applied to every AI-touched surface in the product, not just spell creation (Section 21).
- **The Dual Currency Economy** (Spark + Aether Shards) replaces the old rigid weekly-quota system with a real, purchasable creation economy (Section 22).
- **Identity-gated, friction-minimized onboarding** (magic-link, not anonymous) replaces the earlier "no login required" growth idea, closing a real cost-abuse vector (Section 18).
- **Growth & Virality System** is a new, first-class section, the spell card and battle result are treated as the primary acquisition engine (Section 23).
- **Subscription tiers are repriced**, the $24.99 recurring tier is retired in favor of a Founder's Pass, and Spark packs are introduced as a la carte monetization (Section 28).
- **Infrastructure strategy accepts real LLM/image-gen cost as COGS** rather than assuming free tiers hold at scale (Section 24, 25).

Everything not called out above, Circle System, Elements, Spell Classification, Terrain, Proficiency, Elemental Affinity, Fusion, Avatar System, Quest System, remains **locked and unchanged** from v6.0. Where a system is unchanged, it is reproduced here in full so this document remains a complete, standalone reference.

---

# 1. Vision and Product Goals

Arcanis is a full-stack competitive magic RPG platform built as a **commercial product**. Players build a mage character, craft original spells in a Lab using LLM assistance, battle other players and AI opponents, and grow through a multi-track progression system tied to elemental affinity, circle level, and individual spell mastery.

**The product's core differentiated asset is the creation loop, not the battle loop.** No product on the market currently lets players describe a spell in natural language and receive a unique, balanced, competitively-valid piece of game content in under a minute, complete with generated card art. Battles exist to prove the spell works and to give the creation act stakes, they are not, by themselves, the differentiator. Every downstream design decision in this document treats the creation loop as the product and the battle system as its proof surface.

## 1.1 Primary Goals

- Build a defensible, cost-disciplined AI content-generation loop as the core product experience
- Deliver a battle system with real competitive depth (HP, MP, Will, full classification system) that does not depend on live-player liquidity to feel alive at launch
- Build a real, purchasable creation economy (Spark) alongside a progression-driven soft economy (Aether Shards)
- Build a zero-CAC growth loop where generated content (spell cards, battle results) is the acquisition engine
- Apply two-step verification to every AI-generated output reaching a paying user
- Reach sustainable unit economics (target ~70-80% gross margin after real inference cost) before scaling spend
- Ship a Phase 1 that validates the creation loop and async battle loop with a trimmed, fast-to-learn feature surface

## 1.2 Non-Goals for V1

- Multi-cast and fusion mechanics (Circle 4+ feature, V2)
- Live-queue ranked PvP at launch (gated behind proven liquidity, see Section 11)
- Spell-specific minigames (V3)
- Items and consumables, lore narrative
- Full 10-category / 5-cast-type surface at first touch (trimmed onboarding scope, see Section 18 and companion Phase 1 Build Plan)
- Spell animations (deferred until first subscription revenue milestone)
- Anonymous, unauthenticated spell generation (see Section 18, identity is required before any generation, even though the funnel is near-frictionless)

## 1.3 Design Philosophy

Arcanis is built on an **"op at the start, opt into grind"** philosophy. Players get the full mechanical depth of spell creation and battle immediately, all spell types, all classification systems, no gates. Progression exists as an optional identity and mastery layer for players who want it, not as a requirement to experience the game's ceiling.

**A second, equally important philosophy governs the business layer: cost discipline is a design constraint, not an afterthought.** Every AI-touched surface must be verifiable at low cost before it is verifiable at high cost, and every generation the product performs must have a clear path to being paid for, directly or indirectly, by the player who requested it.

**A third philosophy governs progression secrecy specifically:** Arcanis is not a static, fully-legible game. Will is deliberately hidden and explained only through atmospheric, rotating qualitative feedback (see Section 2.1), the designer's explicit position is that players should do the work of understanding their own character, the same way the community collectively discovers the game's deeper systems over time. This is a locked, non-negotiable design decision.

## 1.4 Product Pillars (New)

1. **Creation is the hook.** The act of describing and receiving a spell must be satisfying standalone, with no other human required.
2. **Battles are always alive.** No player should ever face an empty queue. Async PvP guarantees this structurally (Section 11).
3. **Every generation is paid for.** No AI-touched surface should exist without a monetization or cost-recovery path attached (Section 22).
4. **Trust the system, not the model.** Players never see raw, unverified LLM output. Two-step verification is universal (Section 21).
5. **Growth is a byproduct of the product, not a separate marketing function.** Spell cards and battle results are the acquisition engine (Section 23).

---

# 2. Core Character Stats

| Stat | Description | Key Gate |
|---|---|---|
| HP | Player health. Reaches 0 = defeat. | Lose condition |
| MP | Fuel for casting. No passive regen. Managed via regen spells and strategic decisions. | Spell casting and maintenance |
| Will | Mental capacity. Hidden 0-500 internal scale. Never shown as number or bar. Never explained in UI. | Spell tier access, summon stability, fusion stability (V2), backlash resistance |

## 2.1 Will: Full Design

Will is quantified internally but never shown to the player. The game surfaces qualitative feedback only when Will crosses critical thresholds. Will can be regenerated via regen spells but this is NEVER disclosed. Players discover this mechanic themselves. Will is never explained anywhere in the UI, ever. **This is a firm, locked design decision, not open for reconsideration.** The designer's position: Arcanis is not a stagnant, static game but a broad, expanding environment; players are expected to do the actual work of understanding it, individually and as a community, rather than being handed a meter.

### Capacity and Current Will (clarified in v7.1)

Will is tracked internally as two numbers. Neither is ever sent to the client.

- **Capacity** is absolute (0 to 500 internal scale). It is set by the avatar's base Will, grows only through the Will Growth Sources below, never decays, and is the number that gates tier access and governs summon and fusion stability thresholds.
- **Current Will** starts each battle equal to capacity and is depleted by each cast's Will cost (after proficiency and terrain modifiers). Regen spells can restore it, never above capacity. It resets to capacity at the start of the next battle.

The battle state band is computed from current Will as a percentage of capacity, so a new avatar and a veteran both start every battle Sharp, and a veteran simply has more room before strain sets in. The server emits only the band key; the client receives feedback text, never the numbers or the percentage.

### Will States and Player Feedback

| Current Will as % of capacity | State | Player Feedback |
|---|---|---|
| 60% and above | Sharp / Sovereign | None. Clean casting. |
| 30% to under 60% | Focused / Steady | None. Full power. |
| 16% to under 30% | Strained | "Your thoughts feel heavy," "Focus slips at the edges" |
| 6% to under 16% | Failing | Knockoff cast. "The construct trembles," "Your vision swims" |
| under 6% | Broken | Spell fires and fails. MP consumed. "Your mind goes blank" |

Band edges are starting values; exact tuning is done through the balance harness (Phase 1 Build Plan Section 11). v7.0 used absolute bands (300+, 150 to 299, 80 to 149, 30 to 79, under 30), which placed every default avatar (95 to 125 Will) in Strained before its first cast.

### Feedback String Variant Pools (New, Locked Design)

To preserve the mystery, each Will-state band must draw from a **pool of multiple variant phrasings**, not a single fixed string. If "Strained" always produced the exact same sentence, attentive players would reverse-engineer it into a de facto numeric meter within days, defeating the purpose of hiding Will at all. Requirements:

- Minimum 6-8 unique phrasings per threshold band at launch, expanding over time as content updates.
- Selection is randomized per trigger, not sequential or deterministic, so the same player crossing the same threshold twice in one battle does not see a pattern.
- Phrasings are generated and reviewed like any other player-facing text asset, they pass through Two-Step Verification (Section 21) for tone and consistency before entering the live pool, since inconsistent tone would itself become a tell.
- Phrasings must remain purely atmospheric (sensory, narrative), never numeric, never comparative ("worse than before"), never explicitly named ("Will is low").

### Three Casting States

- Sufficient Will: spell fires at full power
- Below threshold but not critical: knockoff cast, reduced damage ceiling, slightly higher MP cost
- Critically low: spell fires and fails entirely, MP consumed, nothing happens

### Will Cost Per Spell Tier

| Tier | Will Cost Range | Notes |
|---|---|---|
| Basic | 10-25 | Physical spells have lower Will cost (body acts as natural conduit) |
| Advanced | 30-60 | Hybrid spells cost 20% more than single-category equivalent |
| Mega | 70-120 | Channeled and Continuous spells drain Will per turn of maintenance |
| Freestyle | 15-30 | No element modifier |
| Fusion (V2) | Sum of both + 20% surcharge | Both terrain and proficiency modifiers apply |

Will cost is never shown as a number. The spell detail view (Section 6.5) shows only a qualitative strain descriptor: **Light**, **Moderate**, or **Heavy**, derived server-side from the spell's Will cost relative to its tier range. The descriptor describes the spell, not the player, so it reveals nothing about the player's capacity or current Will.

### Proficiency Reduction on Will Cost

| Proficiency Tier | Name | Will Cost Reduction |
|---|---|---|
| 1 | Novice | Full cost |
| 2 | Practiced | -10% |
| 3 | Fluent | -20% |
| 4 | Mastered | -35% |
| 5 | Awakened | -50% |

### Will Growth Sources

- Circle-up: +25 Will
- Full arc quest completion: +15 Will
- Every 3rd spell reaching a new proficiency tier across roster (breadth bonus): +10 Will
- Close battle win sub-20% HP and MP simultaneously: +1 Will (max 3 per circle, resets on circle-up)
- Close battle win sub-10%: +2 Will (same cap)
- Close battle win sub-3%: +3 Will (same cap)
- Will does not decay. Will does not grow from proficiency tier advances directly.

**Critical:** Will growth is tied to depth and struggle, not volume. Rapid proficiency farming on one spell does not grow Will. Breadth across many spells plus real battle struggle does.

---

# 3. Circle System

*Unchanged from v6.0. Locked.*

Circles represent overall magical development. Maximum is 10. This is never disclosed to players. The game does not reveal a cap. Circle 7 is community-recognized as legendary rarity.

| Circle | Feel | Notes |
|---|---|---|
| 1-3 | Apprentice | Basic spells. Summon available from Circle 1. Smooth progression. |
| 4-5 | Journeyman | Advanced spells unlock. Multi-cast unlocks at Circle 4 (V2 only). |
| 6 | Adept | Near the ceiling most dedicated players reach. |
| 7 | Legend | Community-known rarity. Multi-year commitment. |
| 8-10 | Mythic | Effectively unreachable at V1 launch. |

## 3.1 Circle XP Sources

| Action | Circle XP |
|---|---|
| Spell creation in Lab (weekly-monthly capped) | 200 XP |
| Fusion research completion | 300 XP |
| Arc quest chapter completion | 400 XP |
| Arc quest full completion | 1,500 XP |
| Challenge quest completion | 500 XP |
| Animus battle win | 250 XP |
| Proficiency tier advance (any spell) | 150 XP |
| Tower daily arc participation (rank bracket) | 75-500 XP |
| Daily quest | 0 Circle XP |

## 3.2 Circle XP Thresholds

| Transition | XP Required | Additional Gate Conditions |
|---|---|---|
| 1 to 2 | 3,000 XP | None. |
| 2 to 3 | 12,000 XP | Min 3 spells at Proficiency Tier 2+ |
| 3 to 4 | 35,000 XP | 2 arc quests completed. Min 1 spell Tier 3. |
| 4 to 5 | 90,000 XP | Elemental Affinity Channeler (Threshold 3) in 1 element. Min 2 spells Tier 3+. |
| 5 to 6 | 200,000 XP | 1 Awakened spell. Circle 5 written + battle assessment required. |
| 6 to 7 | 500,000 XP | Element Mage title (Threshold 5) in 1 element. Circle 6 assessment required. |
| 7 to 8 | 1,500,000 XP | Element Lord title. 3 Awakened spells. Circle 7 assessment required. |
| 8-10 | Mythic. Unreachable at launch. | No conditions disclosed. |

## 3.3 Circle Assessments (Circle 5 onwards)

- Written: broad magic theory covering full spell roster, elemental choices, classification understanding, strategic decision-making. Tower batch reviewed. **Now subject to Two-Step Verification (Section 21.4).**
- Battle: defeat assessment mage of equivalent circle. No quest chain alternative from Circle 5.
- Circle 3 and 4 only: quest chain alternative to direct fight permitted.

---

# 4. Elements

*Unchanged from v6.0. Locked.*

| Group | Elements |
|---|---|
| Primal (classical) | Fire, Water, Wind, Earth |
| Ethereal (energy/mind) | Lightning, Void, Arcane, Light |
| Boundary (rare) | Shadow, Nature, Frost, Chaos |

## 4.1 Amicability Table

Governs multi-cast compatibility and fusion eligibility. Strong Affinity = highest fusion success base probability. Conflict = disintegration on fusion attempt.

| Element | Strong Affinity | Neutral | Tension | Conflict |
|---|---|---|---|---|
| Fire | Wind, Light | Lightning, Chaos | Frost, Earth | Water, Shadow |
| Water | Frost, Nature | Earth, Void | Lightning | Fire, Chaos |
| Wind | Fire, Lightning | Arcane | Earth | Water |
| Earth | Nature, Frost | Water, Shadow | Fire | Wind, Lightning |
| Lightning | Wind, Arcane | Fire, Light | Water, Nature | Earth |
| Void | Shadow, Arcane | Frost | Wind, Light | Any |
| Arcane | Light | Fire, Nature | Shadow | Lightning, Void |
| Light | Fire, Arcane | Nature, Wind | Shadow | Void, Chaos |
| Shadow | Void, Chaos | Earth, Frost | Light, Nature | Fire, Arcane |
| Nature | Water, Earth | Light | Shadow, Fire | Lightning, Chaos |
| Frost | Water, Earth | Shadow, Void | Fire, Wind | Lightning, Chaos |
| Chaos | Shadow, Fire | Lightning | Arcane, Nature | Water, Light, Frost |

---

# 5. Spell Classification System

*Unchanged from v6.0. Locked. Full system ships in Phase 1 per the companion Phased Build Plan, though the onboarding-facing subset shown to brand-new players is trimmed, see Section 18 and the Phase 1 Build Plan for sequencing.*

Every spell has two classification axes: Category (what the spell does) and Cast Type (how it is delivered). Both are assigned by the LLM at spell creation time and stored as tags, then run through Two-Step Verification (Section 21) before storage. Classification governs proficiency assessment questions, Tower arc scenarios, fusion compatibility scoring, terrain interaction mapping, and Will cost adjustments.

## 5.1 Axis 1: Category

| Category | Description | Circle Gate | Key Rules |
|---|---|---|---|
| Attack | Direct damage to opponent HP | Circle 1 | Standard damage. Most common category. |
| Defense | Reduces incoming damage or absorbs hits | Circle 1 | Can be Trap cast type for reactive defense. |
| Regen | Restores caster HP or MP | Circle 1 | Effectiveness scales with Mana Quality, circle level, elemental affinity. Terrain can double regen (Sanctum of Dawn). |
| Debuff | Reduces opponent stats, spell effectiveness, or Will | Circle 1 | Will debuffs are especially powerful. Can stack across turns. |
| Buff | Increases caster stats, damage ceiling, or cast efficiency | Circle 1 | Trap cast type buffs are powerful (trigger on your next offensive cast). |
| Drain | Damages opponent and returns portion as HP or MP to caster | Circle 1 | Return ratio is a spell stat. Channeled Drain is high-value high-risk. |
| Environmental | Reshapes terrain or alters battlefield conditions | Circle 1 | Primary source of terrain reshaping mechanic. Frost Field is the archetype. |
| Summon | Manifests a beast or spirit that persists and acts independently | Circle 1 | Always Continuous consumption type. Summon strength scales with circle, Will, Mana Quality, elemental affinity. Unstable if Will drops to Failing state. |
| Physical | Infuses mage body or weapon with elemental energy for direct combat | Circle 1 | Combat Mage category. Lower Will cost (body as natural conduit). |
| Hybrid | Combines two categories in one cast | Circle 2 | 20% higher Will cost than single-category equivalent. Max two categories. |

### Summon Category: Extended Rules

- All Summon spells are automatically Continuous consumption type. Cannot be Instant or Charged.
- Summoned entity has its own stat profile generated by LLM at spell creation: name, HP, attack rating, behavior set, element.
- If caster MP hits zero: summon dissipates immediately.
- If caster Will drops to Failing state: summon becomes unstable, deals reduced damage, chance of turning on caster (backlash).
- Summon strength scales with: circle level, caster Will, elemental affinity in summon element, Mana Quality.
- Circle 1 mage summons: weak elemental sprites, minor nature spirits, shadow wisps.
- Circle 6 mage summons: ancient entities with complex behaviors, legendary beasts, sovereign spirits.
- Multiple simultaneous summons require multi-cast (V2). V1: one summon active at a time.
- Summon available from Circle 1 because imagination should not be gated. The ceiling is high, the floor is accessible.

**Summon Mode System (locked design):**

The directives a summon can be given in battle are not a fixed global menu, they are derived directly from the skill set generated at spell creation. A glass-cannon summon with only damage skills only offers an attack directive. A support-built summon with heal and shield skills offers a support directive. The creator effectively defines the summon's available roles by how they describe it at creation.

- **Autonomous mode:** chosen at spell creation. At summon time in battle, the player assigns one directive (attack / defend / support, only options this summon's skill set actually supports are shown). The summon then executes that directive every turn on its own for the rest of the battle. Cannot be changed mid-battle.
- **Controlled mode:** chosen at spell creation. The summon has a separate, distinct skill set from the autonomous set. Each turn, the player actively chooses which skill the summon uses. If the player issues no command, the summon idles that turn.
- **Resource drain (applies to both modes):** Will and MP are consumed as a base maintenance cost every turn the summon is active, regardless of what it does. An additional Will and MP cost is drained each time the summon actually uses a skill, on top of maintenance.
- **Stat scaling:** Autonomous summons receive roughly 70-75% of the stat ceiling a Controlled summon of the same tier gets. The tradeoff is real: autonomous frees the player's attention at the cost of raw power; controlled costs attention and turn economy for a higher ceiling.

### Physical Category: Extended Rules

- Infuses caster body, limbs, or weapon with elemental or arcane energy.
- Damage type is still elemental (lightning-infused punch = lightning damage, benefits from lightning terrain).
- Physical Instant: single strike or burst.
- Physical Channeled: sustained combat stance or body infusion.
- Lower Will cost than equivalent tier spells because body acts as natural conduit.
- Cannot be Summon or Environmental category simultaneously.
- Proficiency grows faster through battle wins than raw cast count. Battle wins with a Physical spell as primary earn 1.5x proficiency XP compared to non-battle proficiency sources (Tower assessment, arc quests), which give standard XP. Combat Mages specialize by fighting, not studying.
- Enables a Combat Mage build: mage specializing in physical combat infused with magic.

## 5.2 Axis 2: Cast Type

| Cast Type | Cast Time | Description | Interruption |
|---|---|---|---|
| Instant | 200-800ms | Effect resolves immediately. Cannot be interrupted: too fast. | None |
| Trap | 500-1000ms setup | Set on caster turn, triggers on opponent action or specific condition. Can be dispelled by specific Debuff spells before triggering. | Dispel only |
| Charged | 1500-3000ms charge phase | 1 full turn buildup, releases amplified on next turn. Caster vulnerable during charge. | Damage above interruption threshold during charge turn cancels the charge entirely |
| Continuous | 300-600ms activation | Activates immediately, persists across turns. Caster pays maintenance MP and Will each turn. Released voluntarily or broken. | Damage above threshold OR Will drops to Failing state breaks the effect |
| Channeled | 1500-2500ms charge + sustain | Charged buildup with Continuous persistence. Higher ceiling than either alone. Interrupted during charge = full charge lost. | Same as Continuous plus charge phase is interruptible |

### Cast Time as a Spell Stat

Every spell has a `cast_time_ms` value generated by LLM at creation and clamped by the validation layer. In V1 turn-based context this governs animation timing and determines how quickly the spell can be set within a timed turn.

### Interruption System

Every Charged, Continuous, and Channeled spell has an `interruption_threshold` stat. If the caster takes a single hit exceeding this threshold while maintaining the spell, the spell is interrupted.

| Spell Tier | Interruption Threshold Range |
|---|---|
| Basic | 15-25 damage |
| Advanced | 25-40 damage |
| Mega | 40-60 damage |

### Interruption Consequences

- Charged spell interrupted: charge is lost entirely. Must restart next turn. Will penalty 5-15 depending on tier.
- Continuous spell interrupted: effect ends. Can be recast next turn if MP allows. Will penalty applied.
- Channeled spell interrupted: same as Continuous plus small backlash HP loss from collapsed channel.
- MP already spent on maintenance before interruption is lost regardless.
- This creates a tactical layer: opponent can build strategy around breaking Channeled spells. Caster can protect with Trap + Defense anticipation.

### Variable Damage for Continuous and Channeled

```
actual_damage = base_damage + (turns_maintained × scaling_factor) + (current_mp_percentage × mp_modifier) - (Will_penalty if below threshold)
```

- `scaling_factor` and `mp_modifier` are spell stats generated at creation.
- A Continuous spell maintained for 3 turns deals significantly more than one released after 1 turn.
- MP percentage matters: well-resourced caster extracts more than a depleted one.
- Makes MP management during sustained spells a genuine decision tree.

### Trap Spell System (locked design)

The trap's trigger condition is not chosen from a fixed enum, it emerges from the creator's description at spell creation, and the LLM assigns an appropriate condition based on that concept. This keeps trap identity tied to spell identity rather than a mechanical menu.

- **Visibility is the creator's choice at spell creation:** hidden (opponent sees nothing, learns it was a trap only after it triggers, indicated in the battle log) or visible (opponent sees a trap is set, not the condition).
- **Stat scaling is resource-based, not power-based.** A hidden trap never gets a damage or effect reduction. Instead:
  - Sustained (continuously maintained) traps: hidden costs more Will and MP per turn to sustain than the visible version of the same trap.
  - One-shot (non-maintained) traps: hidden costs a higher upfront Will and MP at the time of setting.
  - Effect power is identical between hidden and visible versions in both cases.
- Many trap types are valid since the condition is freeform, generated per spell concept.
- One trap slot active at a time. Opponent Debuff spells can dispel a set trap before it triggers.

## 5.3 Classification Interactions with Other Systems

| System | How Classification Affects It |
|---|---|
| Proficiency assessments | Tower questions are specific to category and cast type. Continuous spell assessment asks about maintenance cost management. Drain asks about return ratios. Physical asks about terrain exploitation. |
| Terrain modifiers | Sanctum of Dawn doubling regen applies to Regen category regardless of cast type. Shadow Labyrinth partial information hiding applies specifically to Trap spells. |
| Fusion compatibility | Amicability table governs element compatibility. Classification adds a second layer: two Continuous spells fused together carry higher disintegration risk. Two Attacks fuse cleanly. Buff + Attack creates natural Hybrid outcome. |
| Will costs | Hybrid spells cost 20% more. Physical spells cost less. Channeled and Continuous drain Will per turn of maintenance. |
| Summon instability | When caster Will drops to Failing range, all active summons become unstable regardless of element or tier. |
| Tower daily arc challenges | Scenarios specify category and cast type requirements. "The opponent has set a Trap spell. You are about to cast a Charged spell. What is the risk?" |
| Async opponent AI (new) | The rule-based async combat engine (Section 11) reads a spell's classification tags directly to decide when a piloted profile would plausibly use it, e.g., an aggression-weighted profile favors Attack/Charged, a resource-disciplined profile favors Regen/Defense. |

## 5.4 LLM Spell Creation Output Schema

Generated by Layer 1 (Section 21), then clamped and checked by Layer 2 before storage.

**v7.1, Power Budget:** before the Layer 1 call, code computes a power budget from tier, element, primary/secondary category and cast type. The prompt gives the model that budget, and the model allocates it across the numeric fields (damage range, MP cost, Will cost, cast time, maintenance cost, interruption threshold, and so on) to fit the described concept. Layer 2a then enforces both the per-field caps (Sections 5.5, 6.2) and the budget total, rescaling an over-budget allocation proportionally. `assessment_questions` is omitted from the Phase 1 schema; it returns when the Tower ships (Section 6.3).

```json
{
  "name": "string",
  "damage_min": "number",
  "damage_max": "number",
  "mp_cost": "number",
  "will_cost_min": "number",
  "will_cost_max": "number",
  "circle_required": "number",
  "behavior_type": "string",
  "flavor_text": "string",
  "lore_line": "string",
  "minigame_type": "string",
  "research_complexity_score": "number",
  "assessment_questions": {
    "tier_2": "string[10]",
    "tier_3": "string[10]",
    "tier_4": "string[10]",
    "tier_5": "string[10]"
  },
  "primary_category": "string",
  "secondary_category": "string | null",
  "cast_type": "string",
  "cast_time_ms": "number",
  "maintenance_cost_per_turn": "number | null",
  "interruption_threshold": "number | null",
  "scaling_factor": "number | null",
  "mp_modifier": "number | null",
  "summon_profile": {
    "summon_name": "string",
    "summon_hp": "number",
    "summon_attack_rating": "number",
    "summon_behavior": "string",
    "summon_element": "string",
    "mode": "autonomous | controlled",
    "behaviors": "array"
  },
  "is_physical": "boolean",
  "physical_delivery": "string | null",
  "trap_condition": "string | null",
  "trap_visibility": "visible | hidden | null"
}
```

## 5.5 Summon Profile Stat Caps

Validation layer caps for summon stats per spell tier. Prevents LLM generating broken summons.

| Spell Tier | Summon HP Range | Attack Rating Range | Max Behaviors |
|---|---|---|---|
| Basic | 20-60 | 5-15 per turn | 1 simple behavior (attack or defend) |
| Advanced | 60-150 | 15-35 per turn | 2 behaviors (attack + one special) |
| Mega | 150-400 | 30-80 per turn | 3 behaviors (attack + two specials) |

## 5.6 36 Platform Base Spells: Full Classification

| Element | Spell | Primary Category | Cast Type | Notable |
|---|---|---|---|---|
| Fire | Ember Lance | Attack | Instant | Standard fire projectile |
| Fire | Conflagration Wave | Attack | Continuous | Variable damage, interruptible, spreads per turn (category corrected in v7.1) |
| Fire | Solar Collapse | Attack | Charged | Interruptible during charge turn |
| Water | Tidal Strike | Attack | Instant | Reliable damage |
| Water | Undertow Bind | Debuff | Instant | Reduces opponent spell effectiveness |
| Water | Abyssal Surge | Attack | Instant | High damage burst |
| Wind | Gale Slash | Attack | Instant | Fast, lower Will cost |
| Wind | Vortex Cage | Debuff | Channeled | Variable debuff strength, interruptible |
| Wind | Tempest Collapse | Attack | Charged | Atmospheric implosion |
| Earth | Stone Fist | Physical | Instant | Combat Mage. Earth-infused strike. Lower Will cost. |
| Earth | Tremor Field | Environmental | Instant | Ground disruption, terrain interaction |
| Earth | Tectonic Ruin | Attack | Charged | Catastrophic physical damage |
| Lightning | Spark Bolt | Attack | Instant | Fastest cast of all Basic spells |
| Lightning | Chain Arc | Attack | Continuous | Jumps between targets, variable damage |
| Lightning | Thunderclap Sovereign | Attack | Instant | Maximum atmospheric discharge |
| Void | Null Touch | Drain | Instant | Drains MP alongside HP damage |
| Void | Void Fracture | Hybrid (Attack+Debuff) | Instant | Tears rift, reduces next opponent damage output |
| Void | Oblivion Pull | Hybrid (Attack+Debuff) | Charged | Partially drags opponent into void |
| Arcane | Arcane Bolt | Attack | Instant | No elemental weakness or bonus, reliable baseline |
| Arcane | Runic Amplifier | Buff | Trap | Triggers on caster next offensive cast, amplifies it 25% |
| Arcane | Spell Cascade | Attack | Channeled | Three consecutive bolts, variable total damage |
| Light | Radiant Strike | Attack | Instant | Pure light beam |
| Light | Aura Veil | Defense | Trap | Triggers on opponent attack, reduces incoming damage 30% |
| Light | Divine Convergence | Hybrid (Attack+Debuff) | Charged | Reduces opponent accuracy next turn |
| Shadow | Shadow Grasp | Drain | Instant | HP drain with tendrils |
| Shadow | Umbral Cloak | Defense | Instant | Immediate damage reduction for current turn |
| Shadow | Soul Devour | Drain | Channeled | Variable drain return per turn, interruptible |
| Nature | Thorn Whip | Attack | Instant | Striking vine projectile |
| Nature | Verdant Surge | Hybrid (Attack+Regen) | Instant | Damages and heals caster simultaneously |
| Nature | World Root | Summon | Continuous | Summons a root entity. First platform summon spell. |
| Frost | Ice Shard | Attack | Instant | Piercing ice projectile |
| Frost | Frost Field | Environmental | Continuous | Lowers temperature, shifts terrain state toward Frost |
| Frost | Glacial Entombment | Hybrid (Attack+Debuff) | Charged | Encases opponent, reduces Will for one turn |
| Chaos | Entropy Bolt | Attack | Instant | Randomized damage in wide range. Unpredictable. |
| Chaos | Reality Crack | Hybrid (Attack+Environmental) | Instant | Damages and cracks reality slightly, minor terrain shift |
| Chaos | Unraveling | Attack | Instant | Enormous range. Highest ceiling, lowest floor in the game. |

---

# 6. Spell System

*Unchanged from v6.0. Locked.*

## 6.1 Tiers

| Tier | MP Cost | Circle Required | Will Range | Notes |
|---|---|---|---|---|
| Basic | 8-20 MP | Circle 1 | 10-25 | One platform spell per element in base pool |
| Advanced | 20-45 MP | Circle 3 | 30-60 | Craftable from Channeler affinity (Threshold 3) |
| Mega | 40-80 MP | Circle 5 | 70-120 | Craftable from Element Mage affinity (Threshold 5) |
| Freestyle | 13-17 MP | None | 15-30 | User types any move. No LLM in battle. |

## 6.2 Hard Stat Caps (Validation Layer)

| Tier | Damage Range | MP Floor | MP Cap | Will Floor | Will Cap |
|---|---|---|---|---|---|
| Basic | 10-40 | 8 | 20 | 10 | 25 |
| Advanced | 35-90 | 20 | 45 | 28 | 65 |
| Mega | 80-200 | 40 | 80 | 65 | 130 |
| Freestyle | 5-50 | 13 | 17 | 13 | 32 |

These caps are enforced by Layer 2a of Two-Step Verification (Section 21.2), deterministic, zero-LLM-cost clamping applied to every numeric field the generation model produces.

## 6.3 Spell Creation Flow

- Player inputs: spell name, element, description (flavor only, no mechanical weight). Color and aesthetic are emergent from spell identity not forced by element. A black fire spell generates dark obsidian art. A crimson blood water spell generates deep red fluid art.
- Code computes the spell's power budget from tier and classification (Section 5.4). LLM (Layer 1) then generates simultaneously: a stat allocation within that budget, classification fields, summon profile if applicable, flavor/lore text, research_complexity_score.
- Assessment questions (10 per tier) are **not** generated at creation until the Tower ships (Phase 3). When it does, a Two-Step Verified batch job backfills questions for existing spells.
- Output passes through full Two-Step Verification (Section 21) before storage.
- Image generation fires in parallel: spell card art via paid FLUX-class inference. Prompt derived from spell name, flavor text, lore line, and classification. Generated image also passes moderation (Layer 2b).
- Fusion spells: same flow, dual-element image prompt. Both constituent elements present in art.
- Research time: stopwatch only. No countdown. No time disclosed. Scales with research_complexity_score. Stored as a `research_ready_at` timestamp on the spell, so it survives restarts and needs no in-process timer.
- **First 2 spells per account skip research entirely** (v7.1): they are usable as soon as generation and verification finish. The real generation time (roughly 10 to 30 seconds) is presented as the forging moment. This keeps the first session's payoff inside the first minute.
- First 3 spells if above requirements: stored locked. "This spell awaits your growth." No restriction language.
- **Every creation consumes Spark** (Section 22). Creation cannot be initiated without sufficient Spark balance.

## 6.4 Creation Allowances (formerly "Lab Slot Limits")

Replaced by the Spark system, see Section 22 for the full economy. Subscription tiers grant a weekly/monthly Spark allowance rather than a fixed, non-purchasable slot count. This preserves the original per-tier value while making the exact same allowance flexible and top-uppable.

## 6.5 Spell Card Design (locked)

The spell card is the primary UI unit for displaying a spell, both in-game (collection grid, deck builder, battle UI) and as the primary **growth/acquisition asset** for the product (Section 23).

**Layout:**
- Dominant area: the generated image, roughly 55% of card height
- Bottom panel with dark gradient overlay: spell name (large, stylized), a one-line flavor/lore text (never stats)
- Corner: element icon (small, top-right)
- Border: tier-communicated via border complexity, not color
  - Basic: simple solid border
  - Advanced: layered/textured border
  - Mega: triple border with energy-glow effect
  - Freestyle: visually distinct border, separate from the tier ladder
- Border and accent color derived from the spell image's dominant color, not a fixed element palette

**What's never on the card:** damage numbers, MP cost, Will cost, proficiency tier. Stats stay in-game, accessible by clicking the card to open full spell info. The card is identity, not a stat sheet.

**Spell detail view (v7.1):** shows damage range, MP cost, classification and cast time. Will appears only as the strain descriptor (Light, Moderate, Heavy; Section 2.1), never as a number, range, bar or icon count, here or anywhere else in the UI.

Card aspect ratio is set by in-game UI context (portrait, trading-card-like), not fixed to a social media square. **The public share/preview surface (Section 23) generates a properly-sized Open Graph image variant automatically so the card renders correctly when shared externally**, this is a distinct rendering target from the in-game UI card, not the same asset reused.

## 6.6 Spell Animations (Deferred Until Revenue)

Built in codebase behind feature flag. Activates at a defined subscription-revenue milestone. First 3 per account free lifetime.

Animation sequence: Phase 1 (0.8s) - magic circles appear around caster, element-colored, rotating, rune-marked. Phase 2 (0.7s) - spell manifests from circle center in classification-appropriate form. Phase 3 (1.5s) - spell travels with element trail. Phase 4 (1s) - impact shockwave, HP drain animation. The magic circle is the visual signature across all spells.

---

# 7. Spell Proficiency System

*Unchanged from v6.0. Locked.*

| Tier | Name | Spell XP Required | Cast Minimum | Assessment |
|---|---|---|---|---|
| 1 | Novice | 1,000 XP | 40 casts | None |
| 2 | Practiced | 4,000 XP | 100 casts | 1 question, 6h Tower batch |
| 3 | Fluent | 12,000 XP | 250 casts | 3 questions, 6h batch |
| 4 | Mastered | 35,000 XP | 600 casts | 5 questions, 6h batch |
| 5 | Awakened | 100,000 XP | 1,500 casts | 10 questions (full pool). Requires Elemental Affinity Threshold 3 in spell element. |

## 7.1 Tower Assessment System

- Assessment questions stored as 2D array: `{ tier_2: string[10], tier_3: string[10], tier_4: string[10], tier_5: string[10] }`. Generated by LLM at spell creation, subject to Two-Step Verification.
- Questions cover: element behavior, classification category behavior, cast type mechanics, terrain interactions, strategic use cases, failure conditions. At least 2 questions per tier specifically about category and cast type.
- Free-text answers submitted to Tower. Batch-evaluated by LLM every 6 hours (up to 50 answers per batch). **Grading pass is itself a Two-Step Verification surface**, see Section 21.4.
- Result: one word only. Pass or Fail. The Tower does not explain.
- Fail: -150 Spell XP, cast count reset to 55-75% of tier minimum, cooldown before reapplication.
- No Elemental XP ever deducted. Understanding cannot be un-learned.

## 7.2 Fail Cooldowns

| Tier | Fail Timer | Min Additional Casts Before Reapplication |
|---|---|---|
| 2 | 12 hours | 30% of tier requirement |
| 3 | 24 hours | 40% |
| 4 | 48 hours | 60% |
| 5 | 72 hours | 75% |

## 7.3 Awakened (Enhanced) Spells

- Proficiency Tier 5 + Elemental Affinity Threshold 3 (Channeler) minimum in spell element.
- Mega-tier Awakened requires Elemental Affinity Threshold 5 (Element Mage).
- Increased damage ceiling, reduced MP cost, unique visual modifier in battle.
- Eligible as dominant spell in fusion (enhanced spells lead, not follow).
- Enhanced Summon spells: summoned entity gains upgraded stats and an additional behavior.
- Enhanced Physical spells: deal additional elemental status effect on hit.

---

# 8. Elemental Affinity System

*Unchanged from v6.0. Locked.*

Elemental affinity is earned through behavior, not chosen. A player becomes a Fire Mage because they fight, craft, and specialize in fire consistently. The identity is earned, never assigned.

| Action | Elemental XP |
|---|---|
| Win battle with element as primary | 100 XP |
| Create spell of element in Lab | 150 XP |
| Proficiency tier advance in element spell | 120 XP |
| Complete elemental arc chapter | 200 XP |
| Complete full elemental arc | 800 XP |
| Conflict element penalty (high-affinity mage casting low-proficiency conflicting element spell) | -25 XP rate reduction per session (rate slowdown only, never a deduction) |

## 8.1 Affinity Thresholds (7 per element)

| Threshold | Title | Elemental XP Required | Gate | Unlock |
|---|---|---|---|---|
| 1 | Spark of [Element] | 1,000 XP | None | Basic spells of element available in Lab |
| 2 | Attuned | 5,000 XP | 2 spells of element at Tier 2+ | Minigame favorable modifier. Regen bonus. |
| 3 | Channeler | 15,000 XP | Element arc Ch. 1-3 completed | Advanced spell creation. Affinity on profile. Gate for Awakening spells. |
| 4 | Conduit | 40,000 XP | 1 spell at Tier 4 | Fusion bonus (V2). Title in battle UI. |
| 5 | [Element] Mage | 100,000 XP | 1 Awakened spell + full elemental arc | Public title. Badge. Mega spell creation. |
| 6 | [Element] Lord | 300,000 XP | 3 Awakened spells + Circle 6 | Enhanced spells gain damage ceiling. Conflict penalties halved. |
| 7 | [Element] Sovereign | 1,000,000 XP | Element Lord + Circle 7 | Legendary. Sovereign-tier spell. Exclusive profile frame. Mythic. |

**Note on naming:** "Spark of [Element]" (Threshold 1 title) is a pre-existing term unrelated to the Spark creation-currency introduced in Section 22. No mechanical or systemic overlap; naming collision only. Flagged here to avoid confusion during implementation, consider a cosmetic rename of the Threshold 1 title in a future content pass if it causes player-facing confusion (not urgent, purely a naming hygiene note).

---

# 9. Fusion System (V2)

*Unchanged from v6.0. Not built in Phase 1. Locked design, ready for V2.*

Fusion is V2. No player reaches Circle 4 on V1 launch. All design below is locked and ready for V2 implementation.

## 9.1 Multi-Cast

- Unlocks at Circle 4. Requires sufficient Will score.
- Double-cast, triple-cast, quadra-cast gated by Will score.
- Cost strictly additive: sum of all spell MP costs, no discount.
- Incompatible elements or insufficient Will: disintegration, backlash to caster.
- Two Continuous or Channeled spells in multi-cast carry extra disintegration risk.

## 9.2 Fusion Flow and Compatibility

- Lab feature only. Player pre-declares fusion pair. Logic layer checks amicability table AND category compatibility.
- Incompatible element pair: rejected immediately. No LLM call.
- Compatible: enters fusion research queue. LLM generates fusion spell including dual-element card image. Full Two-Step Verification applies.
- Category compatibility layer: two Continuous spells = higher disintegration risk. Two Attacks = clean fusion. Buff + Attack = natural Hybrid outcome.
- Random fusion: Lab option checking database first. If pair exists: stored result, reduced wait. If not: fails, no LLM call, no Spark consumed.
- Spells are never deleted. Awakened spells get separate fusion registry from pre-awakened version.
- Summon + Attack fusion: generates a combat summon that also damages on arrival. Requires both spells to be Awakened.

---

# 10. Terrain System

*Unchanged from v6.0. Locked.*

Every battle takes place on a terrain. Terrain affects three spell parameters simultaneously: damage output, MP cost, and proficiency effectiveness. Effect is spell-specific and dynamic. Terrain reshaping mechanic allows skilled mages to shift terrain state temporarily.

| Interaction | Effect |
|---|---|
| Spell amplifies terrain element | Damage +15%, MP -10%, proficiency effectiveness +10% |
| Spell neutral to terrain | No modifier |
| Spell partially resists terrain | Partial decrement reduction |
| Spell directly opposes terrain | Standard decrement. Spell still functions. |
| Spell reshapes terrain | Micro-terrain shift for 2 turns toward spell element. Subsequent matching spells get bonus. |

## 10.1 Terrain Roster (15 Terrains)

| Terrain | Primary Element | Opposes | Special Property |
|---|---|---|---|
| Volcanic Rift | Fire | Frost, Water | Lava pools deal passive damage to grounded spells |
| Abyssal Depths | Water | Fire, Lightning | Electrical spells risk backfire |
| Storm Peaks | Wind | Earth | Projectile spells get range bonus |
| Stone Barrow | Earth | Wind, Lightning | Shield and barrier (Defense) spells get durability bonus |
| Thunder Wastes | Lightning | Earth, Water | Speed-based (Instant) spells get bonus |
| Void Rift | Void | Light, Nature | Void spells ignore terrain resistance entirely |
| Arcane Spire | Arcane | Chaos | Spell complexity increases damage ceiling |
| Sanctum of Dawn | Light | Void, Shadow | Regen category spells doubled in effectiveness |
| Shadow Labyrinth | Shadow | Light, Arcane | Opponent Trap spell information partially hidden |
| Verdant Overgrowth | Nature | Shadow, Chaos | Regen spells cost less MP |
| Glacial Expanse | Frost | Fire, Lightning | Layered Continuous frost spells compound exponentially |
| Chaos Crucible | Chaos | Arcane, Light | All spell stats randomized slightly each cast |
| The Neutral Grounds | None | None | No modifiers. Pure skill. Formal Animus matches. |
| Ruined Colosseum | None | None | Minor random element bonus shifts each round |
| The Astral Plain | Rotating | Rotating | Random element boosted each round. Chaos-friendly. |

---

# 11. Battle System, Async-First (MAJOR REVISION)

This section is the single largest structural change from v6.0. The battle system's mechanical depth (classification, terrain, interruption, summons, traps) is entirely unchanged, a battle turn resolves exactly as previously specified. **What changes is who or what makes the opponent's decisions, and it changes for a specific, deliberate reason: a live-queue-only PvP game requires liquidity (enough concurrent players to make a queue feel alive) that a launching product does not have.** Async PvP removes that dependency structurally rather than hoping for it.

## 11.1 The Liquidity Problem, and Why Async Solves It

A traditional live-PvP queue is only fun if an opponent is available within seconds. Below a real concurrency threshold, queues sit empty, matches feel stale, and players churn before the social/competitive loop ever gets a chance to work. Arcanis cannot assume launch-day concurrency sufficient to support this. Async PvP guarantees a populated, plausible opponent at any scale, 10 concurrent users or 10,000, because the "opponent" is drawn from a database of stored player decks, not from who happens to be online right now.

## 11.2 How Async Combat Works

- Every player has a **combat profile**: their current deck, plus a **playstyle vector** derived automatically from their own battle history, no manual configuration, no LLM cost.
  - **Aggression:** relative frequency of Attack/Charged category-and-cast-type picks vs. Defense/Regen.
  - **Risk tolerance:** relative usage rate of Continuous/Channeled (sustained, interruptible) spells vs. Instant.
  - **Resource discipline:** average MP/Will spent per turn relative to available pool.
- When Player A queues for Open Brawl, the system selects a **stored profile** (Player B's real deck + vector) from the matchmaking pool.
- **Player B's opponent-side turns are piloted by the existing rule-based combat engine** (the same engine originally specified for the "vs. System" bot), weighted by B's playstyle vector and constrained to B's actual owned deck. This means Player A is genuinely fighting "the way Player B plays," using spells Player B actually created or owns, just without Player B needing to be online.
- **Minigame performance on the piloted side (v7.1).** A human's damage depends on their minigame result, so the piloted side needs one too, or async battles become asymmetric. The server keeps every player's server-scored minigame results per element group. For the piloted side, it samples from the owner's stored results for that group, blended toward the population median for that group with weight n/(n+10), where n is the owner's sample count. A new player with no history is piloted at the population median; a veteran is piloted at roughly their own skill. Only server-scored results (Section 11.6) enter these distributions.
- **This incurs zero LLM cost.** The async opponent is not an AI-generated entity in the LLM sense; it is deterministic rule-based logic reading real stored data. The only LLM-cost battle surface in the entire product is Freestyle Mode (Section 12), which is already session-capped by design.
- Profiles refresh on deck edit, and periodically thereafter, so no player is ever permanently fighting a stale ghost of someone who quit the game a year ago.
- Turn structure, terrain, interruption, summon resolution, and trap mechanics all resolve exactly as specified in Sections 5 and 10, async changes only the opponent's decision source, nothing about how a turn is computed.

## 11.3 Rematch / Re-engagement Loop

When Player A defeats Player B's profile, **Player B receives a notification**: "[Player A] just defeated your deck. Rematch?" This costs nothing to run and functions as a return trigger even for players who are offline the overwhelming majority of the time, the core mechanism by which async PvP sustains re-engagement without live infrastructure pressure.

## 11.4 Battle Types

| Type | Description | Opponent Source | XP Recorded |
|---|---|---|---|
| vs. System | Solo AI opponents (generic rule-based deck). Primary onboarding path. | Rule-based, non-player | Yes |
| Open Brawl (Async) | Default multiplayer mode at launch. No restrictions. Casual. | Stored player profile, rule-based piloting | Yes |
| Animus (Live, later) | Ranked multiplayer using a real, currently-online opponent. **Gated behind proven liquidity, not built at launch.** See Section 11.5. | Live human | Yes |
| Quests | Structured challenges. | Rule-based | Yes |
| Free Mode system | Sandbox AI. No progression. | Rule-based, non-player | No |
| Free Mode multiplayer | Sandbox PvP, async. Community recorded. | Stored player profile | Yes (no XP) |
| Freestyle Mode | Pure imagination battle. LLM judges. Separate mode. **The one real LLM-cost battle surface, session capped.** | LLM-narrated | Win/loss only |

## 11.5 Live Duel, Later, Liquidity-Gated Premium Layer

Live, truly real-time PvP is **not abandoned, it is sequenced correctly.** Once concurrent usage reaches a level where a live queue would actually resolve in reasonable time (a specific concurrency threshold to be defined operationally once real usage data exists), Live Duel is introduced as a **prestige/ranked layer**, with Animus rank (Section 11.7) becoming its reward track. Async Open Brawl remains the default, everyday battle mode permanently, Live Duel is additive, not a replacement.

## 11.6 Turn Structure

*Unchanged mechanically from v6.0:*

- Each turn is timed.
- Player selects spell or sets a Trap if cast type allows.
- Trap spells set in a trap slot and do not consume turn action when they trigger.
- Minigame triggers based on spell element (element-group minigames for V1, see companion Phase 1 Build Plan).
- Minigame outcome determines actual damage within spell damage range. **The server scores the minigame (v7.1):** it issues the seed and timing windows, the client sends raw input events, and the server computes accuracy and rejects implausible input. A client-reported accuracy number is never trusted.
- Terrain modifiers applied: damage, MP cost, proficiency effectiveness, Will cost.
- If opponent action triggers interruption threshold on caster's active Continuous/Channeled/Charged spell: interruption resolves.
- HP/MP/Will updated. Summon actions resolve if active. Win condition checked.

## 11.7 Animus Ranks

| Rank | Name |
|---|---|
| 1 | Ignotus |
| 2 | Discipulus |
| 3 | Cantor |
| 4 | Invocator |
| 5 | Magus |
| 6 | Archmagus |
| 7 | Aeternus |

## 11.8 Disconnect Handling

- Turn timer expires: auto-selects random Instant spell from deck at minimum damage (Continuous/Channeled collapse safely).
- Disconnect 60+ seconds: forfeit. Ranked/Live = loss + full XP to opponent. Async matches have no disconnect concept for the opponent side by definition (the opponent is never "connected" in the first place), disconnect handling applies only to the live human player's own connection.

---

# 12. Freestyle Battle Mode

*Unchanged from v6.0. This remains the one deliberate exception to the "battles are free/rule-based" principle in Section 11, it is the single real LLM-cost battle surface in the product, and it stays tightly session-capped for exactly that reason.*

Standalone third mode. Pure imagination battle. No spell deck, no HP/MP/Will numbers, no affinity, no proficiency, no XP, no classification constraints. Two mages enter, one wins. The LLM is the sole judge and narrator.

| Feature | Specification |
|---|---|
| HP | 100 narrative HP per side. LLM scores damage each turn. |
| MP / Will | Non-existent in Freestyle Mode. Pure imagination. |
| Stats | None. The outcome is entirely LLM-scored, subject to Two-Step Verification (Section 21.4) on each turn's judgment. |
| Turn limit | 10 turns hard cap. Lower HP side loses if neither reaches 0 by turn 10. LLM escalates damage in turns 8-10. |
| Terrain | Applies. Setting message fires at battle start (cached per terrain). |
| Affinity / Proficiency | None. Irrelevant in Freestyle Mode. |
| XP | None awarded. |
| Recording | Win/loss recorded for community flex only. |
| Free tier sessions | 3 per day |
| Subscriber sessions | Ember: 5/day. Archmage+: unlimited. |

## 12.1 Skill Level Selection

| Level | Name | Persona | LLM Behaviour |
|---|---|---|---|
| 1 | Wandering Apprentice | "Aldric stumbles forward, enthusiasm outpacing skill." | Basic moves, generous to player |
| 2 | Journeyman Mage | "Sera holds her ground, eyes calculating." | Balanced, adapts slightly |
| 3 | Veteran Archmage | "Draveth smiles. He has seen a thousand mages like you." | Aggressive, exploits terrain, escalates fast |
| 4 | Sovereign | "The figure does not speak. The air around them bends." | Ruthless, maximum pressure, very hard to beat in 10 turns |

---

# 13. Avatar System

*Unchanged from v6.0. Locked.*

| Avatar | HP | MP | Will | Starting Affinity Bonus | Unlock |
|---|---|---|---|---|---|
| The Ashen (basic) | 100 | 100 | 100 | All elements +3% | Default |
| Emberveil | 90 | 110 | 100 | Fire +25% | Default |
| Tidecaller | 95 | 120 | 95 | Water +25% | Default |
| Galeborn | 85 | 105 | 115 | Wind +25% | Default |
| Stonewarden | 120 | 90 | 95 | Earth +25% | Default |
| Voidwalker | 80 | 115 | 120 | Void +20%, Shadow +15% | Circle 5 |
| Dawnbringer | 90 | 110 | 125 | Light +20%, Arcane +15% | Earn any Element Mage title |
| Chaosborn | 95 | 105 | 110 | Chaos +30%, all others -8% | Paid unlock |

- Affinity bonus is permanent for that avatar but front-loaded. Tapers as earned affinity dominates.
- Multiple avatar alts allowed. Each starts from Circle 1, zero XP. No progress transfers between alts.
- Creating new alt: costs Aether Shards + 14-day cooldown. Switching active alt: no cooldown.
- Free Mode avatars: same roster, stats apply per session, do not persist.
- **Chaosborn is now purchasable directly via storefront rather than manual contact form**, see Section 28.

---

# 14. XP Economy

*Unchanged from v6.0. Note the explicit distinction from the Section 22 Spark/Aether Shard currencies below: XP tracks are pure progression and are never purchasable, spendable, or transferable. This separation is intentional and load-bearing, progression cannot be bought, only creation capacity and cosmetics can.*

Three independent XP tracks. No generalized XP. Every XP point belongs to a specific track.

| Track | Governs | Primary Sources |
|---|---|---|
| Circle XP | Circle level | Arc quests, Animus wins, Lab creation (capped), Tower arcs (ranked) |
| Spell XP | Spell proficiency tier | Every cast of that spell, battle wins with it (bonus), Tower pass (milestone) |
| Elemental XP | Elemental affinity threshold | Battles with element as primary, Lab creation, proficiency advances, arc completions |

| Action | Spell XP |
|---|---|
| Every cast | 15 XP |
| Battle win using spell as primary | +40 XP bonus |
| Tower assessment pass | +300 XP milestone |
| Tower assessment fail | -150 XP penalty |

---

# 15. Quest System

*Unchanged from v6.0. Locked. Full detail preserved from prior version, see companion documents for phase sequencing (Phase 5 per the roadmap in Section 27).*

## 15.1 Elemental Arcs (12, one per element)

Same-element spells only throughout all battle chapters. Minimum 3 same-element spells required to begin.

| Chapter | Objective (all elemental arcs) |
|---|---|
| 1 | Create a spell of this element in Lab |
| 2 | Win 2 system battles using only this element's spells |
| 3 | Win a battle on this element's home terrain using only this element's spells |
| 4 | Reach Affinity Threshold 2 (Attuned) for this element |
| 5 | Defeat a mid-difficulty AI mage who uses opposing element spells |

### Tower Opening Messages

| Arc | Opening Message |
|---|---|
| Ember Trials (Fire) | "Fire does not ask permission. It consumes or it dies. The question is whether you are the flame or the fuel." |
| Tide Covenant (Water) | "Water remembers every shape it has ever taken. The sea does not fight the shore. It simply outlasts it." |
| Gale Rites (Wind) | "Wind has no form of its own. It borrows every shape it passes through. This is not weakness. This is perfect freedom." |
| Stone Vigil (Earth) | "The mountain does not move because it chooses not to. Every stone remembers the weight it has carried. So will you." |
| Storm Calling (Lightning) | "Lightning does not travel in a straight line. It finds the path of least resistance and takes it without hesitation. Learn this." |
| Void Crossing (Void) | "There is a place between spells where nothing exists. Most mages flinch from it. You will learn to live there." |
| Arcane Ascent (Arcane) | "Arcane magic is the language the universe spoke before it invented silence. Every other element is a dialect. This is the root." |
| Dawn Mandate (Light) | "Light does not illuminate gently. It destroys darkness absolutely. There is no negotiation." |
| Shadow Passage (Shadow) | "Shadow is not the absence of light. It is light that has been refused. Remember that when they tell you darkness is nothing." |
| Root Awakening (Nature) | "Nature does not hurry. Everything arrives exactly when it has grown enough to arrive." |
| Frost Ordeal (Frost) | "Cold does not kill quickly. It slows, it stiffens, it waits. The glacier that moves one inch a century has carved more stone than any fire ever will." |
| Chaos Unbinding (Chaos) | "The Tower does not endorse what you are about to attempt. It records the outcome regardless." |

## 15.2 Circle Progression Arcs

| Arc | Chapters | Feel | Final Gate |
|---|---|---|---|
| Circle 2: The First Threshold | 5 | Smooth, tutorial-grade | First Lab spell, 3 system battles, Tier 2 proficiency, 1 Open Brawl win, Threshold 1 |
| Circle 3: The Journeyman's Trial | 6 | Wall appears | 1 Elemental Arc, Tier 3 proficiency, 5 Animus wins, 1 fusion research, Threshold 2, defeat Circle 3 mage |
| Circle 4: The Adept's Burden | 7 | Serious grind | 2 Elemental Arcs, Tier 3 on 3 spells, Threshold 3, 15 Animus wins, 5 Lab creations, 5 terrains, defeat Circle 4 mage |
| Circle 5: The Mastery Proof | 8 | Hard, 6+ months | 4 Elemental Arcs, Tier 4 on 2 spells, Threshold 4, 40 Animus wins, Hybrid Art + Wanderer's Atlas, written assessment + defeat Circle 5 mage |
| Circle 6: The Lord's Path | 8 | Go hard | 6 Elemental Arcs, 1 Awakened spell, Element Mage title, 100 Animus wins, 3 Cross-Element arcs, Threshold 3 in 2nd element, defeat 2 sequential Circle 5 mages |
| Circle 7: The Sovereign's Vigil | 10 | Hell. Multi-year. | All 12 Elemental Arcs, 3 Awakened spells, Element Mage in 2 elements, Element Lord in 1, 300 Animus wins, all Cross-Element arcs, 10 fusions, comprehensive written exam, Gauntlet: 3 sequential Circle 6 mages no recovery |

## 15.3 Cross-Element Challenge Arcs

### The Alchemist's Dilemma
*"A mage who speaks only one language knows only one truth."*
- 5 chapters: build deck with two conflicting elements, win using both, win 3 battles against players with conflicting elements, Threshold 2 in both, win on a terrain opposing one element.
- Reward: 800 Circle XP, 1,500 Elemental XP split across both, Alchemist badge.

### The Diplomat's Path
*"The Sovereign who mastered only fire burned everything she touched."*
- 5 chapters: Threshold 1 in second element, create spell for it, Threshold 2, win 5 battles alternating elements, win with both elements in same deck.
- Reward: 1,000 Circle XP, 600 Elemental XP per element, Diplomat badge.

### The Hybrid Art
*"Two spells. One cast. The Tower has buried more mages than it has graduated from this lesson."*
- 5 chapters: own 5 spells, submit fusion research, complete fusion, use fusion in 3 battles, win with fusion as primary.
- Reward: 1,200 Circle XP, Hybrid Art badge, unique visual border on fusion spell card.

## 15.4 Terrain Mastery Arcs

### The Wanderer's Atlas
- 5 chapters: win on 3 terrains, win on element home terrain, win on opposing terrain, win on 8 terrains total, win on all 15.
- Reward: 1,500 Circle XP, Atlas badge, unique profile background.

### The Reshaper
- 5 chapters: reshape terrain once, reshape 3 times in one battle, win with 2 reshapes, reshape 10 times total, win 5 battles using reshaping to counter opposing terrain.
- Reward: 1,500 Circle XP, Reshaper badge, environmental aura visual on terrain-interaction spells.

---

# 16. Tower Daily Proficiency Arcs

*Unchanged from v6.0.*

| Day | Open Arcs |
|---|---|
| Monday | Fire, Water |
| Tuesday | Wind, Earth |
| Wednesday | Lightning, Void |
| Thursday | Arcane, Light |
| Friday | Shadow, Nature |
| Saturday | Frost, Chaos |
| Sunday | Exclusive arc (rotating, surprise drop, no advance announcement) |

## 16.1 Daily Arc Structure

- Part 1: Tower lore drop. Element-specific flavor text. Free to all. Shareable content unit (feeds Section 23 growth loop).
- Part 2: Challenge cast. Scenario question testing element + classification knowledge. Logic system scored. Consumes 1 slot. Feeds ranking.
- Part 3: Priority queue. Players with eligible spell of that element get assessment reviewed in next batch (max 1 hour). Free, no slot cost.

## 16.2 Circle XP by Rank

| Rank / Score Threshold | Circle XP |
|---|---|
| Top 10% / Score above 80% | 500 XP |
| Top 25% / Score 60-80% | 300 XP |
| Top 50% / Score 40-60% | 150 XP |
| Participated / Below 40% | 75 XP |

## 16.3 Sunday Arc Types (4 rotating, surprise drop)

- Week 1: The Convergence Trial - cross-element + classification scenario. Multiple choice. Logic scored. Free to all.
- Week 2: The Sovereign's Riddle - 3 escalating questions. Third unanswerable by design. Tower never reveals answer. Community debate is the feature. Free to all.
- Week 3: The Relic Auction - strategic decision challenge. LLM evaluates coherence against actual character build. Subscription only.
- Week 4: The Manifestation - creative writing. LLM batch-evaluates Sunday evening. Top 5 featured Monday on Community page. Subscription only.

---

# 17. Community, Halls, and Friends

*Unchanged from v6.0. Note the Spell Showcase and Recent Battles surfaces are now explicitly understood as internal analogues of the external growth-loop surfaces in Section 23, same content, different audience (logged-in community vs. public/external).*

## 17.1 Community Page (V1: Read-Only)

- Elemental Boards: top 10 per element closest to Sovereign. Updates daily.
- Circle Board: directory by circle level.
- Spell Showcase: public spell cards (view only). Shows classification category and cast type on card.
- Assessment Results boast board: one word per post. Pass.
- Recent Animus Battles, Featured Mage, Sunday Manifestation top 5 (Monday).

## 17.2 Hall System

| Feature | Specification |
|---|---|
| Creation cost | Aether Shards. Sovereign/Founder tier: waived. |
| Membership cap | 30 members (V1) |
| Spell vault | Members share spells visible to Hall only |
| Hall leaderboard | Animus wins, circle level, elemental titles |
| Hall dissolution | Master inactive 60 days: transfers to highest-circle member |
| Hall ranks | Hall Master, Archmage, Adept, Initiate |

## 17.3 Friends System

- Add by username. Recent Animus results on Dashboard feed strip. Direct challenge available.

---

# 18. Onboarding & Identity (REVISED)

The onboarding flow is rebuilt around one non-negotiable rule: **the funnel is near-frictionless, but never anonymous at the point real generation happens.** An earlier version of this plan considered allowing spell creation without any signup at all, this was correctly flagged as a direct cost-abuse vector (an unauthenticated endpoint can be scripted to burn LLM/image-gen spend with zero accountability) and has been redesigned.

## 18.1 The Identity Model

- **No password required at signup. Magic-link email only**, one field, no verification wall, account created instantly on link click. **v7.1:** the same email also carries a 6-digit code that can be typed into the tab that requested it. This covers players whose mail app opens links in an in-app browser, where a link-only session would land in the wrong browser. There are no passwords anywhere in the product; codes are single-use, short-lived and attempt-limited. This preserves nearly all the frictionlessness of a true zero-signup flow while giving the product a real, rate-limitable, billable identity.
- **Viewing is free and anonymous. Generating is not.** An anonymous visitor arriving via a shared spell card (Section 23) can view the full public preview, card art, flavor text, lore line, with zero friction and no account. The moment they attempt to *create* their own spell, they hit the magic-link step. This is the correct place to draw the line: browsing costs nothing, generation costs real money.
- **Hard per-identity and per-device rate limits apply regardless of subscription tier**, plus a fraud-detection layer (device fingerprinting, disposable-email domain heuristics) to catch abuse before it consumes real inference spend, not after.
- First free Spark grant lands automatically on account confirmation, and the player is dropped directly into a minimal creation flow, no tour, no forced tutorial sequence before the first meaningful action.

## 18.2 Onboarding Flow

**v7.1: onboarding goes straight to creation.** v7.0 put a guided battle before the first creation here while Sections 18.1 and 23.2 said "straight into creation"; the founder resolved this in favor of creation first, because the creation loop is the product. The post-battle Spell XP reveal is removed (XP is a Phase 3 system and Phase 1 shows no progression).

| Step | What Happens | What Is Shown |
|---|---|---|
| 1. Magic-link signup | Email only. Confirm by link click or by typing the 6-digit code from the same email. | Email field, then code field. |
| 2. First creation | First Spark grant already available. Minimal creation flow, no tour. First 2 spells skip research (Section 6.3). | Lab flow, trimmed to the launch creation subset (see companion Phase 1 Build Plan). Spell stored locked if above requirements: "This spell awaits your growth." |
| 3. Share prompt | Card revealed with a share action. | The card, share button, "Create another". |
| 4. Name your mage | Single text input, asked the first time the name is needed (first share or first battle). | Name field only. |
| 5. Avatar selection | Asked the first time the player enters battle. | HP, MP, affinity bonus. **Flag (pending founder):** v7.0 listed Will here as a visible stat, which conflicts with Section 2.1. Until decided, Will is not shown. |
| 6. First guided battle | System battle (rule-based) on Neutral Grounds, using a small starter deck plus the player's own spells. | HP/MP bars, spell grid, timer. No XP bars, no Will, no proficiency. |
| 7. Home screen unlock | All pages accessible | All pages available in the current phase. The Tower tooltip ("The Tower does not accept visitors without proven spells.") appears only once the Tower ships. |

**Critical (unchanged):** Will is NEVER explained anywhere in the UI. No tooltip. No tutorial. No documentation.

**Critical (unchanged):** Spell classification (category and cast type) is shown on spell cards clearly. Mechanical implications are never explained upfront.

---

# 19. Platform Pages

*Updated to reflect the new identity model and growth loop.*

| Page | Primary Contents |
|---|---|
| Home | Featured spell of day, elemental leaderboard snapshot, recent battle results, news strip |
| Dashboard | Character stats (HP/MP/Will qualitative), XP track summaries, affinity bars per element, rank, recent battles, friend feed, Spark/Aether Shard balances |
| Battle | Opponent avatar + HP bar, terrain background (CSS animated), spell deck grid (shows category and cast type icons), own HP/MP bars, turn timer, minigame overlay, active Continuous/Channeled spell status, battle log |
| Lab | Spell creation form with classification preview, LLM generation preview, confirm/revise, Spark balance + top-up entry point, research queue with stopwatches, owned spell library (filterable by category and cast type), fusion section |
| Magic Tower | Active applications + countdown, past results (one-word), eligible spells with cast counts. Deliberately austere. No explanations. |
| Quests | Daily, arc, challenge, elemental quest tracking |
| Freestyle | Skill level selection, setting message, turn input field, narrative HP bars, battle log |
| Community | Elemental Boards, Circle Board, Spell Showcase (with classification filters), Boast board, Recent Battles, Featured Mage, Hall directory |
| Profile | Character card, titles, avatar, rank, public spell deck view with classification visible |
| **Public Spell Preview (New)** | **No-login-required external landing page for a shared spell card. Card art, flavor, lore line, "Create Your Own" CTA leading to magic-link signup. Proper OG image tags for external share rendering.** |
| Avatar Selection | First login + changeable with Aether Shard cost + 14-day cooldown |
| Hall Page | Hall leaderboard, member list, spell vault, chat |
| Settings | Account, web push notifications, display preferences, Spark/subscription management |

---

# 20. Free Mode

*Unchanged from v6.0, with currency terminology updated.*

| Feature | Specification |
|---|---|
| Avatar | Has stats and affinity differences. Meaningful mechanical choice per session. |
| Available spells | 36 platform base spells (all categories, cast types, elements) + weekly featured rotation of community spells |
| Lab access | Full Lab access. Spark allowance shared with Normal Mode. Small bonus Spark grant/week (Free Mode only). |
| Spells created | Tagged Free Mode only. Cannot transfer to Normal Mode. |
| Terrain modifiers | Active including classification-based special properties |
| Battle recording | Multiplayer (async) recorded. System battles not recorded. |
| XP | None. |

---

# 21. AI Architecture: Two-Step Verification (NEW, CORE ARCHITECTURAL LAW)

**This is a standing rule, not a spell-creation-specific feature.** Every surface in the product where an LLM produces content that a paying user will see, act on, or be judged by must pass through Two-Step Verification before it reaches the player. Players are paying for the product; nothing unverified reaches them.

## 21.1 The Two-Layer Model

**Layer 1, Generation.** A model appropriate to the surface produces a candidate output. Model tier is chosen deliberately per surface (see Section 24.3), not every surface needs a frontier-tier model, and using one everywhere would multiply cost with no corresponding quality benefit on surfaces where output is heavily constrained anyway.

**Layer 2, Verification.** Not a single mechanism, three distinct sub-layers, each suited to a different kind of check, deliberately ordered from cheapest to most expensive so the majority of generations never need the expensive path:

### 21.2 Layer 2a, Schema & Numeric Validation (deterministic, zero LLM cost)

Pure code. Every numeric or enum field the generation model produces is clamped against the hard caps already defined in this document (Section 6.2 stat caps, Section 5.5 summon caps, cast-type/category taxonomy enforcement, Trap requiring a condition and visibility choice, Hybrid requiring a secondary category, Summon forced to Continuous). Since v7.1 it also enforces the spell's power budget total (Section 5.4), so the model chooses the shape of a spell but never its total strength, and tier always comes from the request, never from the model. This layer runs on 100% of generations and costs nothing beyond compute.

### 21.3 Layer 2b, Safety & Moderation (fast, cheap, purpose-built classifier)

Every piece of user-facing text and every generated image passes through a dedicated moderation classifier, not a second generalist LLM call, before storage. This is the direct answer to content-safety risk at real user volume: unmoderated generation *will* eventually be pushed toward offensive output, and this must be caught before storage, not after a complaint. Runs on 100% of generations, priced to stay cheap at scale.

### 21.4 Layer 2c, Semantic Sanity Check (small model, conditional trigger only)

The genuinely hard case: does this spell's flavor text actually match its assigned category? Does a Freestyle Mode judgment plausibly follow from the stated player action? Does a Tower assessment grading decision look defensible? This tier uses a small, cheap model, **and critically, it only fires when Layer 2a or 2b flags something as borderline**, not on every single generation. Running a second expensive model call on 100% of traffic would double LLM cost for no benefit, since the overwhelming majority of generations cleanly clear the deterministic and classifier checks. This layer is the tail-case safety net, not the default path.

## 21.5 Surfaces Where Two-Step Verification Applies

| Surface | Layer 1 Output | Layer 2a | Layer 2b | Layer 2c (conditional) |
|---|---|---|---|---|
| Spell creation | Stat allocation within the power budget, classification, flavor/lore text, summon profile (assessment questions once the Tower ships) | Yes, full stat/schema clamp plus budget total | Yes, text + image | Yes, category/flavor coherence check on flag |
| Fusion research | Fusion spell stats, dual-element art | Yes | Yes | Yes |
| Tower batch grading | Pass/Fail per submitted answer | N/A (binary output) | Yes, on submitted text | Yes, grading defensibility on flag |
| Freestyle Mode turn | Opponent move, narrative, HP change, round result | Partial, HP/damage bounds clamp | Yes, narrative text | Yes, plausibility check on flag |
| Will feedback string selection | Selected from pre-verified variant pool (Section 2.1) | N/A, pool is pre-verified at content-creation time, not per-battle | N/A | N/A |
| Sunday Arc Week 4 (Manifestation) | Creative writing evaluation | N/A | Yes | Yes, on flag |

## 21.6 Retry-Before-Fail Rule

On any Layer 2 rejection, not just a numeric clamp, but an outright failure (a Trap with no coherent condition, a moderated image), the system automatically retries generation with an adjusted prompt **before** the player ever sees a failure. Silent retry is the system's responsibility; a player-facing error for something the pipeline should have caught is a product defect, not an acceptable edge case.

---

# 22. The Dual Currency Economy (NEW, REPLACES RIGID QUOTA SYSTEM)

v6.0 specified fixed weekly/monthly Lab slot quotas (Section 6.4 of that version). On review, this was correctly identified as a **progression-quota system, not a monetization economy**, unused slots simply evaporated, there was no path for a highly-engaged player to create more without a full tier upgrade, and Aether Shards (the one existing spendable currency) never touched the thing that actually costs the product money. This section resolves that gap without discarding what already worked.

## 22.1 Two Currencies, Two Distinct Purposes, Never Merged

### Aether Shards (Soft Currency, Unchanged Role)

Earned through play (Animus/battle wins, arc completions, circle-ups). Spent on cosmetic and social sinks: Hall creation, avatar alt creation, cosmetic unlocks. **Aether Shards never touch anything that consumes real LLM or image-generation cost.** This system was already correctly designed in v6.0 and is preserved as-is.

### Spark (Hard Currency, New)

The only currency that can be spent on anything that consumes real generation cost: spell creation, fusion research. Spark is:
- **Granted on a recurring allowance by subscription tier** (replacing the old fixed weekly slot count, see Section 28 for exact allowance-to-tier mapping).
- **Purchasable directly in a la carte packs**, independent of subscription tier, so a highly-engaged player can create more without upgrading their whole plan.
- **Never earned through gameplay**, this is a deliberate, load-bearing separation. Spark is the money-facing currency; mixing it with earnable soft currency would make its real cost basis impossible to reason about and would open the door to farming real generation cost for free.
- Unused Spark **rolls forward** rather than evaporating on a weekly reset, within a reasonable cap, so paying players don't feel penalized for an inactive week.

## 22.2 Why the Separation Matters

Every dollar of real inference/image-gen cost the product incurs must trace back to Spark spent, and every unit of Spark must trace back either to a subscription payment or a direct purchase. This is what makes the unit economics in Section 24 and 28 actually computable, a currency that can be earned through free play and then spent on LLM generation makes cost-per-user impossible to bound, which is precisely the trap the original quota system's design (correctly) avoided and the reason it must not be repeated here.

## 22.3 Fusion Research Cost

Fusion research consumes more Spark than a standard spell creation, reflecting its higher real generation cost (dual-element prompt, more complex validation). See Section 28.3 for exact multiplier once real provider pricing is finalized.

---

# 23. Growth & Virality System (NEW, FIRST-CLASS SECTION)

Arcanis has no advertising budget at launch. **The product's own generated content is the acquisition engine**, and this section formalizes that as a designed system rather than an assumption.

## 23.1 The Spell Card as Ad Unit

Every spell card generated by any player is, by design, a piece of shareable external content, this was already true structurally (Section 6.5's card design) but was never treated as a growth mechanism until now. Requirements:

- Every spell has a **Public Spell Preview** page (Section 19), no login required to view, with a properly rendered Open Graph image so the card displays correctly when posted to Discord, Twitter/X, or TikTok, not as a raw broken link.
- The preview page carries a clear "Create Your Own" call to action leading directly into the magic-link signup step (Section 18.1), never gating the *view*, only the *generation*.

## 23.2 The Funnel, End to End

1. A player shares a spell card externally (manual share, or prompted by an in-app share button after any creation).
2. A stranger clicks the link → lands on the Public Spell Preview → sees full card art, flavor text, lore line, zero friction, zero account.
3. They click "Create Your Own" → magic-link email capture (identity before generation, per Section 18).
4. On confirmation, first free Spark grant lands automatically, and they're dropped directly into the creation flow, no forced tour.
5. Their new spell is auto-packaged as a shareable card the moment it generates, with a prompt to share it themselves. Loop closes.

## 23.3 Referral Incentive

Both inviter and invitee receive a small Spark bonus when the invitee completes their first creation. The cost of funding this is a fraction of a single spell's real generation cost (Section 22, 24) and directly rewards the exact behavior that grows the user base, this is a deliberately cheap, self-funding referral loop, not a discount program.

## 23.4 Battle Results as a Second Share Surface

Once async PvP (Section 11) is live, a battle result is its own independent shareable moment, e.g., "[Player]'s Inferno Wyrm just defeated [Player]'s Frost Sentinel." Two independent viral surfaces (creation-driven and combat-driven) compound better than relying on either alone, since they reach players at different moments of engagement.

## 23.5 Recurring Content as a Growth Beat

The existing Tower Daily Arc lore drops (Section 16.1) and Sunday Arc events are explicitly repurposed as recurring, shareable growth beats, not purely as progression gates. A weekly "Featured Spell" and a "Most Forked Concept" community board (players riffing on a popular spell idea in their own element) cost nothing beyond curation and give returning players a reason to check in and a reason to share.

## 23.6 What to Measure From Week One

The growth loop is unvalidated until real data exists. Track, at minimum:
- Signup → first-creation conversion rate
- First-creation → share rate
- Share-click → new-signup rate
- **Viral coefficient (k-factor), standard definition (v7.1):** k = invites per user x invite conversion rate, where "invites per user" is shares sent per active user in the period and "invite conversion rate" is new signups attributed to a share divided by shares sent. k is the single number that determines whether the loop compounds (k at or above 1) or leaks. v7.0 called share-click to signup "the viral coefficient"; that is only the conversion half.

---

# 24. Technical Stack (UPDATED)

*v7.1: Phase 1 runs as a modular monolith (Section 26). The four service rows below are now internal modules of one Node.js deployable on one paid Render instance; they split into separate services when load or team size requires it. The database is MySQL (Drizzle ORM) rather than Supabase Postgres; the host is under review (see Phase 1 Build Plan Section 3). Card images live in object storage, not in the database.*

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite (v7.0 said React 18) | SPA framework |
| Styling | Tailwind CSS | Dark fantasy UI |
| Animation | Framer Motion | HP/MP bars, battle transitions, spell cast effects |
| State | React Query via tRPC, plus local component state (Zustand only if battle state needs it) | Game, character, battle state |
| API | tRPC over Express | Typed client/server contract |
| Real-time | Socket.io (WebSockets) | Live battle events (used for the human player's own session even in async matches; not required for the opponent side) |
| Game Service | Node.js + Socket.io on Render | Battle state machine, async opponent piloting engine, matchmaking pool, rule-based bot logic |
| Lab Service | Node.js + Express on Render | Spell creation, fusion, Tower, LLM provider abstraction, Two-Step Verification pipeline, image generation |
| Progression Service | Node.js + Express on Render | XP events via Redis pub/sub, circle advancement |
| Gateway + Community | Node.js + Express on Render | Auth (magic-link), routing, halls, friends, leaderboards, Spark/Aether Shard ledger |
| Database | MySQL via Drizzle ORM (v7.0: Supabase PostgreSQL; host under review) | All persistent data, including the Spark ledger (ledger lives in the database, not Redis) |
| Object storage | S3-compatible bucket behind the CDN (provider TBD in Build Plan) | Card images and OG image variants |
| Cache / Queue | Upstash Redis, added only when a feature needs it (rate limits across instances, battle sessions) | Battle sessions, matchmaking pool, summon state |
| Spell creation LLM (Layer 1) | Cost-tiered provider selection, see 24.3 | Stat/classification generation |
| Moderation (Layer 2b) | Purpose-built moderation classifier, not a generalist LLM | Text + image safety check |
| Image generation | Paid FLUX-class inference | Spell card art. **No longer assumed free at scale, real per-image cost budgeted, see Section 25.** |
| Spell animations | fal.ai Kling-class | Deferred until revenue milestone. Feature flag. |
| Frontend hosting | Vercel | Static build, CDN |
| Payments | Lemon Squeezy (Merchant of Record), pending founder verification for an India-based seller; fallback Paddle (also MoR). Razorpay is not an MoR and would mean handling global tax ourselves. | Subscriptions, Spark packs, Founder's Pass, handles global VAT |
| Migration target | AWS (ECS + ElastiCache + RDS) | When platform limits hit |

## 24.1 LLM Call Surfaces

| Call | Trigger | Output | Verification |
|---|---|---|---|
| Spell creation | Player confirms new spell in Lab, Spark deducted | Stat allocation within the power budget + classification + summon profile + card image (assessment questions once the Tower ships) | Full 2a/2b/2c |
| Fusion research | Compatible pair confirmed, Spark deducted | Fusion spell stats + dual-element art | Full 2a/2b/2c |
| Tower batch | Cron every 6 hours | Pass/Fail per answer | 2b + conditional 2c |
| Freestyle turn | Each turn in Freestyle Mode | Opponent move, narrative, HP changes | Partial 2a + 2b + conditional 2c |

**Note:** async PvP (Section 11) is explicitly *not* an LLM call surface, it is rule-based and free. This is the largest single cost saving in the v7.0 architecture relative to any design that piloted async opponents with an LLM.

## 24.2 Redis Key Namespacing (Updated)

*v7.1: Spark and Aether Shard balances and ledgers are authoritative in the database (append-only ledger, atomic reserve/commit/refund). The `spark:*` and `shards:*` keys below are optional read caches at most, never the source of truth. Research status lives in `research_ready_at` on the spell row, not `lab:research:*`.*

| Key Pattern | Purpose |
|---|---|
| `battle:session:{battleId}` | Active battle state JSON (summon state, active Continuous/Channeled spells, Trap slots) |
| `battle:queue:brawl` | Async matchmaking pool, keyed by profile eligibility |
| `battle:queue:live` | Reserved for future Live Duel liquidity, inactive until gated threshold met |
| `playstyle:vector:{userId}` | Computed aggression/risk/discipline vector, recalculated periodically |
| `spark:balance:{userId}` | Spendable Spark balance |
| `spark:ledger:{userId}` | Transaction history, grants, purchases, spends |
| `shards:balance:{userId}` | Aether Shard balance (soft currency, unchanged from v6.0 concept) |
| `lab:research:{spellId}` | Research status and start time |
| `llm:ratelimit:{provider}` | LLM call counter per provider per minute |
| `moderation:queue` | Pending Layer 2c escalations |
| `progression:events` | Redis pub/sub channel for XP events |
| `referral:pending:{userId}` | Pending referral bonus awaiting invitee's first creation |
| `community:board:elemental` | Cached elemental leaderboard JSON |
| `subscription:{userId}` | Cached subscription tier for fast gate checks |

## 24.3 Model Tiering Principle (New)

Not every surface warrants the same model tier. Spell stat/classification generation is heavily constrained by Layer 2a regardless of what the model outputs, so a mid-tier model is sufficient there, the deterministic clamp is doing the real work of guaranteeing balance, not the model's inherent quality. Flavor text, lore lines, and Will feedback-string pool content are the surfaces where output quality is directly player-visible and unclamp-able by rule-based code, so these are the surfaces that justify spending on a higher-quality model. This tiering is the single largest lever on real COGS and should be revisited whenever provider pricing changes.

---

# 25. Lean Launch Infrastructure Strategy (RENAMED, UPDATED FROM "ZERO COST")

v6.0's "Zero Cost Launch Strategy" assumed free-tier LLM and image generation would hold indefinitely. **This assumption is retired.** Free tiers remain useful for early development and low-volume testing, but the product must budget real inference and image-generation cost as COGS from the first paying user, not discover it at scale.

## 25.1 What Stays Free / Low-Cost at Launch

| Service | Provider | Cost |
|---|---|---|
| Frontend hosting | Vercel free tier | $0 |
| Database | MySQL (v7.1; currently TiDB Cloud, under review). Must not sleep, must not hit a connection cap at launch volume, and must have backups; otherwise migrate before soft launch | $0 → paid on growth |
| Redis | Upstash free tier, only once a feature needs it | $0 → paid on growth |
| Object storage | S3-compatible bucket for card and OG images (v7.1) | Low, usage-based |
| Backend hosting | One paid Render instance for the monolith before soft launch (v7.1; free tier sleeps and would break first impressions from shared links) | Paid from soft launch |
| Domain | One-time purchase | ~$1/month |

## 25.2 What Is Budgeted as Real COGS From Day One

| Item | Approach |
|---|---|
| Spell creation LLM (Layer 1) | Mid-tier model, cost-per-call budgeted directly against Spark pricing (Section 28) |
| Image generation | Paid FLUX-class inference, cost-per-image budgeted directly against Spark pricing |
| Moderation classifier (Layer 2b) | Cheap, high-volume, budgeted as a near-fixed per-generation cost |
| Semantic check (Layer 2c) | Budgeted only against the conditional-trigger rate, not full volume, this is why the conditional design in Section 21.4 matters financially, not just architecturally |

**Spend protection (v7.1):** hard spend caps are set at every provider account (founder action), and the app runs its own daily spend circuit breaker computed from per-call cost telemetry. When the day's estimated spend crosses the configured limit, new generations are refused with a friendly "the forge is cooling" message (no Spark is reserved) until the next day or a manual reset.

## 25.3 Upgrade Triggers

Same principle as v6.0, infrastructure spend scales with revenue milestones, not ahead of them, but the trigger table must now be recomputed against real, measured usage once the product is live, rather than the estimated free-tier ceilings assumed in v6.0. Placeholder structure retained; exact numeric triggers to be finalized post-launch with real cost data (flagged as an open item in Section 29.4).

---

# 26. Distributed System Architecture

*Largely unchanged from v6.0, the four-service separation remains correct. Two additions reflect the new architecture.*

**v7.1, deployment shape:** for Phase 1 the four services below are four modules inside one deployable (a modular monolith). Each module owns its tables and exposes its functions only through its own router or interface; no module reaches into another's tables. This keeps the responsibility split and the later service split cheap, while avoiding three paid instances, cross-service auth and network hops before there is load to justify them. The Lab vs Progression workload concern is handled in Phase 1 by keeping provider calls async and off the battle path; Progression is not built until Phase 3.

Four services. Single responsibility each. Lab and Progression deliberately kept separate: Lab is I/O bound on LLM calls, Progression is event-driven. Combining them causes workload interference.

| Service | Responsibilities | Runtime |
|---|---|---|
| Gateway + Community | Auth (magic-link), routing, rate limiting, halls, friends, leaderboards, spell showcase, moderation flag review, **Spark/Aether Shard ledger** | Stateless HTTP |
| Game Service | WebSocket server, battle state machine, matchmaking pool, turn processing, summon state tracking, Freestyle Mode LLM routing, real-time events, battle persistence, **async opponent piloting engine (playstyle vector application)** | Persistent process. Socket.io. Horizontally scalable. |
| Lab Service | Spell creation + validation layer, fusion research, Tower assessment queue + 6h batch cron, LLM provider cascade, image generation, animation queue management, **full Two-Step Verification pipeline (2a/2b/2c)**, Spark deduction on generation | Stateless HTTP. I/O bound. |
| Progression Service | XP calculation, circle advancement, elemental affinity, quest progress, Will growth, threshold checks. Subscribes to Redis pub/sub XP events. Never blocks a battle turn. | Event-driven subscriber. Always async. |

---

# 27. Implementation Phases (Full Roadmap)

*See companion document, the Arcanis Phase Plan (v2.0), for the full multi-phase sequencing rationale, and the Arcanis Phase 1 Build Plan (v2.0) for implementation-specific detail. This section is retained here as a high-level pointer only.*

The canonical build order ships the creation loop and async battle system together first, ahead of the full progression/social/quest layer, to validate the core monetizable loop before building the grind layer on top of it. Live Duel, Halls, Friends, Freestyle Mode, and the full Quest System are explicitly sequenced after Phase 1 validates.

---

# 28. Subscription Tiers & Pricing (REPRICED)

Payment processing via Lemon Squeezy (Merchant of Record, handles global VAT). All generation-consuming features are gated by Spark, not by tier alone, tier determines *allowance*, Spark packs determine *ceiling*.

## 28.1 Subscription Tiers

| Feature | Free | Ember ~$4.99/mo | Archmage ~$9.99–11.99/mo |
|---|---|---|---|
| Weekly Spark allowance | Small trial allowance | Moderate | High |
| Fusion research Spark cost | Standard multiplier | Standard multiplier | Standard multiplier |
| Freestyle sessions/day | 3 | 5 | Unlimited |
| Tower assessment wait | 6 hours | Next batch (max 1h) | Next batch |
| Sunday Arc Week 3–4 | Read only | Full participation | Full participation |
| Profile badge | None | Ember sigil | Archmage frame |
| Hall creation cost | Full cost | Full cost | 50% reduced |
| Featured Mage eligibility | No | No | Yes |

**The recurring $24.99 "Sovereign" tier from v6.0 is retired.** A recurring tier at that price point for an unproven brand with no existing player base converts poorly, validated by market comparison to established franchises testing similar pricing under existing brand equity and drawing backlash regardless.

## 28.2 Founder's Pass (New, Replaces Recurring Top Tier)

One-time or annual purchase (~$99–149/year), positioned as a prestige/whale-capture offer rather than a recurring subscription tier:
- Large bundled Spark allowance
- Cosmetic prestige: exclusive name color, profile frame, badge
- Early access to content drops
- Chaosborn avatar included
- Hall creation waived

This captures high-intent spend without the recurring sticker-shock risk of a $24.99/month line item on an unproven product.

## 28.3 Spark Packs (New, A La Carte)

Independent of subscription tier. Exact pricing to be finalized against real, measured per-generation cost (Section 25.2), but structured as:

| Pack Size | Indicative Price | Use Case |
|---|---|---|
| Small | ~$2.99 | Occasional top-up |
| Medium | ~$7.99 | Regular creator |
| Large | ~$19.99 | Power user / binge-creation session |

Per-unit Spark cost improves at larger pack sizes. This is the primary lever for capturing revenue from highly-engaged players beyond their subscription tier's allowance, and it is the piece of the economy that did not exist in v6.0.

## 28.4 Non-Generative Monetization (Pure Margin)

Costs nothing to fulfill, no LLM or image-gen cost attached:
- Alternate card border styles / cosmetic frames
- Priority research queue (skip-the-wait, not skip-the-quality)
- Extra deck slots
- Alt-account creation discounts (paid in real currency instead of Aether Shards, optional convenience)

## 28.5 Margin Target

Target gross margin of **~70-80% after real inference and image-generation cost**, to be recomputed once actual provider pricing and Two-Step Verification's real conditional-trigger rate (Section 21.4, 25.2) are measured against live traffic. The margin figures inherited from the v6.0 free-tier assumption are explicitly retired and must not be treated as current.

---

# 29. Handoff Context for New AI Instance (REWRITTEN)

**Critical:** READ THIS SECTION FIRST before referencing any other section. This is the complete continuation context as of v7.0.

## 29.1 What Arcanis Is, Now

A full-stack competitive magic RPG platform, **built as a revenue-generating commercial product**, not a portfolio piece. The founder (Umesh Chandra Tirumani) made a deliberate strategic pivot after a market/design review surfaced real structural risks in the original plan (live-PvP liquidity dependency, undermonetized creation loop, unbounded LLM cost exposure, and an unproven $24.99 recurring tier). This document reflects the resolved version of that plan. Two-way design communication remains expected and required, give honest reviews of design decisions, push back where warranted, do not seek approval for obvious calls.

The project was originally named "Magic Spar," then renamed to "Arcanis." All references to Magic Spar in prior documentation refer to the same project.

## 29.2 Complete Locked System Inventory (v7.0)

### Unchanged from v6.0 (fully locked, no further debate needed)
- Core stats, hidden Will system and its growth/threshold design (now with a mandatory rotating-variant requirement on feedback strings, Section 2.1)
- Circle System (10 circles, undisclosed cap)
- Elements and Amicability Table
- Full Spell Classification System (10 categories, 5 cast types, Summon mode system, Physical proficiency multiplier, Trap visibility system), all of it, unchanged
- Spell tiers and hard stat caps
- Proficiency and Tower Assessment system
- Elemental Affinity system
- Fusion System (V2, not built yet)
- Terrain System (15 terrains)
- Avatar System
- XP Economy (three tracks, never purchasable)
- Quest System, Tower Daily Arcs, Community/Halls/Friends structure

### New or fundamentally changed in v7.0
- **Async-first PvP** (Section 11): default battle mode uses stored player profiles piloted by the existing rule-based combat engine, weighted by a computed playstyle vector. Zero LLM cost. Solves the launch-liquidity problem structurally. Live Duel is a later, liquidity-gated premium layer built on top of the same mechanical engine, not a launch dependency.
- **Two-Step Verification** (Section 21): universal architectural law across every AI surface, not just spell creation. Layer 1 (generation) → Layer 2a (deterministic schema/numeric clamp, free, 100% coverage) → Layer 2b (moderation classifier, cheap, 100% coverage) → Layer 2c (semantic sanity check, small model, conditional trigger only on 2a/2b flag, not run on every generation, for cost reasons).
- **Dual Currency Economy** (Section 22): Aether Shards (soft, earned, cosmetic/social only) and Spark (hard, purchasable, the only currency that touches real generation cost) are strictly separated. Spark replaces the old rigid weekly-quota system; unused Spark rolls forward within a cap instead of evaporating.
- **Magic-link identity, never anonymous generation** (Section 18): viewing shared content is fully anonymous and frictionless; generating anything is gated behind an instant, low-friction magic-link signup. This closes a real cost-abuse vector that an earlier fully-anonymous plan would have opened.
- **Growth & Virality System** (Section 23) is now a first-class, designed system: the spell card and battle result are the acquisition engine, with a defined funnel (share → public preview → magic-link → first free Spark → first creation → re-share) and a referral incentive.
- **Repriced subscription tiers** (Section 28): the $24.99 recurring tier is retired in favor of a one-time/annual Founder's Pass; a la carte Spark packs are introduced as the primary lever for revenue beyond subscription allowance.
- **Infrastructure cost model** (Section 24, 25): real LLM and image-generation cost is budgeted as COGS from the first paying user. Free tiers are treated as early-development convenience, not a scaling assumption. Model tiering (mid-tier for stat generation, higher-quality only where output is player-visible and un-clampable) is the primary cost lever.

### Clarified in v7.1
- Will is capacity (absolute, grows, gates tiers) plus current Will (per battle, depleted per cast); bands are percentages of capacity. Secrecy unchanged. Will cost appears in the UI only as Light / Moderate / Heavy.
- Spell stats use a hybrid Power Budget: code sets the budget, the LLM allocates within it, Layer 2a enforces it.
- Minigames are server-scored; the async piloted side samples the owner's stored results, blended to the population median by n/(n+10).
- Magic link plus 6-digit code in the same email; no passwords.
- Onboarding goes straight to creation; first 2 spells skip research; no Spell XP reveal.
- Phase 1 ships as a modular monolith on MySQL, one paid instance, images in object storage.

## 29.3 Current State of the Project

**v7.1 (2026-10-09):** implementation is underway in the `phase0/` app, which is the canonical codebase; the older root prototype is being archived. Creation and share are partly built; battles are early. Phase 0 measurement (cost per creation, provider rates, balance harness) has not been done. See `PROGRESS.md` and `docs/status_report.md` in the repo for live status. The plan is a creation-first soft launch once the blockers are fixed, with async battles built in parallel (Phase Plan Section 5).

Architecture is complete and reflects the commercial pivot. All major structural risks identified in the pre-pivot market assessment have a corresponding designed resolution in this document: liquidity risk → async PvP; unbounded cost risk → Two-Step Verification + model tiering + real COGS budgeting; undermonetized creation → Spark economy; no acquisition channel → Growth & Virality System; bad tier pricing → repriced tiers + Founder's Pass. The project is ready to proceed to phase-sequencing and Phase 1 implementation planning, see the companion Arcanis Phase Plan and Arcanis Phase 1 Build Plan documents.

## 29.4 What Has NOT Been Designed Yet (Open Items)

- Exact model/provider selection per Layer 1 surface, and real measured cost-per-generation (currently estimate ranges, not measured figures)
- Exact Spark-to-currency conversion rates and final Spark pack pricing (structure is locked in Section 28.3, exact numbers pending real COGS data)
- The specific concurrency threshold that gates Live Duel's introduction (Section 11.5), to be defined operationally once real usage data exists, not before
- Playstyle vector exact weighting formula (directional design locked in Section 11.2, precise formula is an implementation detail for the Game Service)
- Choice of specific moderation classifier/provider for Layer 2b
- Fraud-detection heuristics specifics for the magic-link signup flow (Section 18.1)
- Individual arc quest chapter task details beyond structure (content task, Phase 5+)
- Circle assessment exam question pool (broader than single-spell Tower assessment)
- Avatar visual art direction and generation prompts
- Remaining element minigame designs beyond the Phase 1 group-based placeholders
- Notification copy and push notification content
- Aether Shard alt-creation exact cost (number not set)
- Hall emblem and customization details
- Summon cap in V1: confirmed as 1 active summon. V2 multi-summon design not started.
- Exact upgrade-trigger numeric table for infrastructure scaling (Section 25.3), placeholder structure only until real usage data exists
- Whether Lemon Squeezy can onboard and pay out to an India-based seller (founder verifying; Paddle is the fallback). Prerequisite for Phase 2.
- Exact Will band edges and the strain descriptor cut points (starting values in Section 2.1, tuned through the balance harness)
- Reconciling Section 2.1 Will cost ranges with Section 6.2 Will floors/caps (they disagree; flagged in v7.1)

## 29.5 Key Terminology Quick Reference (Updated)

| Term | Definition |
|---|---|
| Circle | Character level. 10 max, undisclosed. Cap never shown to players. |
| Will | Hidden mental stat. Capacity (0-500, grows, hard gate on spell access) plus current Will (per battle, depleted per cast; bands are percentages of capacity). Never displayed. Never explained. Feedback strings drawn from rotating variant pools (Section 2.1). |
| Strain descriptor | Light / Moderate / Heavy. The only way a spell's Will cost appears in the UI, in the spell detail view only. |
| Power Budget | Code-computed total stat budget per spell from tier and classification. The LLM allocates within it; Layer 2a enforces it. |
| Async PvP | Default battle mode. Opponent is a stored player profile piloted by the rule-based combat engine per a computed playstyle vector. No LLM cost. |
| Playstyle Vector | Computed aggression/risk-tolerance/resource-discipline profile derived from a player's own battle history, used to pilot their async combat profile when offline. |
| Live Duel | Later, liquidity-gated real-time PvP layer built atop the same battle engine. Not a launch dependency. |
| Two-Step Verification | Universal architectural law: Layer 1 generation, then Layer 2a (deterministic clamp) + Layer 2b (moderation) + conditional Layer 2c (semantic check) before any AI output reaches a player. |
| Spark | Hard, purchasable currency. The only currency that spends against real generation cost (spell creation, fusion). Never earned through gameplay. |
| Aether Shards | Soft, earned currency. Cosmetic/social sinks only (Halls, alts, cosmetics). Never touches generation cost. |
| Founder's Pass | One-time/annual premium offer replacing the retired $24.99 recurring tier. Bundled Spark + cosmetic prestige + early access. |
| Public Spell Preview | No-login external landing page for a shared spell card. The entry point of the growth funnel. |
| Magic-Link Signup | Passwordless, email-only, instant-confirmation identity step (link click or the 6-digit code in the same email). Required before any generation; never required before viewing. |
| Mana Quality | Character sub-stat. Affects regen spell effectiveness and summon strength. |
| Awakened Spell | Proficiency Tier 5 + Channeler affinity minimum. Also called Enhanced Spell. |
| Summon | Spell category. Manifests a persistent beast or spirit. Always Continuous consumption. Available from Circle 1. Autonomous or Controlled mode chosen at creation. |
| Physical | Spell category. Combat Mage. Infuses body/weapon with elemental energy. Lower Will cost. 1.5x proficiency XP from battle wins. |
| Hybrid | Spell category. Two categories combined. Circle 2 minimum. 20% extra Will cost. |
| Trap | Cast type. Set in trap slot, triggers on condition. Visibility chosen at creation. |
| Charged / Continuous / Channeled | Cast types with interruption mechanics, see Section 5.2. |
| Interruption Threshold | Spell stat. Damage amount that breaks a Charged/Continuous/Channeled spell mid-execution. |
| Animus | Rank track, currently tied to async Open Brawl outcomes; becomes the reward track for Live Duel once introduced. |
| Freestyle Mode | Pure imagination battle. LLM judges. The one real LLM-cost battle surface in the product; session-capped by tier. |
| Element Sovereign | Affinity Threshold 7. Rarest title. Mythic status. |
| Aether Shards | (see above) |
| Lemon Squeezy | Payment processor. Merchant of Record. Handles global VAT. |

---

*End of Master Documentation v7.1. Companion documents: the Arcanis Phase Plan v2.1 (multi-phase sequencing) and the Arcanis Phase 1 Build Plan v2.1 (agent-facing implementation detail), both reconciled against this version.*
