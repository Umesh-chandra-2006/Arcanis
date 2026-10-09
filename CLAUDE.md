# Arcanis

Commercial competitive magic RPG (formerly "Magic Spar", same project). Players describe a spell in natural language; an LLM generates a balanced, classified spell plus card art; players battle with those spells. The creation loop is the product. Battles are its proof surface.

Founder: Umesh. Expect two-way design communication. Be direct, push back on weak decisions, make obvious calls yourself and say so, ask only on real decisions.

## Writing rule

Never use em dashes anywhere: code, comments, commit messages, docs, UI copy. Use commas, colons, semicolons, or parentheses.

## Source of truth

Docs live in `docs/`. Precedence on conflict:

1. `docs/Arcanis_Master_Documentation_v7.md` (the bible; every system, number, and locked decision; content is v7.1)
2. `docs/Arcanis_Phase_1_Build_Plan_v2.md` (content is v2.1; Section 15 is the current build order)
3. `docs/Arcanis_Phase_Plan_v2.md` (content is v2.1; Gate 1a definitions)
4. `docs/handover.md` (decision history; its phase status may be stale, trust the repo)
5. `docs/archive/` (superseded, reference only, never build from it)

If code and docs disagree, or two docs disagree, **flag it to the founder. Do not resolve it silently.** If something in a doc looks structurally wrong to build, flag it and propose a fix rather than building it broken or deviating quietly.

When a decision changes: update the Master Doc first, then the Phase Plan, then the Build Plan, bump version numbers, and note what changed at the top of each.

## Locked decisions (do not reopen without the founder)

- **Will** is hidden. Two server-side values (Master Doc 2.1, v7.1): capacity (absolute, 0 to 500, grows, gates tiers) and current Will (per battle, starts at capacity, depleted per cast). Bands are current Will as a percentage of capacity (Sharp 60%+, Steady 30 to 60, Strained 16 to 30, Failing 6 to 16, Broken under 6; edges tuned via the harness). Never sent to the client as a number, bar, tooltip, or anything that lets the client reconstruct it. The server emits a band key; feedback text comes from rotating, randomized, pre-verified variant pools (6 to 8+ per band). Will cost appears in the UI only as Light / Moderate / Heavy in the spell detail view. Tune the strings, never the secrecy.
- **Async-first PvP.** The opponent is a stored player profile snapshot piloted by the rule-based engine using a playstyle vector (aggression, risk tolerance, resource discipline). Zero LLM cost. Live Duel is a later, liquidity-gated layer.
- **Two-Step Verification on every AI surface.** Layer 1 generation, then 2a deterministic schema and stat clamp (100%), 2b moderation classifier on text and images (100%), 2c small-model semantic check only when 2a or 2b flags. Silent retry before any user-visible failure. No unverified AI output reaches a user.
- **Two currencies, never merged.** Spark: hard currency, the only thing that spends against generation cost, never earned through gameplay, append-only ledger, atomic reserve/commit/refund. Aether Shards: soft, earned, cosmetic and social only. XP is progression only and never purchasable.
- **Identity.** Magic-link auth, with a 6-digit code in the same email for in-app browsers (v7.1). No passwords anywhere. Session in an httpOnly cookie. Viewing is anonymous; any generation requires a session, checked at the gateway before any provider is called. Per-identity, per-device, and per-IP rate limits. First free Spark grant once per device.
- **Classification system, elements, amicability, terrains, tiers and stat caps** are locked as specified in the Master Doc. The engine and validation support the full taxonomy even where the creation form exposes a subset.
- **Provider abstraction.** Every external provider (text, image, moderation, email) sits behind an interface in `shared/`, selected by one env var. No provider request or response shape in business logic.

## Engineering rules (treat violations as bugs)

- Every path that makes an AI call needs Two-Step Verification and a Spark deduction path.
- No unauthenticated path can trigger spend.
- Never trust client-computed minigame results. The server scores minigames from raw input events against a server-issued seed (Build Plan 8.4).
- Spell stats use the hybrid Power Budget: code sets the budget, the LLM allocates, Layer 2a enforces caps and the budget total. Tier never comes from the model.
- Every provider call logs surface, provider, model, units, latency, cost estimate, and outcome.
- Secrets live in `.env` only. Never commit keys.
- Black and gold is the default palette for any new design work unless told otherwise.

## Repo specifics

Current state and decisions live in `PROGRESS.md` (read it at session start). The full audit is `docs/status_report.md` (2026-10-09). The ordered task list is Build Plan v2.2 Section 15 (Track A soft-launch blockers, Track B battles); the working checklist with acceptance checks is `docs/tasks.md` (tick tasks there and in PROGRESS.md).

### Layout (as of 2026-10-10, after task A0)

Architecture is a modular monolith (Build Plan v2.2 Section 3): one deployable with gateway, lab and game modules. `phase0/tools/balance-harness` and `phase0/tools/cost-report` exist (task A8).

| Path | What it is |
|---|---|
| `phase0/` | **Canonical app (decision H1). Stays at `phase0/` permanently (F9); never promote it to the root.** Express + tRPC 11 + React 19 + Vite 8 + Tailwind 4, Drizzle on MySQL, tables prefixed `p0_`. Magic link (plus a password step that is being removed), Spark balance, Power Budget stat engine, LLM writes flavor text only, FLUX art, public share page with OG tags, reviews, admin metrics. All work lands here. |
| `arcanis-ui/` | UI design reference (black and gold dashboard, game components). Task A17 ports its look into `phase0/client`; delete the folder once A17 is done. |
| branch `archive/root-prototype` | The old root full-game prototype (Manus template, Hearth, socket battles). Removed from the working tree in A0. Never extend it; mine it for ideas only. |
| `.github/workflows/ci.yml` | CI: install, type-check, tests (against a MySQL service container), build, for `phase0/`. |
| `docs/` | Project docs (see Source of truth). `docs/status_report.md` is the latest audit; `docs/tasks.md` is the Phase 0 to 1 task checklist. |

### Install

pnpm 10 (`packageManager` field). There is no root package; install inside `phase0/`:

```
cd phase0 && pnpm install
```

### Environment

One `.env` at the repo root; `.env.example` lists every key. `phase0/server/_core/env.ts` loads `../.env`. Tests load it too, but `server/test/setup-env.ts` replaces `DATABASE_URL` with `TEST_DATABASE_URL` (database `arcanis_test` on the same cluster locally, a MySQL container in CI) and refuses any URL that points at production; DB tests use `describeDb` from `server/test/db.ts` and skip when no test DB is configured. The database is MySQL on TiDB Cloud (us-east-1); kept through the soft launch with logical backups (task A1), migrated to a new founder-owned host in Phase 1b (task B0). Keys in use (names only): `DATABASE_URL` (mysql), `JWT_SECRET`, `SPELL_LLM_PROVIDER`, `SPELL_LLM_API_KEY`, `SPELL_LLM_FALLBACK_PROVIDERS`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `IMAGE_GEN_API_KEY` (Hugging Face), `EMAIL_PROVIDER` (`resend` or `brevo`), `RESEND_API_KEY`, `BREVO_API_KEY`, `BREVO_FROM`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (image storage for the soft launch; R2 in Phase 1b). `OPENAI_API_KEY` (for `omni-moderation`), `TEST_DATABASE_URL`. All providers run on free-tier keys with no payment method attached. phase0 also reads `PORT` (default 3100), `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `METRICS_KEY`, and client-side `VITE_API_URL` (API base) and `VITE_PUBLIC_URL` (share link base). None of `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` or `VITE_PUBLIC_URL` is in the local `.env`; their production values live in the Vercel and Render dashboards and could not be checked from the repo (no Vercel CLI or project link). The `.env` still holds leftover keys from the archived root app (`BUILT_IN_FORGE_*`, `OAUTH_SERVER_URL`, `OWNER_*`, `VITE_APP_*`, `VITE_OAUTH_PORTAL_URL`, `VITE_ANALYTICS_*`); nothing reads them.

### Run

```
cd phase0 && pnpm dev        # http://localhost:3100, Vite middleware in dev
cd phase0 && pnpm build && pnpm start
```

Deploy (phase0): client on Vercel (`phase0/vercel.json`, `pnpm build:client`, output `dist/public`), API on Render (configured in the dashboard, no `render.yaml`; free instance kept awake by an external `/health` ping, decision F3). OG tags are injected only by the Express route `/spell/:spellId`. Today `vercel.json` rewrites every path to `index.html`, so share links on the Vercel domain get no OG tags; task A10 adds rewrites for `/api/*` and the share route to Render ahead of the SPA catch-all.

### Tests and type-check

```
cd phase0 && pnpm test && pnpm check
```

Vitest, `server/**/*.test.ts` and `shared/**/*.test.ts`, files run serially (they share the test DB). Global setup runs Drizzle migrations on the test DB. Set `REQUIRE_TEST_DB=1` to fail instead of skipping DB tests (CI does). Test files are excluded from `tsc`.

### Migrations and seed

Drizzle Kit against `DATABASE_URL` (MySQL). Tables are prefixed `p0_`; the production database also still holds the archived root app's tables. Back up (task A1) before migrating production.

```
cd phase0 && pnpm db:generate && pnpm db:migrate   # migrations in phase0/drizzle/
cd phase0 && pnpm seed                              # 12 platform spells + archivist user
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

- tRPC routers in `server/routers/*.ts`; `protectedProcedure` for anything authenticated (every generation path must use it). Auth is a Bearer JWT read in `server/_core/context.ts`.
- Zod input schemas in `shared/validation.ts`; game constants and stat caps in `shared/constants.ts`. Path aliases `@/` (client src) and `@shared/`.
- phase0 stats come from `phase0/server/power-budget.ts` (deterministic today; becoming the hybrid budget in task A7); the LLM returns identity text validated by `LLMSpellIdentitySchema`.
- Spark operations go through `phase0/server/spark.ts` only (being rewritten as an append-only ledger in task A3; the current version has a double-spend race); analytics through `trackEvent()` in `phase0/server/analytics.ts`.
- Drizzle: camelCase in TS; snake_case column names.
- Prettier config at root (`.prettierrc`).
