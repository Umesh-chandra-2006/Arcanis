# Arcanis

Commercial competitive magic RPG (formerly "Magic Spar", same project). Players describe a spell in natural language; an LLM generates a balanced, classified spell plus card art; players battle with those spells. The creation loop is the product. Battles are its proof surface.

Founder: Umesh. Expect two-way design communication. Be direct, push back on weak decisions, make obvious calls yourself and say so, ask only on real decisions.

## Writing rule

Never use em dashes anywhere: code, comments, commit messages, docs, UI copy. Use commas, colons, semicolons, or parentheses.

## Source of truth

Docs live in `docs/`. Precedence on conflict:

1. `docs/Arcanis_Master_Documentation_v7.md` (the bible; every system, number, and locked decision; content is v7.7)
2. `docs/Arcanis_Phase_1_Build_Plan_v2.md` (content is v2.7; Section 15 is the current build order)
3. `docs/Arcanis_Phase_Plan_v2.md` (content is v2.3; Gate 1a definitions)
4. `docs/handover.md` (decision history; its phase status may be stale, trust the repo)
5. `docs/archive/` (superseded, reference only, never build from it)

If code and docs disagree, or two docs disagree, **flag it to the founder. Do not resolve it silently.** If something in a doc looks structurally wrong to build, flag it and propose a fix rather than building it broken or deviating quietly.

When a decision changes: update the Master Doc first, then the Phase Plan, then the Build Plan, bump version numbers, and note what changed at the top of each.

## Locked decisions (do not reopen without the founder)

- **Will** is hidden. Two server-side values (Master Doc 2.1, v7.1): capacity (absolute, 0 to 500, grows, gates tiers) and current Will (per battle, starts at capacity, depleted per cast). Bands are current Will as a percentage of capacity (Sharp 60%+, Steady 30 to 60, Strained 16 to 30, Failing 6 to 16, Broken under 6; edges tuned via the harness). Never sent to the client as a number, bar, tooltip, or anything that lets the client reconstruct it. The server emits a band key; feedback text comes from rotating, randomized, pre-verified variant pools (6 to 8+ per band). Will cost appears in the UI only as Light / Moderate / Heavy in the spell detail view. Tune the strings, never the secrecy.
- **Async-first PvP.** The opponent is a stored player profile snapshot piloted by the rule-based engine using a playstyle vector (aggression, risk tolerance, resource discipline). Zero LLM cost. Live Duel is a later, liquidity-gated layer.
- **Two-Step Verification on every AI surface.** Layer 1 generation, then 2a deterministic schema and stat clamp (100%), 2b moderation classifier on text and images (100%), 2c small-model semantic check only when 2a or 2b flags. Silent retry before any user-visible failure. No unverified AI output reaches a user.
- **Three currencies, never merged (v7.6, founder; was two).** Spark: hard currency, never earned through gameplay, append-only ledger, atomic reserve/commit/refund. Generation cost is paid by Spark, or by Refinement Runes, which only a Spark-paid creation can mint. Refinement Runes (the code and the `p0_stone_ledger` table still say "stone", the first name): 1 minted when a creation passes verification, 1 spent per mend, never bought, never granted free, own ledger with the Spark rules; adding any other source needs the founder. Aether Shards: soft, earned, cosmetic and social only, never touch generation cost. No currency converts into another. XP is progression only and never purchasable.
- **Research comes first (Master Doc 6.3, v7.6).** A spell that needs research is not shown or granted until the research completes: no card, stats, text, art or public page before then, only the player's own name, element and category.
- **Refinement (Master Doc 6.7).** Built but switched off for the creation soft launch (`FEATURES.refinement` in `shared/constants.ts`); it opens with the battle release. Do not switch it on without the founder. Mending: own spells only, 1 rune, a new linked spell (the original is never edited), element, category, cast type and tier locked, same Power Budget (reshapes, never strengthens), no research of its own, mints no rune. Ascension (one tier up, Spark, full research, only for a player who already meets that tier's requirements) is designed and is built in Phase 1b, not before.
- **Identity.** Accounts are created only through magic-link auth, with a 6-digit code in the same email for in-app browsers (v7.1). Every account then sets a password and signs in with it, which sends no email (v7.5, founder decision, to save email quota; the emailed code always still works and is the forgot-password path). Changing a password needs the current one, or a session opened by an emailed code or link in the last 15 minutes. Sign-in must never reveal whether an email has an account. Session in an httpOnly cookie. Viewing is anonymous; any generation requires a session, checked at the gateway before any provider is called. Per-identity, per-device, and per-IP rate limits. First free Spark grant once per device.
- **Classification system, elements, amicability, terrains, tiers and stat caps** are locked as specified in the Master Doc. The engine and validation support the full taxonomy even where the creation form exposes a subset.
- **Provider abstraction.** Every external provider (text, image, moderation, email) sits behind an interface in `shared/`, selected by one env var. No provider request or response shape in business logic.

## Engineering rules (treat violations as bugs)

- Every path that makes an AI call needs Two-Step Verification and a Spark deduction path (for a mend, a Refinement Rune deduction path: reserve, then commit or refund).
- No unauthenticated path can trigger spend.
- Never trust client-computed minigame results. The server scores minigames from raw input events against a server-issued seed (Build Plan 8.4).
- Spell stats use the hybrid Power Budget: code sets the budget, the LLM allocates, Layer 2a enforces caps and the budget total. Tier never comes from the model.
- Every provider call logs surface, provider, model, units, latency, cost estimate, and outcome.
- Secrets live in `.env` only. Never commit keys.
- **No live provider calls without the founder's permission (founder rule, 2026-10-11).** Never make, trigger, or leave running anything that calls an LLM (or any other paid or quota-limited provider: image, moderation, email) with real keys unless the founder asked for exactly that in the current session. This covers `pnpm harness` without `--offline`, `pnpm corpus:run`, `pnpm creation:live`, `pnpm providers:check`, `LIVE_PROVIDERS=1`, `MODEL_CHECK_ON_START=1`, and any script or request you send to a running dev server that creates a spell or sends an email. Ask first, and say how many calls it will make. The test suite is fine: it blanks the keys and uses fake providers. Two traps that caused unasked calls on 2026-10-11, both now closed in code, do not reopen them: a dev server used to run a live model check on every start and every file-watch restart (now opt-in), and its forge queue loop forged designs that the test suite had left in the shared test database (the loop now skips `@test.arcanis` accounts and the tests clean up).
- Black and gold is the default palette for any new design work unless told otherwise.

## Repo specifics

Current state and decisions live in `PROGRESS.md` (read it at session start). The full audit is `docs/status_report.md` (2026-10-09). The ordered task list is Build Plan v2.2 Section 15 (Track A soft-launch blockers, Track B battles); the working checklist with acceptance checks is `docs/tasks.md` (tick tasks there and in PROGRESS.md).

### Layout (as of 2026-10-10, after task A0)

Architecture is a modular monolith (Build Plan v2.2 Section 3): one deployable with gateway, lab and game modules. `phase0/tools/balance-harness` and `phase0/tools/cost-report` exist (task A8).

| Path | What it is |
|---|---|
| `phase0/` | **Canonical app (decision H1). Stays at `phase0/` permanently (F9); never promote it to the root.** Express + tRPC 11 + React 19 + Vite 8 + Tailwind 4, Drizzle on MySQL, tables prefixed `p0_`. Account creation by emailed code or link, password sign-in, Spark ledger, hybrid Power Budget, Two-Step Verification pipeline, element card art, 36 base spells, public share page with OG tags, referrals, reviews, profile window, admin dashboard and moderation queue. All work lands here. |
| branch `archive/root-prototype` | The old root full-game prototype (Manus template, Hearth, socket battles). Removed from the working tree in A0. Never extend it; mine it for ideas only. |
| `.github/workflows/ci.yml` | CI: install, type-check, tests (against a MySQL service container), build, for `phase0/`. |
| `docs/` | Project docs (see Source of truth). `docs/status_report.md` is the latest audit; `docs/tasks.md` is the Phase 0 to 1 task checklist. |

### Install

pnpm 10 (`packageManager` field). There is no root package; install inside `phase0/`:

```
cd phase0 && pnpm install
```

### Environment

One `.env` at the repo root; `.env.example` lists every key. `phase0/server/_core/env.ts` loads `../.env`. Tests load it too, but `server/test/setup-env.ts` replaces `DATABASE_URL` with `TEST_DATABASE_URL` (database `arcanis_test` on the same cluster locally, a MySQL container in CI) and refuses any URL that points at production; DB tests use `describeDb` from `server/test/db.ts` and skip when no test DB is configured. The database is MySQL on TiDB Cloud (us-east-1); kept through the soft launch with logical backups (task A1), migrated to a new founder-owned host in Phase 1b (task B0). Keys in use (names only): `DATABASE_URL` (mysql), `JWT_SECRET`, `SPELL_LLM_PROVIDER`, `SPELL_LLM_API_KEY`, `SPELL_LLM_FALLBACK_PROVIDERS`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `IMAGE_GEN_API_KEY` (Hugging Face), `EMAIL_PROVIDER` (`resend` or `brevo`), `RESEND_API_KEY`, `BREVO_API_KEY`, `BREVO_FROM`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (image storage for the soft launch; R2 in Phase 1b). `OPENAI_API_KEY` (for `omni-moderation`), `TEST_DATABASE_URL`. All providers run on free-tier keys with no payment method attached. phase0 also reads `MODEL_CHECK_ON_START` (`1` runs a live check of every configured model when the dev server starts; off by default, see the engineering rules), `PORT` (default 3100), `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS`, `CARD_ART` (`element` default, or `generated`), and client-side `VITE_PUBLIC_URL` (share link base); the client always calls `/api` on its own origin. None of `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` or `VITE_PUBLIC_URL` is in the local `.env`; their production values live in the Vercel and Render dashboards and could not be checked from the repo (no Vercel CLI or project link). The `.env` still holds leftover keys from the archived root app (`BUILT_IN_FORGE_*`, `OAUTH_SERVER_URL`, `OWNER_*`, `VITE_APP_*`, `VITE_OAUTH_PORTAL_URL`, `VITE_ANALYTICS_*`); nothing reads them.

### Run

```
cd phase0 && pnpm dev        # http://localhost:3100, Vite middleware in dev
cd phase0 && pnpm build && pnpm start
```

Deploy (phase0): client on Vercel (`phase0/vercel.json`, `pnpm build:client`, output `dist/public`), API on Render (configured in the dashboard, no `render.yaml`; free instance kept awake by an external `/health` ping, decision F3). `vercel.json` is generated by `pnpm vercel:config <render-url>`: `/api/*` and the share image go to Render, and `/spell/:id` goes to Render only for link-preview bots (people get the SPA). See `docs/launch_checklist.md`. `pnpm dev` uses `DATABASE_URL` (production); to develop against the test database run it with `DATABASE_URL` set to the value of `TEST_DATABASE_URL`. A dev server uses the real provider keys: every spell forged in it and every sign-in email is a live call. The test database is shared with the test suite, so test runs count toward its daily creation cap (`DAILY_CREATION_LIMIT`, default 50) and local dev can show "the forge is cooling" for that reason alone.

### Tests and type-check

```
cd phase0 && pnpm test && pnpm check
```

Vitest, `server/**/*.test.ts` and `shared/**/*.test.ts`, files run serially (they share the test DB). Global setup runs Drizzle migrations on the test DB. Set `REQUIRE_TEST_DB=1` to fail instead of skipping DB tests (CI does). Test files are excluded from `tsc`.

### Migrations and seed

Drizzle Kit against `DATABASE_URL` (MySQL). Tables are prefixed `p0_`; the production database also still holds the archived root app's tables. Back up (task A1) before migrating production.

```
cd phase0 && pnpm db:generate && pnpm db:migrate   # migrations in phase0/drizzle/
cd phase0 && pnpm seed                              # the 36 base spells (Master Doc 5.6) + archivist user; idempotent
cd phase0 && pnpm db:backup                         # mysqldump of DATABASE_URL to ../../Arcanis-backups (BACKUP_DIR)
cd phase0 && pnpm db:restore-check                  # restore newest backup into a scratch DB, compare row counts, drop it
```

Run `db:backup` weekly and before every production migration. It needs the MySQL client tools (`mysqldump`, `mysql`) on PATH. TiDB rejects mysqldump savepoints, so the dump is not a single transaction; take it at low traffic.

### Balance harness and cost report

Both live in `phase0/tools/` (not a root `tools/`: there is no root package, and they import phase0's code).

```
cd phase0 && pnpm harness              # Power Budget conformance over tools/balance-harness/corpus (live Layer 1, telemetry to the TEST db)
cd phase0 && pnpm harness --offline    # same report from random allocations, no provider calls
cd phase0 && pnpm cost-report [--test] [--days N | --since ISO] [--write]   # cost per creation, retry, schema, 2a, 2b, 2c rates, latency
cd phase0 && pnpm creation:live        # one real creation through every provider, TEST db
cd phase0 && pnpm providers:check [--images]   # live check of every configured model and key
```

Reports go to `tools/balance-harness/reports/` and `tools/cost-report/reports/`. The harness runs one request at a time with backoff because free tiers are per-minute limited. Battle simulation (win rates, Will band dwell time) is added in B8.

### Conventions found in the code

- tRPC routers in `server/routers/*.ts`; `protectedProcedure` for anything authenticated (every generation path must use it). `adminProcedure` for admin. Auth is the `arc_session` httpOnly cookie resolved in `server/_core/context.ts` (sessions in `p0_sessions`).
- Zod input schemas in `shared/validation.ts`; game constants and stat caps in `shared/constants.ts`. Path aliases `@/` (client src) and `@shared/`.
- Spell stats: hybrid Power Budget in `phase0/shared/power-budget.ts` (budget, Layer 2a enforcement) with taxonomy and caps in `shared/taxonomy.ts`; the pipeline is `server/spell-pipeline.ts`; Layer 1 output is validated by `LLMSpellIdentitySchema`. Spells leave the server only through `toPublicSpell` (`shared/spell-view.ts`), which never carries Will numbers.
- A creation refused by the daily breaker joins the forge queue (`server/forge-queue.ts`, `p0_forge_queue`): no Spark is reserved while it waits, and it is forged through `createSpell` unchanged when the breaker reopens. Players create through `createOrQueue`.
- Mending is `server/spell-mend.ts` (`spells.mend`). It shares creation's verification through `screenPlayerInput` and `generateVerifiedIdentity` in `server/spell-pipeline.ts`: any new generation path must go through those two, not a copy. The mended spell carries `refined_from_id`; its run row has `kind = mend`, and a mend is never counted as a creation in a gate metric. Mends count toward the daily creation limit.
- A spell in research leaves the server sealed: `toPublicSpell` blanks everything the forge made while `now < research_ready_at`, and `getSpellPublic` and the share routes treat it as not found. The client shows `ResearchTile`, never a card, for a researching spell.
- The Codex is opt-in (v7.7): a spell is shown only when `p0_spells.codex_shared_at` is set by its owner (`server/codex.ts`, `spells.setCodexShared`); votes are `p0_spell_votes`. Feedback is `p0_feedback` (`server/feedback.ts`), admin-only to read.
- Refinement Rune operations go through `phase0/server/stones.ts` only (`p0_stone_ledger`, same rules as Spark).
- Spark operations go through `phase0/server/spark.ts` only (append-only ledger, READ COMMITTED transactions); analytics through `trackEvent()` in `phase0/server/analytics.ts`; every provider call through `server/providers/*` (telemetry is automatic).
- Drizzle: camelCase in TS; snake_case column names.
- Prettier config at root (`.prettierrc`).
- UI: black and gold `arcanis-ui` system (ported in A17; the folder is deleted, history has it). The gold "A" logo is the navigation button: it opens the drawer below `lg` (top left) and folds the sidebar to an icon rail on desktop. Pages render inside `components/layout/app-shell.tsx` with `components/layout/page.tsx`; spell cards show art, name and one line of flavor only, tier by frame ornament, accent from the art's colour.
