# Arcanis: Provider Free-Tier Quota Audit

**Date:** 2026-10-10 (task A2). **Method:** live calls with the repo's keys (`pnpm providers:check`, response headers, account endpoints), plus provider docs where the API exposes nothing. "Measured" means seen in a live response; "docs" means third-party or provider documentation not confirmed by a live response.

All providers run on free tiers with no payment method attached (founder decision F1). Real spend is $0; cost telemetry records list-price shadow cost (`server/providers/pricing.ts`).

## Per provider

| Surface | Provider and model | Free limit | Source | Status 2026-10-10 |
|---|---|---|---|---|
| Text (Layer 1, primary) | Groq `openai/gpt-oss-120b` | 1,000 requests/day, 8,000 tokens/min | Measured (`x-ratelimit-*` headers) | Working. `llama-3.1-70b-versatile` is retired; Groq no longer lists general Llama models. |
| Text (fallback) | Gemini `gemini-flash-lite-latest` | About 15/min, 1,000/day per Google project | Docs (blogs; Google cut free quotas Dec 2025) | Working. |
| Text (fallback) | Gemini `gemini-flash-latest` | About 10/min, 20 to 250/day (sources disagree) | Docs | Intermittent HTTP 503 "high demand". `gemini-1.5-flash` is retired. |
| Text (fallback) | OpenRouter `google/gemma-4-31b-it:free` | 20/min; 50 to 200/day without credits (sources disagree) | Docs; key reports `is_free_tier: true` | Often 429 "rate-limited upstream". Llama `:free` routes are gone. |
| Text (Layer 2c) | Gemini lite, then Groq `openai/gpt-oss-20b` | As above (Groq 20b has its own 1,000/day) | Measured | Working. |
| Image | Hugging Face router, FLUX.1-schnell | About $0.10/month of credits on a free account | Measured: HTTP 402 "no remaining credits" | **Down.** Credits exhausted; `hf-inference` FLUX endpoint returns 410 (retired). |
| Image | Cloudflare Workers AI `@cf/black-forest-labs/flux-1-schnell` | 10,000 neurons/day; about 57.6 neurons per 1024px image at 4 steps, so about 170 images/day | Docs (Cloudflare pricing page) | **Not configured.** Needs `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN` (founder). |
| Moderation (2b) | OpenAI `omni-moderation-latest` | Free; rate limit not exposed in headers | Measured (works) | Working. Note: flags ordinary fantasy combat as `violence`, so policy uses our own thresholds (A6). |
| Email | Brevo | 300 emails/day | Docs | **Blocked:** API rejects calls from IPs not on the account's authorised list. Render's free tier has no fixed outbound IP. |
| Email | Resend | 100/day, 3,000/month | Docs | Key works, but no verified domain, so it can only send to the account owner's address. |
| Storage | Cloudinary | 25 credits/month (1 credit = 1 GB storage, 1 GB bandwidth or 1,000 transformations) | Measured (`/usage`: 0.17 of 25 used) | Working. |

## Daily creation capacity

One creation uses about 1 to 3 text calls (identity, retries, rare 2c), 1 image, 2 to 3 moderation calls and 2 to 3 storage uploads. A new player also costs 1 email.

- **Image is the binding limit:** about 170/day once Cloudflare is configured; 0/day today (placeholder art only).
- **Text:** about 2,000/day across Groq and Gemini lite, but Groq's 8,000 tokens/min allows only about 4 to 5 creations per minute before the cascade falls to Gemini.
- **Email:** 300/day (Brevo, once IPs are unrestricted) or 100/day (Resend, once a domain is verified).

**Setting:** `DAILY_CREATION_LIMIT=50` until Cloudflare images are live, then 130 (about 80 percent of the image limit). Signups are capped separately by the email provider.

## Founder actions raised by this audit

1. Create a Cloudflare API token with Workers AI permission; set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN`.
2. Email: either turn off "Authorised IPs" in Brevo (Security settings), or verify a sending domain in Resend and set `RESEND_FROM`. Without one of these, magic-link emails only reach the founder's own inbox.
