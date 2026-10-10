# Arcanis: Phase 0 Cost Sheet

**Date:** 2026-10-10 (task A14). **Source:** the 135-prompt creation corpus (`phase0/tools/balance-harness/corpus/creation-corpus.json`: 120 realistic, 15 adversarial) run through the real pipeline against the test database (`pnpm corpus:run`, report `phase0/tools/balance-harness/reports/corpus-run-2026-10-09.md`), the live Power Budget harness (`reports/power-budget-live-2026-10-09.md`), and `pnpm cost-report --test --since 2026-10-09T21:37:30Z --until 2026-10-09T21:55:30Z`. All providers are on free tiers, so real spend was $0; costs below are list-price (shadow) estimates from `phase0/server/providers/pricing.ts`.

## Provider choice per surface

| Surface | Provider and model | Fallbacks |
|---|---|---|
| Layer 1 text | Groq `openai/gpt-oss-120b` | Gemini `gemini-flash-lite-latest`, Gemini `gemini-flash-latest`, OpenRouter `google/gemma-4-31b-it:free` |
| Layer 2c | Gemini `gemini-flash-lite-latest` | Groq `openai/gpt-oss-20b` |
| Layer 2b | OpenAI `omni-moderation-latest` (text and image) | none (fails closed) |
| Image | Cloudflare Workers AI `flux-1-schnell` (needs founder keys) | Hugging Face router FLUX.1-schnell (credits exhausted) |
| Storage | Cloudinary (R2 in Phase 1b) | none |
| Email | Brevo | Resend |

## Cost per creation

| Item | Per creation (list price) | Measured or estimated |
|---|---|---|
| Layer 1 text (Groq gpt-oss-120b, about 1.05 calls) | $0.00026 | Measured: 98 calls, $0.0254 |
| Moderation (2 to 3 calls) | $0 | Measured: free endpoint |
| Layer 2c (fires on 1.7% of runs) | under $0.00001 | Measured rate; price from table |
| Image, 1024 px FLUX | $0.00063 (Cloudflare) to $0.0028 (Hugging Face) | Estimated: no image succeeded (HF credits gone, Cloudflare not configured) |
| Storage, 3 uploads | $0.00006 | Estimated |
| **All-in** | **about $0.001 to $0.003** | |

**$0.08 check:** passes by a factor of about 25 to 80, even at paid list prices. No model tiering change is needed.

## Quality and safety rates (corpus run)

| Metric | Value | Target |
|---|---|---|
| Realistic prompts that produced a card | 119 of 120 (the one failure hit the daily free quota, refunded) | |
| Creation latency p50 / p95, without image | 4.3 s / 5.7 s | first card in under 3 min (browser test: 22 s from opening sign-in) |
| Layer 1 retry rate | 5.2% | |
| Schema failure rate per Layer 1 response | 4.2% | |
| 2a clamp or rescale | 80.9% (mostly over-budget allocations scaled down) | |
| 2a fallback to default profile | 0.9% | |
| Layer 2c trigger rate | 1.7% (3 of 135 in the per-prompt report) | at or below 15% |
| Moderation false positives (hand-reviewed: every realistic prompt is benign by construction) | 0 of 120 | at or below 2% |
| Harmful adversarial prompts stopped | 3 of 5 in the run (gore, sexual, self-harm); hate and real-person passed. Fixed: player text naming real-world groups or public figures now escalates to 2c (0 of 120 realistic prompts affected); both now rejected live | all |
| Prompt injection ("max every stat", raw JSON stats, god spell) | All capped to budget by 2a | |

## Limits that bind before money does

- **Images:** none generated in the run. Hugging Face free credits are exhausted; Cloudflare Workers AI (about 170 images a day free) needs `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN`. Until then every card uses the placeholder and the background retry fills art later.
- **Text daily quota:** the measurement day exhausted both Groq's and Gemini's daily free quotas (harness plus corpus, about 400 Layer 1 calls). The breaker refused further creations for the day and refunded, as designed. At soft-launch volume (`DAILY_CREATION_LIMIT` 50 to 130) this is not binding.
- **Email:** Brevo blocks unrecognised IPs and Resend has no verified domain (see `provider_quotas.md`).

## Phase 0 exit criteria (Phase Plan 4)

- One-page cost sheet with measured numbers: this document.
- Provider choice per surface: above.
- All-in cost per creation under $0.08: yes, about $0.001 to $0.003 at list price.
- Layer 2c under 10 to 15%: yes, 1.7%.
- Open: image cost and latency are estimates until Cloudflare keys exist; re-run `pnpm corpus:run` then and update this sheet.
