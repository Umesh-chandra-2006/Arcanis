# Arcanis: Soft Launch Checklist (task A16)

Everything in code is done and tested on branch `track-a` (A0 to A15, A17). These steps need the founder's accounts. Do them in order.

## 1. Accounts and keys (`.env` locally, the same values in Render, Step B)

- [x] **Images:** not needed. Phase 0/1a uses element art as the card face (founder decision 2026-10-10, `CARD_ART=element`).
- [x] **Email:** Brevo IPs authorised by the founder and verified for local use. For production, also add Render's outbound IPs (service, Connect, Outbound). Alternatively, turn off "Authorised IPs" in Brevo (Settings, Security), or verify a sending domain in Resend and set `RESEND_FROM` to an address on it. Without one of these, sign-in emails reach only the founder's own inbox.
- [ ] `FOUNDER_ALERT_EMAIL`: where the app emails the founder, once a day at most, when the daily breaker pauses creation. Value: the founder's own email (decided 2026-10-11). Set it in Render only; in the local `.env` it would send a real email from a dev server.
- [ ] `JWT_SECRET`: a long random value (it peppers sign-in code hashes). Keep the current one if already set.

## 2. Fresh deploy, step by step (founder, 2026-10-11)

The API runs on Render and the client on Vercel. There is no custom domain yet, so the Vercel project's own address (`https://<project>.vercel.app`) is the public domain everywhere below. Both services deploy the same GitHub repo, `Umesh-chandra-2006/Arcanis`, root directory `phase0`, branch `main` (or `track-a` until it is merged). Do the steps in this order, because each service needs the other's address.

### Step A. Vercel: create the project (gives you the public address)

- [x] Done 2026-10-15: project created, Production Branch `track-a`, address **https://arcanis-three.vercel.app**.
- [x] vercel.com, Add New, Project, import the `Arcanis` repo.
- [x] **Root Directory:** `phase0`. **Framework Preset:** Other. Leave the build command, output directory and install command empty: `phase0/vercel.json` already sets them (`pnpm build:client`, `dist/public`), and Vercel picks pnpm from the lockfile.
- [x] **Production Branch** (Settings, Git, after creation): `main`, or `track-a` until the merge.
- [x] Deploy once. Note the address Vercel gives the project: `https://<project>.vercel.app`. This first deploy works for browsing, but share links are wrong until Step C.

### Step B. Render: configure the API service (`arcanis-jpm1`)

- [x] Done 2026-10-15: `/health` answers `OK`, and Vercel forwards `/api` to it.

- [x] Settings: **Root Directory** `phase0`; **Branch** the same as Vercel; **Runtime** Node.
- [x] **Build Command:** `pnpm install --frozen-lockfile --prod=false && pnpm build`. The `--prod=false` matters: with `NODE_ENV=production` set, pnpm would otherwise skip the build tools (Vite, esbuild) and the build fails.
- [x] **Start Command:** `pnpm start`. **Health Check Path:** `/health`. **Instance type:** Free.
- [x] Environment, set fresh (decision F8). Delete anything left from the old app that is not in this list.

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `DATABASE_URL` | the production value from the local `.env` |
| `JWT_SECRET` | the value from the local `.env` (it peppers sign-in codes; keep it stable) |
| `SPELL_LLM_PROVIDER`, `SPELL_LLM_API_KEY`, `SPELL_LLM_FALLBACK_PROVIDERS` | from the local `.env` (Groq, with Gemini as fallback) |
| `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | from the local `.env` |
| `MODERATION_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | from the local `.env` |
| `STORAGE_PROVIDER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from the local `.env` |
| `EMAIL_PROVIDER` | `brevo,resend` (Brevo first, Resend as fallback) |
| `BREVO_API_KEY`, `BREVO_FROM`, `RESEND_API_KEY` | from the local `.env` |
| `CARD_ART` | `element` |
| `FRONTEND_URL` | `https://arcanis-three.vercel.app` (no trailing slash) |
| `CORS_ALLOWED_ORIGINS` | `https://arcanis-three.vercel.app` |
| `TRUST_PROXY_HOPS` | `2` |
| `DAILY_SPEND_LIMIT_USD` | `2` |
| `DAILY_CREATION_LIMIT` | `50` (raise after the first week) |
| `FOUNDER_ALERT_EMAIL` | the founder's email |

Do **not** set `TEST_DATABASE_URL`, `MODEL_CHECK_ON_START`, `PORT` (Render provides it) or any `VITE_` key on Render.

- [x] Save, then Manual Deploy, Deploy latest commit. When it is live, `https://arcanis-jpm1.onrender.com/health` must answer `OK`.
- [ ] Brevo: Render's outbound IPs were authorised in an earlier deploy (founder, 2026-10-11). If sign-in emails do not arrive, compare them with the service's Connect, Outbound list; they can change.

### Step C. Vercel: set the public address and redeploy

- [x] (2026-10-15) Settings, Environment Variables: `VITE_PUBLIC_URL` = `https://arcanis-three.vercel.app` (Production). No other variable is needed; the client always calls `/api` on its own origin, and `vercel.json` forwards that to Render.
- [x] Deployments, the latest one, Redeploy (the value is baked in at build time).

### Step D. Keep the free Render instance awake (decision F3)

- [x] (2026-10-15, cron-job.org) cron-job.org or UptimeRobot: GET `https://arcanis-jpm1.onrender.com/health` every 10 minutes, with an alert to the founder on failure. Run no other free Render service on the account.

### Already done in the repo

- [x] `vercel.json` points at `https://arcanis-jpm1.onrender.com` (2026-10-11).

## 4. Database

- [x] Production migrated to **0018** on 2026-10-11 (0017: forge queue table, session method column; 0018: Refinement Rune ledger, `p0_spells.refined_from_id`, `p0_generation_runs.kind`), after a backup that passed `db:restore-check` (`D:\Arcanis-backups\arcanis-...-2026-10-10T21-00-56-850Z.sql`). Any later migration: `cd phase0 && pnpm db:backup`, then `pnpm db:migrate`.
- [x] Production migrated to **0019** on 2026-10-15 (Codex column, votes, feedback), after a backup that passed `db:restore-check` (`D:\Arcanis-backups\arcanis-...-2026-10-14T20-31-58-884Z.sql`).
- [x] Spells forged before 0018 minted no Refinement Rune, and there is no retroactive grant (founder, 2026-10-11). Existing players earn their first rune with their next spell.
- [x] The 36 base spells are seeded in production (2026-10-11). `pnpm seed` is idempotent if it needs re-running.
- [x] The founder's account is an admin in production (2026-10-11; the admin pages are `/admin/metrics` and `/admin/moderation`). It has no password yet, so its next sign-in is by emailed code and then asks for one.

## 5. Deploy and verify

- [x] Sign up on the public domain with a real inbox; enter the code; choose a password at the welcome step; create a spell; the card shows its element art. Sign out and back in with the password. Try "Forgot it?" once. Forge a third spell: it must show as "research under way" (no card), and be granted with a notice some minutes later. There must be no refine button (refinement opens with battles).
- [x] Paste a share link into Discord, X and WhatsApp: the card (1200x630, spell name, Arcanis frame) must show. This closes the last A15 item.
- [x] `/admin/metrics`: breaker open, today's counts move.
- [x] Also verified by the founder (2026-10-15, all green): Spark confirmation, the Codex question and votes, the Sanctum at `/sanctum`, the landing page signed in and out, the password show/hide toggle and retype.
- [ ] Feedback page and first-spell prompt reach `/admin/feedback`: `p0_feedback` was still empty after the run, so this is unconfirmed.
- [ ] Merge `track-a` to `main` after verification (fast-forward: `git push origin track-a:main`), switch Vercel and Render to `main`, deploy each once, check CI on github.com.

## 6. Soft launch

- [ ] Invite a small cohort (10 to 30 people). Watch `/admin/metrics` and `pnpm cost-report --days 1` daily for a week: quota errors, refunds, 2c rate, moderation queue.
- [ ] Then open it up. Record the Gate 1a evaluation date (4 to 6 weeks after opening) in `PROGRESS.md`.

## Rollback

- Code: redeploy the previous commit on Render and Vercel.
- Data: `pnpm db:restore-check <backup>` proves a backup restores; a real restore is the same `mysql` load into the production database (stop the service first).
