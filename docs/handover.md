# Arcanis: Handover

**Purpose:** paste this file plus the docs listed below into a new Claude account to continue with full context. Read this file first, then the Master Documentation v7.0. Date written: 2026-10-09.

---

## 0. How to Start the New Conversation

Upload these files, then send this as the first message:

> I'm continuing a project called Arcanis. Read handover.md first, then Arcanis_Master_Documentation_v7.md, then the Phase Plan and Phase 1 Build Plan. Confirm you've absorbed the locked decisions and the open items, then tell me the next step you'd take as co-founder. Push back where my decisions are weak.

Files to upload (all in this package):

| File | Role |
|---|---|
| `handover.md` | This file. Context, decisions, working style, next steps |
| `Arcanis_Master_Documentation_v7.md` | The bible. Every system, number, locked decision. Authoritative |
| `Arcanis_Phase_Plan_v2.md` | Phase sequencing, risks, hypotheses, gates |
| `Arcanis_Phase_1_Build_Plan_v2.md` | Agent-facing implementation spec for Phase 1 |
| `Arcanis_Market_Assessment.md` | The research report that triggered the strategic pivot |
| Older originals (optional, not in this package) | `Arcanis_Master_Documentation (1).md` (v6.0), `Arcanis_Phased_Build_Plan (1).md` (v1.0), `MagicSpar_GDD_v5.md`. These are your original uploads in the Arcanis Project. They are superseded by v7.0 and are reference only. Do not build from them. Upload only if you want the new chat to see the history |

Precedence if documents conflict: Master Doc v7.1 > Phase 1 Build Plan v2.1 > Phase Plan v2.1 > older originals (file names keep v7 and v2). Flag conflicts to the founder rather than resolving silently.

---

## 1. The Project in One Paragraph

Arcanis (formerly "Magic Spar", same project) is a competitive magic RPG platform. Players describe a spell in natural language, an LLM generates a balanced, classified spell plus card art, and players battle with those spells. The founder, Umesh Chandra Tirumani, originally framed it as a portfolio project. On 2026-10 he **pivoted it to a revenue-generating commercial product** and asked for the strongest possible version of it ("SSS grade"). Everything in v7.0 follows from that pivot.

## 2. Working Style (important, follow this)

- Direct, no filler. Lead with the answer.
- Honest, rigorous evaluation over validation. He explicitly prefers intellectual challenge and pushback. Do not flatter. Flag weak decisions.
- Make a call on obvious decisions and flag it; do not ask approval for everything.
- He makes precise corrections when a direction contradicts the project's foundations. Take those seriously; some decisions are locked (Section 4).
- **Never use em dashes.** Use commas, colons, semicolons, or restructure.
- Design work (UI, infographics, decks) defaults to a black and gold palette unless he says otherwise.
- He thinks at ambitious scope and works intuitively. He tends to want parallel delivery ("all at once").
- He is a pre-final-year B.Tech CS student who builds full-stack AI products. Technical depth is fine; skip basics.

## 3. How We Got Here (decision history, condensed)

1. **Original plan:** portfolio-grade, zero-cost infrastructure, live PvP, free-tier LLM, four-service architecture, v6.0 Master Doc.
2. **Market assessment (Arcanis_Market_Assessment.md):** graded B+ as portfolio, C- as business. Key findings: free LLM tiers cap near 50 to 100 concurrent users; live PvP needs liquidity the product will not have; CCG market is a graveyard; hidden systems can hurt retention; $24.99/mo tier unrealistic; 85% of gamers dislike AI in games; day-1 churn around 70%.
3. **My (Claude's) calibrations of that report:** agreed with most of it, but argued (a) LLM balance risk is overstated because the stat clamp already bounds output, and the real risk is strategic imbalance inside the caps (solved by playtesting and a balance harness, not by a better model); (b) the CCG comparison is imperfect because Arcanis cards are player-authored; (c) the hidden-Will critique is the most actionable point.
4. **Founder's pivot to commercial.** My founder-level reframe: the **creation loop is the product, battles are the proof surface.** Top recommendations: async PvP, credit-based creation economy, zero-friction share loop, real COGS budgeting, cost-tiered models, trimmed launch scope, repriced tiers, content moderation.
5. **Founder's responses and corrections (these shaped v7.0):**
   - Accepted async PvP, credit economy, repricing, trimmed scope.
   - **Two-step verification for every AI surface** (not only spell creation): "users are paying after all." Also applied to moderation. He wanted a mid-tier LLM plus rule-based verification rather than a weak model alone.
   - **Will stays hidden. Firm, locked.** Wants atmospheric text like "your concentration is falling" but no meter. Rationale: the game is an expanding world where players do the work of understanding it, not a static, fully legible game. My addition he accepted: rotating variant phrasings per threshold so players cannot reverse-engineer a hidden meter.
   - **Anonymous spell creation rejected as a cost-abuse vector.** Fixed as: viewing is anonymous, generation requires a magic-link identity (passwordless email, instant), plus fraud checks and rate limits.
   - Worried that AI-piloted battle bots would hit costs. Clarified: async opponents are **rule-based, zero LLM cost**. Freestyle Mode is the only LLM-cost battle surface and is session-capped.
   - Asked me to audit the economy in his files. Finding: he had a **progression economy (XP, Aether Shards) and a quota system, not a monetization economy.** Resolution: Spark (hard, purchasable, only currency touching generation cost, never earned in play) and Aether Shards (soft, earned, cosmetic and social only), strictly separated.
6. **My rating at that point:** A- as design, B+ as execution-ready plan. Unproven: cost numbers, conversion, viral coefficient. Unresolved: provider choice and measured cost, onboarding, async difficulty scaling, moderation specifics.
7. **Docs written in this session:** Master Doc v7.0, Phase Plan v2.0, Phase 1 Build Plan v2.0 (all in this package).

## 4. Locked Decisions (do not reopen without a strong reason)

- **Will** is hidden (0 to 500 internal), never shown as number, bar, or tooltip, never explained. Feedback strings come from rotating variant pools (6 to 8+ per band, randomized, pre-verified).
- **Async-first PvP:** opponent is a stored player profile piloted by the rule-based engine using a playstyle vector (aggression, risk tolerance, resource discipline). No LLM. Live Duel is a later, liquidity-gated prestige layer.
- **Two-Step Verification is universal:** Layer 1 generation; Layer 2a deterministic clamp (free, 100%); Layer 2b moderation classifier (cheap, 100%); Layer 2c small-model semantic check on flags only. Silent retry before any user-visible failure.
- **Two currencies:** Spark (purchasable, spends against generation cost, never earned in play, rolls forward within a cap) and Aether Shards (earned, cosmetic and social only). XP is progression only and never purchasable.
- **Identity:** magic-link only. Anonymous viewing, authenticated generation. Per-device and per-identity caps. First free Spark once per device.
- **Pricing structure:** Free, Ember (~$4.99), Archmage (~$9.99 to 11.99), Founder's Pass (~$99 to 149 per year or one-time), Spark packs (~$2.99 / $7.99 / $19.99). The $24.99 recurring tier is retired. All numbers are estimates until Phase 0 measures real cost.
- **Growth loop:** spell card is the ad unit; public preview page with OG image; referral Spark bonus; battle results as a second share surface.
- **Classification system** (10 categories, 5 cast types, Summon modes, Trap visibility, Physical multiplier), elements, amicability table, terrain roster, proficiency, affinity, circles, avatars: unchanged from v6.0 and locked.
- Model tiering: mid-tier for constrained stat generation; spend more only where output is player-visible and not clampable (flavor, lore, Will phrase pools).

## 5. Phase Status

*Updated 2026-10-09 after the repo audit. For live status read `PROGRESS.md` at the repo root; this table is a summary and can go stale.*

| Phase | Status |
|---|---|
| Master Doc | v7.1 (2026-10-09) |
| Phase Plan | v2.1 (2026-10-09) |
| Phase 1 Build Plan | v2.1 (2026-10-09) |
| Phase 0 (measure costs, pick providers, balance harness) | **Not done.** No cost telemetry, cost sheet, harness or corpus. Now folded into Phase 1a blockers plus the soft-launch measurement. |
| Phase 1a (creation soft launch) | In progress in `phase0/` (creation and share roughly 50 to 60 percent). Blockers listed in Build Plan v2.1 Section 15, Track A. |
| Phase 1b (async battles) | Early. The root prototype's battle code is off-spec and archived; rebuild per Track B. |
| Everything after | Not started |

The earlier line "No code has been written" is no longer true: see `docs/status_report.md`.

## 6. Decisions I Made That the Founder Has Not Explicitly Confirmed (verify)

**Resolved 2026-10-09:** all six confirmed by the founder, with changes: (1) launch subset is all 12 elements, Attack/Defense/Regen/Debuff/Drain, Instant only until battles ship, Trap and Charged return with battles; (2) confirmed, and the `phase0/` "Tower" narrative voice is removed too; (3) confirmed, plus a fake door in 1a; (4) confirmed, k-factor fixed to the standard definition and numeric thresholds written before soft launch (Phase Plan v2.1); (5) confirmed, server-side scoring from raw input events; (6) confirmed, one paid instance for the monolith. Original text kept below for history.

1. **Launch creation subset:** categories Attack, Defense, Regen, Debuff, Drain; cast types Instant, Trap, Charged at launch; the rest as timed content drops. The engine and validation must still support everything because platform spells use it. This softens the earlier "full classification at launch" position.
2. **Tower assessment questions are not generated in Phase 1** (cost with no value until Tower ships in Phase 3). Backfill later.
3. **Payments moved to Phase 2** to keep launch lean; Phase 1 Spark is grant-only. Trade-off: slower learning on willingness to pay.
4. **Gate thresholds** in the Phase Plan (50% signup to first creation, 15% share rate, 15% day-7 retention, viral coefficient 0.3 encouraging) are starting hypotheses, not facts. Adjust after Phase 0 and write the adjusted numbers down before launch.
5. **Minigame results must be server-validated** because async PvP otherwise trusts the client.
6. **Render free tier sleeping can leak signups** at the first click; plan paid instances before launch.

## 7. Known Risks and Honest Caveats

- Every cost, margin, conversion, and price number is an estimate. The economy is well designed but unproven.
- The growth loop has zero real-world signal. The viral coefficient is the metric that decides if it compounds.
- The market report's bottom line still stands in spirit: solo browser CCG-adjacent games rarely earn much. The async plus creation-economy plan reduces structural risk but does not guarantee revenue.
- "AI-generated content" is culturally unpopular with gamers. Positioning must frame the LLM as a creative collaborator.
- Cold-start async PvP needs enough real profiles in the pool; the vs-System bot fallback covers the gap but must be labelled honestly.
- Small naming collision: "Spark of [Element]" (affinity Threshold 1 title) versus Spark the currency. Consider renaming the title later.
- ~~Phase 1 Build Plan has one SQL typo to fix when writing migrations if still present: `shard_ledger.created_at` default must be `DEFAULT NOW()`.~~ Checked 2026-10-09: the Build Plan SQL already reads `DEFAULT NOW()` and no shard_ledger table exists in the repo; the stale note was removed in Build Plan v2.1.

## 8. Open Items (not yet designed or decided)

- Provider choices and measured cost per generation (Phase 0)
- Exact Spark pricing, pack sizes, weekly free allowance, rollover cap, referral and signup grant sizes
- Live Duel concurrency threshold
- Playstyle vector exact weighting formula and async difficulty scaling once circles exist
- Moderation classifier choice, ban and appeal flow details
- Fraud heuristics specifics
- Arc quest chapter content, circle assessment question pool, avatar art direction, remaining element minigames, notification copy, Aether Shard alt cost, Hall customization, multi-summon design for V2
- Infrastructure upgrade trigger numbers (need real usage data)

## 9. Recommended Next Steps

*Superseded 2026-10-09 by Build Plan v2.1 Section 15 and `PROGRESS.md`. Kept for history.*

1. **Phase 0 (1 to 2 weeks):** shortlist 2 to 3 candidates each for text model, image model, moderation. Run 100+ real prompts. Record cost, latency, schema failure rate, 2a clamp rate, moderation false positives. Produce a one-page cost sheet. Decide Spark pricing from measured numbers.
2. Build the **balance harness** early; it finds category and cast-type imbalance before players do.
3. Scaffold the monorepo per the Phase 1 Build Plan Section 3 and 15, starting with shared caps tables, provider interfaces, and the Layer 2a library with tests.
4. Confirm the six unconfirmed decisions in Section 6 with the founder.
5. Set provider spend caps and alerts before any real traffic.

## 10. Prompts That Work Well for This Project

- "Act as co-founder. Review [decision]. What would break at 1,000 users? What is the cheapest way to test it?"
- "Turn Section X of the Master Doc into implementation tickets for the coding agent."
- "Write the Layer 1 prompt and JSON schema for spell creation, constrained to the launch subset, then list every way the output could violate Layer 2a."
- "Design the playstyle vector scoring function and give test scenarios."
- "Stress-test the Spark ledger design for abuse and double-spend."

## 11. Document Maintenance Rule

The Master Doc v7.0 is the bible. When a decision changes, update the Master Doc first, then the Phase Plan and Build Plan, and note the version bump at the top. Keep the handover current when a phase completes.
