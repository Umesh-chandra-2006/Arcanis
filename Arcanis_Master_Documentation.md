__ARCANIS__

Game Design Document — Master Reference
*Complete Vision Blueprint | Version 6.0*

Author: Umesh Chandra Tirumani
Status: Architecture Complete | Ready for Implementation

*Formerly "Magic Spar." Renamed to Arcanis. This document supersedes all prior naming.*

---

# 1. Vision and Product Goals

Arcanis is a full-stack competitive magic RPG platform. Players build a mage character, craft original spells in a Lab using LLM assistance, duel other players and AI opponents in turn-based battles, and grow through a multi-track progression system tied to elemental affinity, circle level, and individual spell mastery.

The product is a portfolio-grade indie project with a content pipeline built into its core loop: spell creation, research time, generated spell card art, and elemental affinity milestones all generate natural sharing hooks.

## 1.1 Primary Goals

- Deliver a playable competitive turn-based battle system with HP, MP, and Will mechanics
- Implement LLM-assisted spell creation with rate limiting, research time, and generated visual card art
- Build character progression through three independent XP tracks
- Ship a polished V1 as a portfolio artifact at zero infrastructure cost
- Grow infrastructure spend only when subscription revenue justifies it

## 1.2 Non-Goals for V1

- Multi-cast and fusion mechanics (Circle 4+ feature, V2)
- Spell-specific minigames (V3)
- Items and consumables, lore narrative
- Payment processing (contact form only at launch)
- Spell animations (deferred until first subscription revenue, ~10 Ember subscribers)

## 1.3 Design Philosophy

Arcanis is built on an "op at the start, opt into grind" philosophy. Players get the full mechanical depth of spell creation and battle immediately — all spell types, all classification systems, no gates. Progression exists as an optional identity and mastery layer for players who want it, not as a requirement to experience the game's ceiling. This mirrors how most games nerf you into progression; Arcanis lets players choose their own power curve.

---

# 2. Core Character Stats

| Stat | Description | Key Gate |
|---|---|---|
| HP | Player health. Reaches 0 = defeat. | Lose condition |
| MP | Fuel for casting. No passive regen. Managed via regen spells and strategic decisions. | Spell casting and maintenance |
| Will | Mental capacity. Hidden 0-500 internal scale. Never shown as number or bar. Never explained in UI. | Spell tier access, summon stability, fusion stability (V2), backlash resistance |

## 2.1 Will: Full Design

Will is quantified internally but never shown to the player. The game surfaces qualitative feedback only when Will crosses critical thresholds. Will can be regenerated via regen spells but this is NEVER disclosed. Players discover this mechanic themselves. Will is never explained anywhere in the UI, ever.

### Will States and Player Feedback

| Will Range | State | Player Feedback |
|---|---|---|
| 300-500 | Sharp / Sovereign | None. Clean casting. |
| 150-299 | Focused / Steady | None. Full power. |
| 80-149 | Strained | "Your thoughts feel heavy," "Focus slips at the edges" |
| 30-79 | Failing | Knockoff cast. "The construct trembles," "Your vision swims" |
| 0-29 | Broken | Spell fires and fails. MP consumed. "Your mind goes blank" |

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

- Written: broad magic theory covering full spell roster, elemental choices, classification understanding, strategic decision-making. Tower batch reviewed.
- Battle: defeat assessment mage of equivalent circle. No quest chain alternative from Circle 5.
- Circle 3 and 4 only: quest chain alternative to direct fight permitted.

---

# 4. Elements

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

Every spell has two classification axes: Category (what the spell does) and Cast Type (how it is delivered). Both are assigned by the LLM at spell creation time and stored as tags. The validation layer confirms they are within the allowed taxonomy before storage. Classification governs proficiency assessment questions, Tower arc scenarios, fusion compatibility scoring, terrain interaction mapping, and Will cost adjustments.

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

The directives a summon can be given in battle are not a fixed global menu — they are derived directly from the skill set generated at spell creation. A glass-cannon summon with only damage skills only offers an attack directive. A support-built summon with heal and shield skills offers a support directive. The creator effectively defines the summon's available roles by how they describe it at creation.

- **Autonomous mode:** chosen at spell creation. At summon time in battle, the player assigns one directive (attack / defend / support — only options this summon's skill set actually supports are shown). The summon then executes that directive every turn on its own for the rest of the battle. Cannot be changed mid-battle.
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

The trap's trigger condition is not chosen from a fixed enum — it emerges from the creator's description at spell creation, and the LLM assigns an appropriate condition based on that concept. This keeps trap identity tied to spell identity rather than a mechanical menu.

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

## 5.4 LLM Spell Creation Output Schema

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
| Fire | Conflagration Wave | Continuous | Continuous | Variable damage, interruptible, spreads per turn |
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

## 6.3 Spell Creation Flow

- Player inputs: spell name, element, description (flavor only, no mechanical weight). Color and aesthetic are emergent from spell identity not forced by element. A black fire spell generates dark obsidian art. A crimson blood water spell generates deep red fluid art.
- LLM generates simultaneously: all spell stats, classification fields, summon profile if applicable, assessment questions 2D array (10 per tier), research_complexity_score.
- Image generation fires in parallel: spell card art via Hugging Face free inference (FLUX variant). Prompt derived from spell name, flavor text, lore line, and classification.
- Fusion spells: same flow, dual-element image prompt. Both constituent elements present in art.
- Validation layer clamps all numeric values to hard caps before storage.
- Research time: stopwatch only. No countdown. No time disclosed. Scales with research_complexity_score.
- First 3 spells if above requirements: stored locked. "This spell awaits your growth." No restriction language.

## 6.4 Lab Slot Limits

| Slot Type | Weekly | Monthly Shared Pool | Notes |
|---|---|---|---|
| Spell creation | 3 slots | 10 slots (shared with fusion) | Resets Monday |
| Fusion research | 2 slots | Shared with spell creation | Resets Monday |
| Tower daily arc participation | 1 slot per arc | From shared pool | Competes for Circle XP ranking |
| Free Mode bonus token | 1 token | Not from shared pool | Free Mode only |

**Note:** Fusion slots accessible only after player owns 5+ active spells.

## 6.5 Spell Card Design (locked)

The spell card is the primary UI unit for displaying a spell — both in-game (collection grid, deck builder, battle UI) and as a shareable artifact.

**Layout:**
- Dominant area: the generated FLUX image, roughly 55% of card height
- Bottom panel with dark gradient overlay: spell name (large, stylized), a one-line flavor/lore text (never stats)
- Corner: element icon (small, top-right)
- Border: tier-communicated via border complexity, not color
  - Basic: simple solid border
  - Advanced: layered/textured border
  - Mega: triple border with energy-glow effect
  - Freestyle: visually distinct border, separate from the tier ladder
- Border and accent color derived from the spell image's dominant color, not a fixed element palette

**What's never on the card:** damage numbers, MP cost, Will cost, proficiency tier. Stats stay in-game, accessible by clicking the card to open full spell info. The card is identity, not a stat sheet.

Card aspect ratio is set by in-game UI context (portrait, trading-card-like), not fixed to a social media square. Players can still screenshot and share cards externally.

## 6.6 Spell Animations (Deferred Until Revenue)

Built in codebase behind feature flag. Activates when first subscription revenue confirmed (~10 Ember subscribers). First 3 per account free lifetime.

Animation sequence: Phase 1 (0.8s) - magic circles appear around caster, element-colored, rotating, rune-marked. Phase 2 (0.7s) - spell manifests from circle center in classification-appropriate form. Phase 3 (1.5s) - spell travels with element trail. Phase 4 (1s) - impact shockwave, HP drain animation. The magic circle is the visual signature across all spells.

Generation: Kling via fal.ai (~$0.10). Human-in-loop queue: draft generated immediately as preview, designer reviews within 24-48h, final replaces preview, player notified.

---

# 7. Spell Proficiency System

| Tier | Name | Spell XP Required | Cast Minimum | Assessment |
|---|---|---|---|---|
| 1 | Novice | 1,000 XP | 40 casts | None |
| 2 | Practiced | 4,000 XP | 100 casts | 1 question, 6h Tower batch |
| 3 | Fluent | 12,000 XP | 250 casts | 3 questions, 6h batch |
| 4 | Mastered | 35,000 XP | 600 casts | 5 questions, 6h batch |
| 5 | Awakened | 100,000 XP | 1,500 casts | 10 questions (full pool). Requires Elemental Affinity Threshold 3 in spell element. |

## 7.1 Tower Assessment System

- Assessment questions stored as 2D array: `{ tier_2: string[10], tier_3: string[10], tier_4: string[10], tier_5: string[10] }`. Generated by LLM at spell creation.
- Questions cover: element behavior, classification category behavior, cast type mechanics, terrain interactions, strategic use cases, failure conditions. At least 2 questions per tier specifically about category and cast type.
- Free-text answers submitted to Tower. Batch-evaluated by LLM every 6 hours (up to 50 answers per batch).
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

---

# 9. Fusion System (V2)

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
- Compatible: enters fusion research queue. LLM generates fusion spell including dual-element card image.
- Category compatibility layer: two Continuous spells = higher disintegration risk. Two Attacks = clean fusion. Buff + Attack = natural Hybrid outcome.
- Random fusion: Lab option checking database first. If pair exists: stored result, reduced wait. If not: fails, no LLM call, no slot consumed.
- Spells are never deleted. Awakened spells get separate fusion registry from pre-awakened version.
- Summon + Attack fusion: generates a combat summon that also damages on arrival. Requires both spells to be Awakened.

---

# 10. Terrain System

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

# 11. Battle System

## 11.1 Battle Types

| Type | Description | XP Recorded |
|---|---|---|
| vs. System | Solo AI opponents. Primary onboarding path. | Yes |
| Open Brawl | Multiplayer. No restrictions. Casual. | Yes |
| Animus | Multiplayer. Full character with restrictions. Ranked. | Yes |
| Quests | Structured challenges. | Yes |
| Free Mode system | Sandbox AI. No progression. | No |
| Free Mode multiplayer | Sandbox PvP. Community recorded. | Yes (no XP) |
| Freestyle Mode | Pure imagination battle. LLM judges. Separate mode. | Win/loss only |

## 11.2 Turn Structure

- Each turn is timed.
- Player selects spell or sets a Trap if cast type allows.
- Trap spells set in a trap slot and do not consume turn action when they trigger.
- Minigame triggers based on spell element (element-type for V1).
- Minigame outcome determines actual damage within spell damage range.
- Terrain modifiers applied: damage, MP cost, proficiency effectiveness, Will cost.
- If opponent action triggers interruption threshold on caster's active Continuous/Channeled/Charged spell: interruption resolves.
- HP/MP/Will updated. Summon actions resolve if active. Win condition checked.

## 11.3 Animus Ranks

| Rank | Name |
|---|---|
| 1 | Ignotus |
| 2 | Discipulus |
| 3 | Cantor |
| 4 | Invocator |
| 5 | Magus |
| 6 | Archmagus |
| 7 | Aeternus |

## 11.4 Disconnect Handling

- Turn timer expires: auto-selects random Instant spell from deck at minimum damage (Continuous/Channeled collapse safely).
- Disconnect 60+ seconds: forfeit. Animus = loss + full XP to opponent.

---

# 12. Freestyle Battle Mode

Standalone third mode. Pure imagination battle. No spell deck, no HP/MP/Will numbers, no affinity, no proficiency, no XP, no classification constraints. Two mages enter, one wins. The LLM is the sole judge and narrator. This is a battle of wits and imagination.

| Feature | Specification |
|---|---|
| HP | 100 narrative HP per side. LLM scores damage each turn. |
| MP / Will | Non-existent in Freestyle Mode. Pure imagination. |
| Stats | None. The outcome is entirely LLM-scored. |
| Turn limit | 10 turns hard cap. Lower HP side loses if neither reaches 0 by turn 10. LLM escalates damage in turns 8-10. |
| Terrain | Applies. Setting message fires at battle start (cached per terrain). Using terrain in your action is rewarded in scoring. |
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

| Avatar | HP | MP | Will | Starting Affinity Bonus | Unlock |
|---|---|---|---|---|---|
| The Ashen (basic) | 100 | 100 | 100 | All elements +3% | Default |
| Emberveil | 90 | 110 | 100 | Fire +25% | Default |
| Tidecaller | 95 | 120 | 95 | Water +25% | Default |
| Galeborn | 85 | 105 | 115 | Wind +25% | Default |
| Stonewarden | 120 | 90 | 95 | Earth +25% | Default |
| Voidwalker | 80 | 115 | 120 | Void +20%, Shadow +15% | Circle 5 |
| Dawnbringer | 90 | 110 | 125 | Light +20%, Arcane +15% | Earn any Element Mage title |
| Chaosborn | 95 | 105 | 110 | Chaos +30%, all others -8% | Paid unlock (contact form) |

- Affinity bonus is permanent for that avatar but front-loaded. Tapers as earned affinity dominates.
- Multiple avatar alts allowed. Each starts from Circle 1, zero XP. No progress transfers between alts.
- Creating new alt: costs Aether Shards + 14-day cooldown. Switching active alt: no cooldown.
- Free Mode avatars: same roster, stats apply per session, do not persist.

---

# 14. XP Economy

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

- Part 1: Tower lore drop. Element-specific flavor text. Free to all. Shareable content unit.
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

## 17.1 Community Page (V1: Read-Only)

- Elemental Boards: top 10 per element closest to Sovereign. Updates daily.
- Circle Board: directory by circle level.
- Spell Showcase: public spell cards (view only). Shows classification category and cast type on card.
- Assessment Results boast board: one word per post. Pass.
- Recent Animus Battles, Featured Mage, Sunday Manifestation top 5 (Monday).

## 17.2 Hall System

| Feature | Specification |
|---|---|
| Creation cost | Aether Shards. Sovereign tier: waived. |
| Membership cap | 30 members (V1) |
| Spell vault | Members share spells visible to Hall only |
| Hall leaderboard | Animus wins, circle level, elemental titles |
| Hall dissolution | Master inactive 60 days: transfers to highest-circle member |
| Hall ranks | Hall Master, Archmage, Adept, Initiate |

## 17.3 Friends System

- Add by username. Recent Animus results on Dashboard feed strip. Direct challenge available.

---

# 18. Onboarding Flow

| Step | What Happens | What Is Shown |
|---|---|---|
| 1. Avatar selection | Pick from 5 default avatars | Full stats: HP, MP, Will, affinity bonus |
| 2. Name your mage | Single text input | Name field only |
| 3. First guided battle | System battle on Neutral Grounds. 5 Basic spells pre-loaded. | HP/MP bars, spell grid, timer. No XP bars, no Will, no proficiency. |
| 4. Post-battle reveal | First win screen | One system: Spell XP. One-line explanation. |
| 5. Lab introduction | Free spell creation. No restrictions stated. | Full Lab flow. Spell stored locked if above requirements: "This spell awaits your growth." |
| 6. Home screen unlock | All pages accessible | All pages. Tower tooltip: "The Tower does not accept visitors without proven spells." |

**Critical:** Will is NEVER explained anywhere in the UI. No tooltip. No tutorial. No documentation. Players discover it through experience. The first qualitative feedback string mid-battle is the discovery moment. This is intentional and permanent.

**Critical:** Spell classification (category and cast type) is shown on spell cards clearly. But mechanical implications of classification are never explained upfront. Players learn by doing.

---

# 19. Platform Pages

| Page | Primary Contents |
|---|---|
| Home | Featured spell of day, elemental leaderboard snapshot, recent Animus results, news strip |
| Dashboard | Character stats (HP/MP/Will qualitative), XP track summaries, affinity bars per element, Animus rank, recent battles, friend feed |
| Battle | Opponent avatar + HP bar, terrain background (CSS animated), spell deck grid (shows category and cast type icons), own HP/MP bars, turn timer, minigame overlay, active Continuous/Channeled spell status, battle log |
| Lab | Spell creation form with classification preview, LLM generation preview, confirm/revise, research queue with stopwatches, owned spell library (filterable by category and cast type), fusion section |
| Magic Tower | Active applications + countdown, past results (one-word), eligible spells with cast counts. Deliberately austere. No explanations. |
| Quests | Daily, arc, challenge, elemental quest tracking |
| Freestyle | Skill level selection, setting message, turn input field, narrative HP bars, battle log |
| Community | Elemental Boards, Circle Board, Spell Showcase (with classification filters), Boast board, Recent Battles, Featured Mage, Hall directory |
| Profile | Character card, titles, avatar, Animus rank, public spell deck view with classification visible |
| Avatar Selection | First login + changeable with Aether Shard cost + 14-day cooldown |
| Hall Page | Hall leaderboard, member list, spell vault, chat |
| Settings | Account, web push notifications, display preferences |

---

# 20. Free Mode

| Feature | Specification |
|---|---|
| Avatar | Has stats and affinity differences. Meaningful mechanical choice per session. |
| Available spells | 36 platform base spells (all categories, cast types, elements) + weekly featured rotation 20-30 community spells |
| Lab access | Full Lab access. Slots shared with Normal Mode. 1 bonus token/week (Free Mode only). |
| Spells created | Tagged Free Mode only. Cannot transfer to Normal Mode. |
| Terrain modifiers | Active including classification-based special properties |
| Battle recording | Multiplayer recorded. System battles not recorded. |
| XP | None. |

---

# 21. Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite | SPA framework |
| Styling | Tailwind CSS | Dark fantasy UI |
| Animation | Framer Motion | HP/MP bars, battle transitions, spell cast effects |
| State | Zustand | Game, character, battle state |
| Real-time | Socket.io (WebSockets) | Live battle events from day one |
| Game Service | Node.js + Socket.io on Render | Battle state machine, matchmaking, Freestyle LLM routing |
| Lab Service | Node.js + Express on Render | Spell creation, fusion, Tower, LLM proxy, image generation |
| Progression Service | Node.js + Express on Render | XP events via Redis pub/sub, circle advancement |
| Gateway + Community | Node.js + Express on Render | Auth, routing, halls, friends, leaderboards |
| Database | Supabase (PostgreSQL) | All persistent data |
| Cache / Queue | Upstash Redis (free tier) | Battle sessions, matchmaking, slot counters, summon state |
| LLM Primary | Groq (LLaMA 3.1 70B) free tier, or Gemini Flash / OpenRouter (user-selectable) | Spell creation, fusion, Tower batch, Freestyle turns |
| LLM Fallback 1 | OpenRouter | Rate limit fallback |
| LLM Fallback 2 | Gemini Flash | Last-resort fallback |
| Spell card images | Hugging Face free inference (FLUX) | Generated at spell creation. Zero cost. |
| Spell animations | fal.ai Kling | Deferred until revenue. Feature flag. |
| Frontend hosting | Vercel free tier | Static build, CDN |
| Payments | Contact form only at launch | Lemon Squeezy when traction confirmed |
| Migration target | AWS (ECS + ElastiCache + RDS) | When Render limits hit |

**Note on LLM provider flexibility:** the system is built with a provider-abstraction layer so any of Groq, Gemini Flash, or OpenRouter (all free tiers) can be swapped via environment configuration alone. Two independent LLM roles exist: spell creation/text generation, and image generation. The person building this can choose a different free provider for each role.

---

# 22. Zero Cost Launch Strategy

Arcanis launches at ~$1/month infrastructure cost (domain only). Four Render free tier accounts: one per service. UptimeRobot pings Game Service every 10 minutes to prevent sleep.

| Service | Provider | Cost |
|---|---|---|
| Game Service | Render free (Account 1) + UptimeRobot ping | $0 |
| Lab Service | Render free (Account 2) | $0 |
| Progression Service | Render free (Account 3) | $0 |
| Gateway + Community | Render free (Account 4) | $0 |
| Database | Supabase free (500MB, 1GB storage) | $0 |
| Redis | Upstash free (10k commands/day) | $0 |
| LLM | Groq free tier (or equivalent) | $0 |
| Spell card images | Hugging Face free inference | $0 |
| Spell animations | Feature flag OFF at launch | $0 |
| Frontend | Vercel free tier | $0 |
| Domain | One-time purchase | ~$1/month |
| **Total** | | **~$1/month** |

## 22.1 Upgrade Triggers

| When | Action | Covered By |
|---|---|---|
| Render RAM/hour limits hit | Upgrade that service to starter ($7) | 2 Ember subscribers per service |
| Upstash 10k/day exceeded | Upstash pay-as-you-go | 3 Ember subscribers |
| Supabase 500MB hit | Supabase Pro ($25) | 5 Ember subscribers |
| 10 Ember subscribers confirmed | Activate animation feature flag (~$50 fal.ai) | 10 Ember subscribers |
| 20+ subscribers mixed | All infrastructure covered comfortably (~$100/month net) | Self-sustaining |

---

# 23. Distributed System Architecture

Four services. Single responsibility each. Lab and Progression deliberately kept separate: Lab is I/O bound on LLM calls, Progression is event-driven. Combining them causes workload interference.

| Service | Responsibilities | Runtime |
|---|---|---|
| Gateway + Community | Auth, routing, rate limiting, halls, friends, leaderboards, spell showcase, moderation flags | Stateless HTTP |
| Game Service | WebSocket server, battle state machine, matchmaking queue, turn processing, summon state tracking, Freestyle Mode LLM routing, real-time events, battle persistence | Persistent process. Socket.io. Horizontally scalable. |
| Lab Service | Spell creation + validation layer, fusion research, Tower assessment queue + 6h batch cron, LLM provider cascade, image generation (Hugging Face), animation queue management, slot rate limiting. ALL LLM calls flow through here only. | Stateless HTTP. I/O bound. |
| Progression Service | XP calculation, circle advancement, elemental affinity, quest progress, Will growth, threshold checks. Subscribes to Redis pub/sub XP events. Never blocks a battle turn. | Event-driven subscriber. Always async. |

## 23.1 LLM Call Surfaces (4 Only)

| Call | Trigger | Output |
|---|---|---|
| Spell creation | Player confirms new spell in Lab | All spell stats + classification fields + summon profile + assessment questions 2D array + card image (parallel) |
| Fusion research | Compatible pair confirmed in Lab | Fusion spell stats + element blend + classification + dual-element card image. Skipped if pair in database. |
| Tower batch | Render cron every 6 hours | Evaluates up to 50 pending assessment answers. Returns pass/fail per answer. |
| Freestyle turn | Each turn in Freestyle Mode | opponentMove, opponentNarrative, HP changes, roundNarrative, battleStatus |

## 23.2 Redis Key Namespacing

| Key Pattern | Purpose |
|---|---|
| `battle:session:{battleId}` | Active battle state JSON (includes summon state, active Continuous/Channeled spells, Trap slots) |
| `battle:queue:animus` | Sorted set, rank score |
| `battle:queue:brawl` | Sorted set, circle level |
| `lab:slots:weekly:{userId}` | Spell creation counter |
| `lab:slots:monthly:{userId}` | Shared monthly pool |
| `lab:fusion:weekly:{userId}` | Fusion counter |
| `lab:freetoken:{userId}` | Free Mode bonus token |
| `lab:research:{spellId}` | Research status and start time |
| `lab:visuals:free:{userId}` | Lifetime free animation counter (cap: 3) |
| `lab:animation:queue` | Animation generation queue for designer review |
| `llm:ratelimit:{provider}` | LLM call counter per provider per minute |
| `progression:events` | Redis pub/sub channel for XP events |
| `community:board:elemental` | Cached elemental leaderboard JSON |
| `session:{userId}` | Active WebSocket connection metadata |
| `subscription:{userId}` | Cached subscription tier for fast gate checks |

---

# 24. Implementation Phases (Full Roadmap)

| Phase | Features | State |
|---|---|---|
| 1: Core loop | Game Service + WebSocket battles, 36 base spells with full classification, HP/MP/Will mechanics, Continuous/Channeled/Trap/Charged resolution, summon state tracking, terrain modifiers, interruption system, win/loss | Playable and demoable |
| 2: Progression | Spell XP, proficiency tiers, Circle XP, elemental affinity tracking, Progression Service live | Players have reason to return |
| 3: Lab and creation | Spell creation with LLM + classification + image generation, research timers, validation layer including classification validation, Tower assessment batch cron | Game becomes a platform |
| 4: Social layer | Halls, friends, community boards with classification filters, matchmaking, Animus ranked, Freestyle Mode | Game becomes a community |
| 5: V1 complete | Arc quests full content, avatar unlocks, Free Mode, onboarding, all 36 base spells balanced | Full V1 shipped |

**Note:** the actual build order used for this project inverts phases 1 and 3 — spell creation (Lab) and battles ship together first as a combined "Phase 1: Creation + Battles" release, ahead of the progression layer. See the companion document, *Arcanis Phased Build Plan*, for the implementation-specific sequencing and locked design decisions used for that build.

## Version Roadmap

| Version | Key Features |
|---|---|
| V1 | All Phase 1-5. Zero-cost infrastructure. Contact form for paid features. |
| V1.5 | Payment system live (Lemon Squeezy). Community reactions/follows. Battle log replay. Cross-element and terrain arcs. Animation feature activated. |
| V2 | Multi-cast (Circle 4), full fusion system with category compatibility layer, spell-specific minigames, Hall vs Hall events |
| V3 | Per-spell unique minigames, fusion registry expansion, multiple simultaneous summons, full arc narrative content |
| V4 | Duel replay sharing, friend challenge links, community spell voting, expanded monetization |

---

# 25. Subscription Tiers

Payment processing via Lemon Squeezy (Merchant of Record, handles global VAT). Contact form only at launch. Tier gates built into V1 codebase behind feature flags.

| Feature | Free | Ember $4.99/mo | Archmage $11.99/mo | Sovereign $24.99/mo |
|---|---|---|---|---|
| Spell creation slots/week | 3 | 5 | 7 | 15 |
| Fusion slots/week | 2 | 3 | 4 | 8 |
| Monthly shared pool | 10 | 15 | 20 | 30 |
| Free Mode bonus Lab tokens/week | 1 | 3 | 3 | 3 |
| Spell + fusion animation generations | 3 lifetime | 5/month | 15/month | Unlimited |
| Freestyle sessions/day | 3 | 5 | Unlimited | Unlimited |
| Tower assessment wait | 6 hours | Next batch (max 1h) | Next batch | Next batch |
| Sunday Arc Week 1 and 2 | Full access | Full access | Full access +2h early | Full access +4h early |
| Sunday Arc Week 3 and 4 | Read only | Full participation | Full participation | Full + 4th part |
| Profile badge | None | Ember sigil | Archmage frame | Sovereign frame |
| Name color | None | None | None | Yes (community + battle) |
| Hall creation cost | Full cost | Full cost | 50% reduced | Waived |
| Featured Mage eligibility | No | No | Yes | Guaranteed monthly |
| Chaosborn avatar | Contact form | Contact form | Included | Included |
| Gross margin (after Lemon Squeezy) | N/A | ~78% | ~74% | ~86% |

**Note:** Sovereign 4th Sunday Arc part: personal Tower address. LLM generates a single paragraph in the Tower's voice referencing the player's actual spells, circle, affinity, classification preferences, and recent battle history. Entirely personal. No player sees another's 4th part.

---

# 26. Handoff Context for New AI Instance

**Critical:** READ THIS SECTION FIRST before referencing any other section. This is the complete continuation context.

## 26.1 What Arcanis Is

A full-stack competitive magic RPG platform. Portfolio indie project by Umesh Chandra Tirumani. Two-way design communication is expected and required. Always give an honest review of design decisions. Push back where warranted. The designer prefers direct intellectual challenge over validation and makes precise corrections when a direction contradicts the project's foundations. He thinks at ambitious scope and works intuitively. Do not seek approval for obvious decisions. Make a call and flag it.

The project was originally named "Magic Spar." It has been renamed to **Arcanis**. All references to Magic Spar in prior documentation refer to the same project.

## 26.2 Complete Locked System Inventory

### Core Stats and Will
- Three stats: HP, MP, Will (hidden 0-500, never shown, never explained in UI)
- Will regen via regen spells: NEVER disclosed. Hidden mechanic for player discovery.
- Will growth: circle-up (+25), full arc completion (+15), breadth bonus every 3rd spell reaching new tier across roster (+10), close battle wins (sub-20%: +1, sub-10%: +2, sub-3%: +3, max 3 per circle, resets on circle-up)
- Will does not decay. Will does not grow from direct proficiency tier advances.
- Three casting states: full power, knockoff cast, fail (MP still consumed)

### Circle System
- 10 circles max. Undisclosed. Cap never shown.
- Multi-cast and fusion: V2 only. No player reaches Circle 4 on V1.
- Circle assessments from Circle 5: written (Tower batch) + battle (defeat assessment mage). No quest chain alternative from Circle 5.

### Spell Classification
- Two axes: Category (10 types) and Cast Type (5 types). Both assigned by LLM at creation.
- Categories: Attack, Defense, Regen, Debuff, Buff, Drain, Environmental, Summon, Physical, Hybrid.
- Summon: available from Circle 1. Always Continuous consumption. Scales with circle, Will, Mana Quality, affinity. Unstable if Will drops to Failing. One summon active at a time in V1.
- Summon mode locked design: Autonomous (one directive assigned at summon time, fixed for battle) vs Controlled (skill chosen each turn). Directives available are derived from the summon's actual skill set, not a fixed menu. Autonomous gets ~70-75% of Controlled's stat ceiling. Both pay maintenance drain per turn plus skill-use drain per activation.
- Physical: Combat Mage category. Lower Will cost. Proficiency grows 1.5x faster through battle wins specifically (not other proficiency sources).
- Hybrid: Circle 2 minimum. 20% higher Will cost.
- Cast Types: Instant, Trap (formerly Reactive), Charged, Continuous, Channeled.
- Trap locked design: condition emerges from spell concept via LLM, not fixed enum. Visibility (hidden/visible) is creator's choice at creation. Hidden trap costs more Will/MP (upfront if one-shot, per-turn if sustained) but never loses effect power. Trigger of a hidden trap is revealed in the battle log after firing.
- Charged, Continuous, Channeled spells: interruptible. Every charging or continuous spell can be interrupted by damage exceeding interruption_threshold or Will dropping to Failing state.
- Channeled = next step on Charged: charged buildup + continuous persistence.
- Variable damage on Continuous and Channeled based on turns maintained, current MP level, scaling_factor, mp_modifier stats.

### Summon Stat Caps
- Basic summon: HP 20-60, attack 5-15/turn, 1 behavior
- Advanced summon: HP 60-150, attack 15-35/turn, 2 behaviors
- Mega summon: HP 150-400, attack 30-80/turn, 3 behaviors

### Elements and Amicability
- 12 elements: Fire, Water, Wind, Earth, Lightning, Void, Arcane, Light, Shadow, Nature, Frost, Chaos
- Amicability table: locked in Section 4.1
- Fusion compatibility: amicability table + classification category compatibility layer

### Spell System
- 4 LLM call surfaces only: spell creation, fusion research, Tower batch, Freestyle turns
- LLM NEVER called during Normal Mode or Free Mode battle resolution
- Image generation fires in parallel with LLM at spell creation: Hugging Face FLUX. Color derived from spell identity NOT from fixed element color map.
- Research time: stopwatch only. No countdown. No time disclosed.
- First 3 spells if above requirements: stored locked. No restriction language.
- Spell card design locked: dominant image, dark gradient bottom panel with name + lore line only (never stats), element icon in corner, tier communicated via border complexity (not color), border/accent color from image dominant color.

### Proficiency and Tower
- 5 proficiency tiers. Tower assessment: 6-hour batch window. Free-text answers. Pass/Fail only.
- At least 2 questions per tier specifically about classification category and cast type.
- Awakened: Tier 5 + Elemental Affinity Threshold 3 minimum. Mega-tier Awakened needs Threshold 5.
- No Elemental XP ever deducted.

### Battle and Modes
- Battle state tracks: active Continuous/Channeled spells, Trap slots, summon state, interruption thresholds.
- Freestyle Mode: pure imagination. No stats. No classification constraints. LLM judges everything. 10 turn limit. 4 skill levels. Terrain applies. Win/loss recorded only.
- Disconnect: auto-cast random Instant spell if timer expires (Continuous/Channeled collapse safely). Forfeit at 60s.

### Visuals
- Spell card image generated for ALL spells and fusions at creation (Hugging Face FLUX, zero cost).
- Image color from spell identity, NOT fixed element color map.
- Animation: deferred until 10 Ember subscribers. Feature flag. First 3 per account free.
- Terrain: 15 generated static backgrounds with CSS keyframe animation layers. No video files.

### Infrastructure
- Four Render accounts strategy: one free tier per service. UptimeRobot pings Game Service.
- Zero cost launch: Render free x4, Upstash Redis free, Supabase free, Groq free (or Gemini/OpenRouter), Hugging Face free, Vercel free. ~$1/month.
- Payments: contact form only at launch. Lemon Squeezy when traction confirmed.
- In-game currency: Aether Shards. Chaosborn: paid unlock via contact form.
- AWS as migration target when Render limits become real constraints.
- LLM provider is user-configurable at setup time (Groq, Gemini Flash, or OpenRouter), abstracted behind a single provider layer. Image generation uses Hugging Face FLUX regardless.

## 26.3 Current State of the Project

Architecture is fully complete. Technical stack is locked. Spell classification system is fully designed and locked, including the previously-open design gaps: spell card layout, summon behavior/mode system, Physical proficiency growth multiplier, and Trap condition/visibility system. The project has been renamed from Magic Spar to Arcanis. The build order has been revised: spell creation (Lab) and multiplayer battles ship together as the first release, ahead of the progression system, to validate the core loop before building the grind layer.

## 26.4 What Has NOT Been Designed Yet

- Individual arc quest chapter task details beyond structure (content task)
- Circle assessment exam question pool (broader than single-spell Tower assessment)
- Avatar visual art direction and generation prompts
- Remaining element minigame designs beyond the Phase 1 group-based placeholders
- Notification copy and push notification content
- Aether Shard alt creation exact cost (number not set)
- Hall emblem and customization details
- Summon cap in V1: confirmed as 1 active summon. V2 multi-summon design not started.

## 26.5 Key Terminology Quick Reference

| Term | Definition |
|---|---|
| Circle | Character level. 10 max, undisclosed. Cap never shown to players. |
| Will | Hidden mental capacity stat (0-500). Hard gate on spell access. Never displayed. Never explained. |
| Mana Quality | Character sub-stat. Affects regen spell effectiveness and summon strength. |
| Awakened Spell | Proficiency Tier 5 + Channeler affinity minimum. Also called Enhanced Spell. |
| Summon | Spell category. Manifests a persistent beast or spirit. Always Continuous consumption. Available from Circle 1. Autonomous or Controlled mode chosen at creation. |
| Physical | Spell category. Combat Mage. Infuses body/weapon with elemental energy. Lower Will cost. 1.5x proficiency XP from battle wins. |
| Hybrid | Spell category. Two categories combined. Circle 2 minimum. 20% extra Will cost. |
| Trap | Cast type (formerly Reactive). Set in trap slot, triggers on condition. Does not consume turn action on trigger. Visibility chosen at creation. |
| Charged | Cast type. 1 turn buildup, amplified release next turn. Interruptible. |
| Continuous | Cast type. Persists across turns with maintenance cost. Interruptible. Variable damage. |
| Channeled | Cast type. Charged buildup + Continuous persistence. Highest ceiling. Most interruptible. |
| Interruption Threshold | Spell stat. Damage amount that breaks a Charged/Continuous/Channeled spell mid-execution. |
| Animus | Ranked multiplayer mode using actual grown character. |
| Open Brawl | Casual multiplayer mode. No restrictions. |
| Freestyle Mode | Pure imagination battle. LLM judges. No stats. No classification constraints. |
| Element Sovereign | Affinity Threshold 7. Rarest title. Mythic status. |
| Research Time | Post-creation cooldown. Stopwatch only. No time disclosed. |
| Fusion Registry | Pre-generated fusion outcomes. Built in Lab, not at battle time. |
| Aether Shards | In-game currency. Earned through Animus wins, arc completions, circle-ups. |
| Hall | Player alliance. 30 members max. Social and identity, no mechanical buffs. |
| Tower Batch | 6-hour cron evaluating all pending proficiency assessments in one LLM call. |
| The Ashen | Basic starter avatar. Balanced stats. Small bonus to all elements. |
| Chaosborn | Paid unlock. Chaos +30%, all others -8%. Prestige identity pick. |
| Four Render Accounts | Zero-cost launch strategy. One Render free tier per service. |
| Feature Flag: Animations | Spell animations built but disabled at launch. Activates at ~10 Ember subscribers. |
| Lemon Squeezy | Payment processor when traction confirmed. Merchant of Record. Handles global VAT. |

---

*End of Master Documentation. For implementation sequencing and agent-facing build instructions, see the companion document: Arcanis Phased Build Plan.*
