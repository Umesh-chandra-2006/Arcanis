# Arcanis: Soft Launch Checklist (task A16)

Everything in code is done and tested on branch `track-a` (A0 to A15, A17). These steps need the founder's accounts. Do them in order.

## 1. Accounts and keys (`.env` locally, the same values in Render)

- [ ] **Images:** Cloudflare dashboard, Workers AI, create an API token with "Workers AI: Read and Edit". Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN`. Check with `cd phase0 && pnpm providers:check --images`. Without this every card uses the placeholder; the background retry fills art once keys exist.
- [ ] **Email:** either turn off "Authorised IPs" in Brevo (Settings, Security), or verify a sending domain in Resend and set `RESEND_FROM` to an address on it. Without one of these, sign-in emails reach only the founder's own inbox.
- [ ] `FOUNDER_ALERT_EMAIL`: where breaker alerts go.
- [ ] `JWT_SECRET`: a long random value (it peppers sign-in code hashes). Keep the current one if already set.

## 2. Render (API)

- [ ] Root directory `phase0`. Build command `pnpm install --frozen-lockfile && pnpm build`. Start command `pnpm start`. Health check path `/health`.
- [ ] Environment: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, all provider keys from `.env.example`, `EMAIL_PROVIDER`, `STORAGE_PROVIDER=cloudinary`, `MODERATION_PROVIDER=openai`, `FRONTEND_URL=https://<public domain>`, `CORS_ALLOWED_ORIGINS=https://<public domain>`, `TRUST_PROXY_HOPS=2`, `DAILY_SPEND_LIMIT_USD=2`, `DAILY_CREATION_LIMIT=50` (raise to 130 once Cloudflare images work), `FOUNDER_ALERT_EMAIL`.
- [ ] Free instance kept awake (decision F3): cron-job.org or UptimeRobot hitting `https://<render service>/health` every 10 minutes, alerting the founder on downtime. Run no other free Render service on the account.

## 3. Vercel (client)

- [ ] Root directory `phase0`. In the repo: `cd phase0 && pnpm vercel:config https://<render service>.onrender.com`, commit, push. Vercel builds refuse to run until this is done.
- [ ] Environment: `VITE_PUBLIC_URL=https://<public domain>`. Remove `VITE_API_URL` if it exists (the client always calls `/api` on its own origin).

## 4. Database

- [ ] Production is already migrated to migration 0015 (applied during A1 to A13, a backup before each). Before deploy: `cd phase0 && pnpm db:backup` once more.
- [ ] Optional: seed platform spells with `pnpm seed` (the 36-spell set is B2).
- [ ] Make the founder's account an admin: `UPDATE p0_users SET role = 'admin' WHERE email = '<founder email>';` (the admin pages are `/admin/metrics` and `/admin/moderation`).

## 5. Deploy and verify

- [ ] Merge `track-a` to `main` (CI runs type-check, tests against a MySQL container, build).
- [ ] Sign up on the public domain with a real inbox; enter the code; create a spell; confirm art appears (or the placeholder, then art within 15 minutes).
- [ ] Paste a share link into Discord, X and WhatsApp: the card (1200x630, spell name, Arcanis frame) must show. This closes the last A15 item.
- [ ] `/admin/metrics`: breaker open, today's counts move.

## 6. Soft launch

- [ ] Invite a small cohort (10 to 30 people). Watch `/admin/metrics` and `pnpm cost-report --days 1` daily for a week: quota errors, refunds, 2c rate, moderation queue.
- [ ] Then open it up. Record the Gate 1a evaluation date (4 to 6 weeks after opening) in `PROGRESS.md`.

## Rollback

- Code: redeploy the previous commit on Render and Vercel.
- Data: `pnpm db:restore-check <backup>` proves a backup restores; a real restore is the same `mysql` load into the production database (stop the service first).
