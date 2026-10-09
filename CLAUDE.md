# Arcanis

Commercial competitive magic RPG (formerly "Magic Spar", same project). Players describe a spell in natural language; an LLM generates a balanced, classified spell plus card art; players battle with those spells. The creation loop is the product. Battles are its proof surface.

Founder: Umesh. Expect two-way design communication. Be direct, push back on weak decisions, make obvious calls yourself and say so, ask only on real decisions.

## Writing rule

Never use em dashes anywhere: code, comments, commit messages, docs, UI copy. Use commas, colons, semicolons, or parentheses.

## Source of truth

Docs live in `docs/`. Precedence on conflict:

1. `docs/Arcanis_Master_Documentation_v7.md` (the bible; every system, number, and locked decision)
2. `docs/Arcanis_Phase_1_Build_Plan_v2.md`
3. `docs/Arcanis_Phase_Plan_v2.md`
4. `docs/handover.md` (decision history; its phase status may be stale, trust the repo)
5. `docs/archive/` (superseded, reference only, never build from it)

If code and docs disagree, or two docs disagree, **flag it to the founder. Do not resolve it silently.** If something in a doc looks structurally wrong to build, flag it and propose a fix rather than building it broken or deviating quietly.

When a decision changes: update the Master Doc first, then the Phase Plan, then the Build Plan, bump version numbers, and note what changed at the top of each.

## Locked decisions (do not reopen without the founder)

- **Will** is hidden (0 to 500 internal). Never sent to the client as a number, bar, tooltip, or anything that lets the client reconstruct it. The server emits a band key; feedback text comes from rotating, randomized, pre-verified variant pools (6 to 8+ per band). Tune the strings, never the secrecy.
- **Async-first PvP.** The opponent is a stored player profile snapshot piloted by the rule-based engine using a playstyle vector (aggression, risk tolerance, resource discipline). Zero LLM cost. Live Duel is a later, liquidity-gated layer.
- **Two-Step Verification on every AI surface.** Layer 1 generation, then 2a deterministic schema and stat clamp (100%), 2b moderation classifier on text and images (100%), 2c small-model semantic check only when 2a or 2b flags. Silent retry before any user-visible failure. No unverified AI output reaches a user.
- **Two currencies, never merged.** Spark: hard currency, the only thing that spends against generation cost, never earned through gameplay, append-only ledger, atomic reserve/commit/refund. Aether Shards: soft, earned, cosmetic and social only. XP is progression only and never purchasable.
- **Identity.** Magic-link auth. Viewing is anonymous; any generation requires a session, checked at the gateway before any provider is called. Per-identity, per-device, and per-IP rate limits. First free Spark grant once per device.
- **Classification system, elements, amicability, terrains, tiers and stat caps** are locked as specified in the Master Doc. The engine and validation support the full taxonomy even where the creation form exposes a subset.
- **Provider abstraction.** Every external provider (text, image, moderation, email) sits behind an interface in `shared/`, selected by one env var. No provider request or response shape in business logic.

## Engineering rules (treat violations as bugs)

- Every path that makes an AI call needs Two-Step Verification and a Spark deduction path.
- No unauthenticated path can trigger spend.
- Never trust client-computed minigame results; validate plausibility server-side and clamp.
- Every provider call logs surface, provider, model, units, latency, cost estimate, and outcome.
- Secrets live in `.env` only. Never commit keys.
- Black and gold is the default palette for any new design work unless told otherwise.

## Repo specifics

<!-- To be filled in by Claude Code after auditing the repo: layout, how to install, run each service, run tests, run migrations, run the balance harness and cost report, and any conventions found in the code. -->
