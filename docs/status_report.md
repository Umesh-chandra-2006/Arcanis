# Arcanis: Status Report

**Date:** 2026-10-09
**Scope:** Read-only audit of the repo against Master Doc v7.0, Phase Plan v2.0, Phase 1 Build Plan v2.0, and handover.md.
**Author:** Claude Code (audit session). Nothing was changed in code during this audit.

> **This report is history (updated 2026-10-11).** It is the audit of 2026-10-09 and almost every finding below has since been fixed on branch `track-a` (Track A tasks A0 to A15 and A17). For the current state read `PROGRESS.md`; for the task checklist read `docs/tasks.md`; for the deploy steps read `docs/launch_checklist.md`.

> **Disclaimer (2026-10-10): `phase0/` stays as `phase0/`.** The founder decided not to promote the `phase0/` app to the repo root after the root prototype is archived (founder action F9). Wherever this report, or any doc, says "the phase0 app" or refers to paths under `phase0/`, that is the permanent location of the canonical app, not a temporary one. The name is historical: it is the Phase 1 product codebase, not a Phase 0 throwaway. Founder decisions taken after this audit are recorded in `PROGRESS.md` and Master Doc v7.2; where they differ from this report, they win.

---

## 0. Headline (read this if nothing else)

1. **Phase 1 is not nearly complete.** Measured against the Definition of Done (Build Plan Section 1), **zero of nine items are fully met** in either codebase. The creation and share half is roughly 50 to 60 percent of spec. The battle half is roughly 10 to 15 percent of spec, and the code that exists should be rewritten rather than extended.
2. **Phase 0, as the docs define it (measure cost, pick providers, balance harness), has not been done.** There is no cost telemetry, no cost sheet, no measured number of any kind, no balance harness, no test corpus, and no cost-report tool. The `phase0/` directory is a *demand-validation prototype* (creation plus share plus reviews), which is useful but is a different deliverable.
3. **There are two separate apps in the repo that share nothing at runtime.** `phase0/` (where every recent commit landed) and the root app (`client/`, `server/`, `shared/`, `drizzle/`). Neither matches the Build Plan architecture (three services, Supabase Postgres, Upstash Redis).
4. **Locked decisions are violated in both apps.** The root app sends Will to the client as raw numbers. `phase0/` has replaced magic-link-only identity with a mandatory password. No AI image is moderated anywhere. Minigame accuracy is client-trusted. Details in Section 5.
5. **The `shard_ledger` typo did not make it into migrations, because no `shard_ledger` table exists at all.**

---

## 1. What Is in the Repo

| Path | What it is | State |
|---|---|---|
| `phase0/` | Creation and share prototype: Express + tRPC + React 19 + Vite, MySQL via Drizzle (tables prefixed `p0_`). Magic link (now plus password), Spark balance, Power Budget stat engine, LLM writes flavor text only, FLUX image via Hugging Face router, public share page with OG tags, reviews, admin metrics. | Most recent work (commits 7be93c8 to 6dd18d4). Type-checks clean. 19 tests pass. Deploy config for Vercel (client) + Render (API). |
| root `server/`, `client/`, `shared/`, `drizzle/` | Older full-game prototype built on a Manus web template. Password auth, LLM-generated stats with partial clamp, weekly slot quota, bot battles over tRPC + Socket.io, Hearth social feed. | Not touched since the initial commit except hardening. **Type-check fails (5 errors).** 9 tests pass. |
| `arcanis-ui/` | Standalone UI component prototype (dashboard, spell card). Duplicates `client/src/components/game/`. | Orphaned. |
| `references/`, root `README.md`, `server/_core/{map,voiceTranscription,dataApi,notification,heartbeat}.ts`, `template.json` | Manus template documentation and helpers (maps, voice, OAuth). Not project code. | Dead weight. |
| `scratch/` | FLUX endpoint test scripts. | Throwaway. |
| `todo.md` | Root-app checklist written against the old live-PvP design (30s turns, real-time queue). | Stale; contradicts async-first. |
| `docs/` | Master Doc v7, Phase Plan v2, Build Plan v2, handover, market assessment. `docs/archive/` is referenced by CLAUDE.md but **does not exist**. | Authoritative. |

Stack actually in use: Node + Express + tRPC 11, React 19, Vite 8, Tailwind 4, Drizzle on **MySQL** (`mysql2`), pnpm 10. No Zustand, no Supabase, Upstash only as an optional REST client in the root app.

---

## 2. Phase 0 Audit (Phase Plan Section 4 deliverables)

| Item | Exists? | Real or stub | Notes |
|---|---|---|---|
| Provider choice: text | Partial | Default config, not a measured choice | `phase0/server/llm.ts`: Groq `llama-3.1-70b-versatile` primary, Gemini `gemini-1.5-flash` and OpenRouter Llama 3.1 70B fallback. **Both of the first two model IDs are likely retired by their providers; verify with a live call.** If the primary is dead, every creation pays a failed round-trip before fallback. |
| Provider choice: image | Partial | Default config | `phase0/server/image-generation.ts`: FLUX.1-schnell via Hugging Face router, cycling through four inference providers, 512x512. No cost tracking. |
| Provider choice: moderation | **Missing** | N/A | Only a 14-word profanity regex (`phase0/shared/profanity.ts`). No classifier, no image moderation. |
| Provider choice: email | Yes | Real | Resend or Brevo via `EMAIL_PROVIDER`. This is the one provider behind a proper env switch. |
| Cost sheet | **Missing** | N/A | No document, no data. |
| Cost per creation vs $0.08 threshold | **Unknown** | N/A | No provider call logs cost, tokens, or units anywhere. `generationMetadata` stores only `generationMs` and Power Budget numbers. |
| Schema failure rate | **Not measured** | N/A | Failures go to `console.error` only. |
| Layer 2a clamp rate | **Not measured / not applicable** | N/A | In `phase0/`, the LLM no longer produces stats (Power Budget computes them), so there is nothing to clamp. In the root app, clamps happen but are not counted. |
| Layer 2c trigger rate (target under 10 to 15 percent) | **Not measured** | N/A | Layer 2c does not exist in either app. |
| Moderation false positives | **Not measured** | N/A | No classifier to measure. |
| Balance harness | **Missing** | N/A | No `tools/balance-harness`, not even a stub. Cannot be built meaningfully until a real battle engine exists. |
| Test corpus (100+ real prompts) | **Missing** | N/A | |
| Cost-report tooling | **Missing** | N/A | No `tools/cost-report`. |

**Verdict:** Phase 0 exit criteria (one-page cost sheet with measured numbers, provider choice per surface) are not met. The fastest honest path to measured numbers is to add per-call cost telemetry to `phase0/` and let real (soft-launch or invited) traffic produce them, plus a scripted 100-prompt run.

---

## 3. Phase 1 Definition of Done (Build Plan Section 1)

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Magic link to first spell card in under 3 minutes | **Partial** | `phase0/` has the flow, but new users are now forced to set a password before reaching Create (`phase0/client/src/pages/AuthVerify.tsx`, `set_password` stage). Not timed or instrumented. Root app has no magic link. |
| 2 | Every AI output passed 2a and 2b, 2c on flags | **Missing** | `phase0/`: stats are deterministic (effectively satisfies 2a for numbers), text gets zod + profanity regex, **images get no moderation at all**, user input is not moderated before the LLM, no 2c, no silent retry with an adjusted prompt (one text attempt). Root: zod + partial clamp, no moderation, no 2c. |
| 3 | Spark atomic deduct, auto-refund on non-user failures | **Partial** | `phase0/server/spark.ts`: deducts before the pipeline and refunds on LLM and moderation failure, but uses a mutable balance row read without a lock (double-spend race, Section 7, H5). Not append-only, no pending state. Root app has no Spark at all (weekly slot counter in Redis that **fails open to unlimited** when Redis is unset, `server/redis-service.ts`). |
| 4 | Two real players battle each other's stored profile with full mechanics | **Missing** | No profile snapshots, playstyle vector, matchmaking, or piloting anywhere. Root has bot-only battles (`server/routers/game.ts`) where the bot picks a random affordable platform spell. Engine handles only Attack / Regen / Drain as flat damage or heal. No cast types, interruption, traps, summons, terrain specials, or Will logic per spec. Terrains are six invented names (`shared/constants.ts`, `TERRAINS`), not the locked 15. |
| 5 | Public preview renders correct OG card on Discord, X, WhatsApp | **Partial** | `phase0/server/_core/app.ts` server-renders OG tags at `/spell/:id`. But: image is the 512x512 square art, not a 1200x630 variant; no referral code; no takedown or 410 path. **Risk:** `phase0/vercel.json` rewrites every path to `index.html`, so if share links point at the Vercel domain (`VITE_PUBLIC_URL` unset), crawlers get no OG tags. Not verified on any real platform. |
| 6 | Analytics capture Section 12 funnel | **Partial** | `phase0/server/analytics.ts` logs about 10 events, with different names from Section 12. No battle, onboarding, `session_day_n`, or `preview_cta_clicked` with referrer. `analytics.track` is a public, unauthenticated endpoint, so anyone can inject events. |
| 7 | No Will number, bar, or tooltip; rotating variant pools | **Violated (root), flagged (phase0)** | Root: battle state broadcast to the client contains `player1Will`, `player2Will`, `willCap` (`server/routers/game.ts`, `BattleState`), `auth.me` returns `willCap`, battle log appends "Will is Broken!" / "Failing" / "Strained" (named, fixed strings). No variant pools exist. `phase0/client/src/components/SpellCard.tsx` shows a "Will" cost stat per spell (decision needed, H9). |
| 8 | Balance harness shows all categories and cast types in band | **Missing** | No harness. |
| 9 | Zero mention of XP, circles, proficiency, Tower | **Violated** | `phase0/` uses "the Tower" as its narrative voice across Home, Create, SignIn, AuthVerify, ShareSpell, SpellCard (27 occurrences in UI files), and generates an `assessment_question` per spell. |

**Score: 0 of 9 done, 4 partial, 3 missing, 2 violated.**

---

## 4. Build Order (Build Plan Section 15)

| Step | Status | Notes |
|---|---|---|
| 1. Scaffold (monorepo, shared caps, zod, provider interfaces, migrations, CI, env templates) | **Deviating / partial** | No services split, no CI (no `.github/`), no `.env.example`. Shared caps and zod exist in both apps (duplicated). Provider abstraction: LLM selected by env var but provider shapes live in the same file as business code; image provider hard-coded; no moderation interface. |
| 2. Phase 0 tooling in repo (cost-report, balance-harness skeletons) | **Missing** | |
| 3. Gateway (magic link, sessions, fraud, rate limits, ledgers, referral, preview endpoints) | **Partial (phase0)** | Magic link yes (token stored in plaintext, spec says hashed). Sessions: 7-day JWT in `localStorage`, spec says httpOnly cookie plus short-lived JWT. Fraud: small disposable-domain list, IP cap on link requests; no device fingerprint, no new-account throttle, no per-identity hourly or daily generation ceiling. Rate limits are in-memory (reset on deploy). Spark ledger partial; shard ledger missing; referral missing. |
| 4. Lab (providers, 2a with tests, moderation, pipeline with retries and refunds, image with OG variant, seed 36 spells, library, research timer) | **Partial (phase0)** | Power Budget engine plus 10 unit tests. Moderation missing. Retries minimal. No OG variant. Seed has 12 spells (4 elements) plus an archivist user, not the 36 Master Doc spells. Root seed has 36 spells but **none of them are the Master Doc 5.6 list** (Fireball, Frostbolt, etc., with duplicates: Gale Force, Arcane Missile, Blizzard twice). No research timer in `phase0/`; root uses a hard-coded 5 second in-process `setTimeout`. |
| 5. Game (state machine, terrain, all cast types and categories, bot, playstyle vector, piloting, matchmaking, minigame validation, persistence, notifications) | **Mostly missing (root stub only)** | See DoD item 4. |
| 6. Frontend | **Split** | `phase0/`: Home, SignIn, AuthVerify, Create, Library, ShareSpell, Reviews, AdminMetrics. Root: Dashboard, Lab, Spells, BattleSelect, Battle (with 6 minigame components), Hearth, wired to the off-spec root backend. No onboarding, no settings, no rematch inbox. |
| 7. Integration and hardening | **Missing** | `phase0/e2e.mjs` smoke script only. |
| 8. Soft launch | **Unknown** | `phase0/` has production deploy config and real email transport. Whether it is live with users is not knowable from the repo. |

---

## 5. Locked-Decision and Engineering-Rule Violations (handover Section 4, CLAUDE.md)

| Rule | Violation | Where |
|---|---|---|
| Will never sent to the client in any form | Raw Will values and cap in every battle state payload (tRPC and Socket.io); `willCap` in `auth.me`; named band strings in the log. Will semantics are also inverted (accumulates upward from 0 toward cap). | `server/routers/game.ts` (BattleState, `resolveCast`), `server/routers/auth.ts` (`me`), `client/src/contexts/AuthContext.tsx` |
| Will feedback from rotating variant pools | No pools exist. Fixed strings only. | `shared/constants.ts` `WILL_STATES`, `server/routers/game.ts` |
| Magic-link only identity | `phase0/` requires a password on first sign-in, and an account with a password **cannot** use a magic link (`EMAIL_HAS_PASSWORD`). Root app is password-only. | `phase0/server/auth-service.ts` (`requestMagicLink`, `signInWithPassword`), `phase0/client/src/pages/AuthVerify.tsx`, commits 324e966, 8ca6683, 6dd18d4 |
| Unauthenticated paths cannot trigger spend | **Holds.** Generation endpoints in both apps are `protectedProcedure`. Caveat: root slot quota fails open (unlimited authenticated generation when Redis is unset). | `server/redis-service.ts` |
| Spark never earned through gameplay | **Holds.** No gameplay grants exist. | |
| No unverified AI output reaches users | **Violated.** Generated images are shown and publicly shared with zero moderation in both apps. Root also stores LLM text with no moderation. | `phase0/server/spell-pipeline.ts`, `server/spell-creation.ts` |
| Never trust client minigame values | **Violated.** `castSpell` accepts `minigameAccuracy: z.number().min(0).max(1)` and uses it directly for damage and Will. A modified client always rolls max. | `server/routers/game.ts` |
| Every AI path has 2-step verification and a Spark deduction path | **Violated in root** (no Spark, no 2b). Partial in `phase0/` (no 2b on images, no 2c). | |
| Every provider call logs surface, provider, model, units, latency, cost, outcome | **Violated everywhere.** | |
| Provider abstraction behind interfaces in `shared/`, one env var each | **Partial.** Email: yes. LLM: env var but no interface separation. Image: hard-coded. Moderation: no interface. | |

Additional root-app holes (not locked decisions, but bugs): the LLM chooses the spell `tier`, and the clamp uses that tier's caps, so a prompt that elicits "Mega" gets 80 to 200 damage (`shared/validation.ts`, `server/spell-creation.ts`). `castSpell` accepts any `spellId` with no ownership, deck, or research-status check.

---

## 6. `shard_ledger.created_at` Typo

Not present in any migration: **no `shard_ledger` table exists** in `drizzle/` or `phase0/drizzle/`. Nothing to fix yet. When the ledger is built, use `DEFAULT NOW()` (or the MySQL equivalent `DEFAULT CURRENT_TIMESTAMP` if we stay on MySQL). Also note: the Build Plan schema as printed already reads `DEFAULT NOW()`, so the typo note in handover Section 7 and Build Plan Section 9 refers to an issue that is no longer visible in the doc text.

---

## 7. Testing Priorities (Build Plan Section 16) and Test Results

| Priority | Status |
|---|---|
| 2a property tests (no input yields out-of-cap value) | **Partial.** `phase0/server/power-budget.test.ts` checks all 16 Phase 0 combinations against caps. That is exhaustive for the current tiny domain but is not property-based and will not scale to the full taxonomy. Root clamp has no tests. |
| Spark ledger concurrency (double-click, parallel requests) | **Missing.** And the code would fail it: `spendSpark` reads the balance row without `FOR UPDATE` and writes an absolute value, so two parallel creations with 1 Spark can both succeed. |
| Battle scenario tests per cast-type interaction | **Missing.** |
| Piloting determinism under fixed seed | **Missing** (no piloting exists; root uses `Math.random`). |
| Auth abuse (token reuse, expiry, same-device grant farming, disposable email) | **Partial.** Disposable domain and email format tested. Token reuse, expiry, grant farming untested. Magic-link verify is select-then-update, not atomic, so a double-click can redeem a token twice. |
| Will leakage (no payload reconstructs Will) | **Missing,** and the root app would fail it. |

**Test runs (2026-10-09):**

| Suite | Command | Result |
|---|---|---|
| Root | `pnpm test` (vitest) | 2 files, **9 passed** (LLM fallback mocks, logout) |
| phase0 | `cd phase0 && pnpm test` | 2 files, **19 passed** (Power Budget, rate limit, email, password hashing) |
| Root type-check | `pnpm check` | **Fails, 5 errors**: duplicate `persistBattleToDb` import in `server/socket-server.ts`; transaction type mismatch in `server/spell-creation.ts` (3x) |
| phase0 type-check | `cd phase0 && pnpm check` | Clean |

Note: phase0 tests load the repo-root `.env` (`injected env (22) from ..\.env`), which holds real provider keys and the real `DATABASE_URL`. Current tests are pure, but any future DB test would run against that database.

---

## 8. Other Structural Findings (for decision H)

Listed for the founder to decide. Nothing here has been fixed.

- **H1. Two codebases, no canonical base.** Recommendation: `phase0/` becomes the base; root battle code is not worth porting.
- **H2. Architecture deviates from Build Plan Section 3** (single Express process instead of three services; MySQL instead of Supabase Postgres; no Redis in `phase0/`).
- **H3. Password auth** (see Section 5).
- **H4. Deterministic stats.** `phase0/` computes every stat from (element, category, cast type) via the Power Budget. That removes stat-balance risk from the LLM, which is good, but it means every Fire / Attack / Instant spell is mechanically identical, and the current subset has only 16 possible stat profiles. Master Doc 5.4 and 6.3 say the LLM generates stats. This is a deviation with a real product cost to the creation loop.
- **H5. Spark ledger** is a mutable balance plus a transaction log with a race condition, not the append-only reserve/commit/refund ledger.
- **H6. Moderation** absent on images, user input, and user reviews (reviews are public UGC with no filter at all).
- **H7. Images stored as base64 data URIs in MySQL text columns.** Fine for a demo, bad for page weight, DB size, and CDN caching.
- **H8. Share and OG:** split-hosting OG risk, square OG image, no referral code, no takedown.
- **H9. Will and Tower copy in `phase0/` UI:** per-spell "Will" cost stat on the card; "Tower" narrative voice (DoD item 9).
- **H10. Security:** public `auth.accountStatus` lets anyone check whether an email is registered and whether it has a password (enumeration); JWT in `localStorage` with 7-day life and no revocation; plaintext magic-link tokens; non-atomic token redemption; public `analytics.track`; in-memory rate limits; root fail-open quota.
- **H11. LLM model IDs likely retired** (verify).
- **H12. Will bands versus avatar baselines (doc-level).** Master Doc 2.1 defines absolute Will bands (Sharp 300 to 500, Focused 150 to 299, Strained 80 to 149, Failing 30 to 79, Broken 0 to 29), but Master Doc 13 gives avatars 95 to 125 Will. A new player therefore starts in Strained, can never be Sharp or Focused at launch, and drops to Failing after two to four Basic casts (10 to 25 Will each). Either the bands are relative to the avatar's pool, or the baselines are wrong. This decides how battles feel and must be settled before the engine is written.
- **H13. Dead code and scope creep:** Manus template helpers, `references/`, `arcanis-ui/`, `ComponentShowcase.tsx`, root README (template docs), and Hearth (a Phase 4 social feed) in the root app.
- **H14. Elements limited to four in `phase0/`** (Fire, Water, Earth, Wind). No doc restricts elements; the launch subset restricts categories and cast types only.

---

## 9. Doc Conflicts Found While Reading (flagged, not resolved)

1. **Onboarding order (Master Doc internal).** 18.1 and 23.2 step 4 say the player is "dropped directly into a minimal creation flow, no tour". 18.2 steps 4 to 6 put a guided system battle before the Lab. Build Plan `/start` follows 18.2. DoD item 1 (first spell in under 3 minutes) is much harder with a battle first.
2. **XP mention.** Master Doc 18.2 step 5 reveals "Spell XP" after the first battle. Build Plan DoD item 9 forbids any XP mention in Phase 1.
3. **Platform spell table typo.** Master Doc 5.6 lists Conflagration Wave with primary category "Continuous", which is a cast type, not a category.
4. **Will bands versus avatar Will** (H12 above).
5. **Will cost ranges versus caps.** Master Doc 2.1 Advanced 30 to 60 / Mega 70 to 120 versus 6.2 caps 28 to 65 / 65 to 130. Probably intentional (typical range versus hard cap) but not stated.
6. **Tech stack drift.** Build Plan 3 says React 18 and Zustand; code uses React 19 and no Zustand. Trivial, update the doc.
7. **Phase Plan 4** asks for cost "per fusion", but fusion is V2.
8. **Handover Section 5** says no code exists (known stale) and CLAUDE.md references a `docs/archive/` that does not exist.

---

## 10. Things the Repo Cannot Tell Me (founder to answer)

- Is `phase0/` live? URL, and how many real users, spells, and shares so far? If analytics data exists, it is the first real H2 signal and changes decision C.
- Is `VITE_PUBLIC_URL` set on Vercel to the Render API domain (decides whether OG cards work today)?
- Render instance tier, and whether provider spend caps and alerts are configured at Groq, Google, OpenRouter, Hugging Face, Resend, and Brevo.
- Which MySQL host `DATABASE_URL` points to, and whether dev, test, and prod share it.
