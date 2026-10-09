# Arcanis: Progress

**Read this first in every new session.** It is the single source for "where is the project right now". Update it at the end of every working session: change the snapshot, record decisions, tick tasks, and add a line to the session log. Keep it short; detail belongs in `docs/`.

**Last updated:** 2026-10-10

---

## 1. Snapshot

| Area | State |
|---|---|
| Docs | Master Doc **v7.2**, Phase Plan **v2.2**, Build Plan **v2.2** (file names unchanged). Audit: `docs/status_report.md`. |
| Canonical codebase | **`phase0/`** (decided H1), stays at `phase0/` permanently (F9). Root app to be archived on a branch (task A0). |
| Architecture | Modular monolith on MySQL. Soft launch: current TiDB cluster, Cloudinary images, free Render instance kept awake by ping, free-tier provider keys. Phase 1b: new DB host and Cloudflare R2 (B0). |
| Phase 0 (measure) | **Not done.** Folded into Track A (telemetry A2, harness A8, corpus run A14) plus soft-launch measurement. |
| Phase 1a (creation soft launch) | In progress. Creation and share roughly 50 to 60 percent. Blocked on Track A. |
| Phase 1b (async battles) | Early (roughly 10 to 15 percent, off-spec root code to be rebuilt). Track B. |
| Live deployment | phase0 deployed but not publicized. No real users, spells or shares. The soft launch is the first real measurement. |
| Tests | Root: 9 pass, type-check fails (5 errors). phase0: 19 pass, type-check clean. Tests hit the real DB (no test DB yet). |
| Code changes this cycle | None. Docs only. **Founder actions closed; waiting for go-ahead on A0.** |
| Task tracker | `docs/tasks.md` (checklist with acceptance checks for Track A and Track B; founder actions F1 to F11 closed). |

### Done this cycle (2026-10-09)
- Full repo audit (`docs/status_report.md`).
- Founder decided A to H (Section 2).
- Docs updated: Master Doc v7.1, Phase Plan v2.1, Build Plan v2.1, handover.md status, CLAUDE.md locked items and repo specifics.
- `docs/tasks.md` created.

### In progress
Nothing in code. Founder to add `OPENAI_API_KEY` to `.env` (needed by A6).

### Exact next step
Founder gives go-ahead on Track A. Then start **A0** in `docs/tasks.md`: archive the root app on `archive/root-prototype`, remove it from `main`, add `.env.example`, a separate test DB, and CI. Then **A1**: back up the current TiDB database before any schema change.

### What works today (phase0)
Magic link sign-in (plus mandatory password, being removed), 5 Spark signup grant, spell creation (4 elements x Attack/Defense/Regen/Debuff x Instant), deterministic stats via Power Budget, LLM flavor text with profanity check, FLUX card art, library, public share page with OG tags, reviews, admin metrics page.

---

## 2. Decisions (2026-10-09, founder)

| ID | Decision |
|---|---|
| A | First 2 spells per account skip research; research stored as `research_ready_at` timestamp. |
| B | Server scores minigames from raw input events; piloted side samples owner results blended to population median by n/(n+10). Battle track, not a soft-launch blocker. |
| C | Creation-first soft launch (Phase 1a) after blockers. Creation-only Gate 1a written into Phase Plan; day-7 = "returned and created again". Battle gate applies when battles ship. |
| D | Fake door: "coming soon" Spark pack tiles, `spark_pack_intent`, waitlist, no Spark for clicking. Founder sets provider caps; app gets a daily spend circuit breaker. |
| E | 6-digit code in the same email as the link; passwords removed; httpOnly cookie session; existing password users move to code login. |
| F | Founder verifies Lemon Squeezy for an India-based seller. **Phase 2 prerequisite.** Fallback Paddle (MoR); Razorpay is not an MoR. |
| G1 | All 12 elements, add Drain, Instant only until battles ship. Temporary deviation from Build Plan 2.3; Trap and Charged return with battles. |
| G2 | No Tower in Phase 1: drop `assessment_question`, replace "the Tower" narrative voice everywhere. |
| G3 | Payments stay Phase 2. |
| G4 | Gate thresholds confirmed as placeholders; k-factor = invites per user x invite conversion rate; numeric thresholds locked before soft launch. |
| G5 | Server-validated minigames, via B. |
| G6 | One paid Render instance for the monolith before soft launch. |
| H1 | `phase0/` canonical; root app archived on a branch. |
| H2 | Modular monolith; Build Plan 3 updated. DB: founder to confirm host; if it sleeps, is connection-capped, or has no backups, migrate to Supabase now. |
| H4 | Hybrid Power Budget (code budget, LLM allocates, 2a enforces). Soft-launch blocker. Harness gets Power Budget coverage. |
| H12 | Will = capacity (absolute, grows, gates tiers) + current Will (depleted per cast). Bands as % of capacity: Sharp 60+, Steady 30 to 60, Strained 16 to 30, Failing 6 to 16, Broken under 6. Secrecy unchanged; tune via harness. |
| H9 | No numeric Will cost in the UI; spell detail view shows Light / Moderate / Heavy only. |
| H10 | All four security fixes are soft-launch blockers (enumeration, localStorage JWT, plaintext tokens, open analytics). Analytics: anonymous events only from an allowlist, schema-validated, rate-limited. |
| Small | Blockers: images to object storage, 1200x630 OG variant, vercel.json share fix, live model-ID check. Not blocking: delete dead template code, remove Hearth. |
| Docs | Onboarding goes straight to creation; Spell XP reveal removed; Conflagration Wave = Attack / Continuous. |

### Founder actions closed (2026-10-10)

| ID | Decision |
|---|---|
| F1 | All providers on free tiers, no payment method attached (provider cap = $0). App breaker: `DAILY_SPEND_LIMIT_USD=2` real spend plus `DAILY_CREATION_LIMIT` under the tightest free quota (A2 audit; placeholder 50). |
| F2 | TiDB account owner unknown. Keep current cluster for the soft launch with logical backups (A1); migrate to a new founder-owned host in Phase 1b (B0). |
| F3 | Free Render instance kept awake by an external `/health` ping every 10 minutes. **Replaces G6.** |
| F4 | Moderation: OpenAI `omni-moderation`. Needs `OPENAI_API_KEY`. |
| F5 | Cloudinary for the soft launch (keys in `.env`); Cloudflare R2 in Phase 1b (B0). |
| F6 | Gate 1a thresholds locked as written; cost measured at list price (shadow cost) since keys are free. |
| F7 | 1 Spark per creation; signup 5; weekly 3; rollover cap 10; referral 3 to inviter only (Master Doc 23.3 had both sides). |
| F8 | Deploy env vars set fresh at the post-fix redeploy (A10, A16). |
| F9 | `phase0/` is not promoted to the repo root. Disclaimer added to `docs/status_report.md`. |
| F10 | Avatar selection never shows Will. Master Doc 2.1 Will cost ranges = typical targets; 6.2 floors and caps = hard limits. |
| F11 | Lemon Squeezy parked until after the soft launch. |

### Still open (needs founder)
1. `OPENAI_API_KEY` in `.env` before A6 (moderation).
2. Fusion Spark cost listed in Phase 0 scope while Fusion is V2 (low priority).
3. Watch item: free-tier quotas (especially Hugging Face FLUX credits) may cap daily creations below soft-launch demand; A2 audit reports it before A16.

---

## 3. Task List (proposed, awaiting go-ahead)

Full table with estimates: Build Plan v2.1 Section 15. Checklist with acceptance checks: `docs/tasks.md` (tick tasks there).

**Track A, soft-launch blockers (in order, about 22 to 25 days):** A0 housekeeping, archive, test DB, CI · A1 DB host · A2 provider interfaces + cost telemetry + model-ID check · A3 Spark ledger rewrite + weekly allowance · A4 spend breaker · A5 identity (code, no passwords, cookie, no enumeration) · A6 moderation 2b/2c + reviews + admin queue · A7 hybrid Power Budget + 12 elements + Drain · A8 harness skeleton + corpus + cost-report · A9 object storage + OG 1200x630 · A10 share rewrites + referral · A11 analytics hardening + Gate 1a metrics · A12 copy and flow (Tower, Will on card, strain descriptor, onboarding, research timer) · A13 fake door · A14 corpus run + cost sheet · A15 hardening · A16 soft launch.

**Track B, battles (parallel after A0 to A3, about 27 to 30 days):** B1 engine · B2 36 platform spells · B3 server-scored minigames · B4 piloted sampling · B5 snapshots, vector, piloting, matchmaking, bot · B6 battle UI + Will pools · B7 persistence + rematch · B8 harness battles + Will tuning · B9 re-enable Trap and Charged.

**Track B also starts with B0** (new DB host, Cloudinary to R2).

**Founder actions:** F1 to F11 closed 2026-10-10. Remaining: `OPENAI_API_KEY`, and creating the keep-awake monitor at A16.

---

## 4. Session Log

| Date | Session | Outcome |
|---|---|---|
| 2026-10-09 | Audit | Read all docs and both codebases, ran tests and type-checks. Wrote `docs/status_report.md`, filled CLAUDE.md "Repo specifics", created this file. Raised decisions A to H. No code changed. |
| 2026-10-09 | Decisions | Founder decided A to H. Updated Master Doc to v7.1, Phase Plan to v2.1, Build Plan to v2.1 (with Track A/B build order), handover.md status, CLAUDE.md locked items and repo specifics, this file. Found DB host is TiDB Cloud. Could not check `VITE_PUBLIC_URL`. No code changed; waiting for go-ahead. |
| 2026-10-09 | Wrap | Created `docs/tasks.md` (Phase 0 to 1 checklist). Updated this file and CLAUDE.md. Committed all docs. |
| 2026-10-10 | Founder actions | Closed F1 to F11. Master Doc v7.2, Phase Plan v2.2, Build Plan v2.2; tasks.md (A1 now backup, A2 quota audit, A4 creation limit, A9 Cloudinary, new B0); status_report.md disclaimer that `phase0/` stays. No code changed. |
