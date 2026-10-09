// List prices used for cost_estimate_usd. Providers run on free tiers through the
// soft launch, so these are shadow costs: what the same call would cost on the
// paid tier (Phase Plan v2.2 Section 5). Checked 2026-10-10; re-verify in A14.

interface TokenPrice {
  inputPerM: number;
  outputPerM: number;
}

const TEXT_PRICES: Record<string, TokenPrice> = {
  "groq:openai/gpt-oss-120b": { inputPerM: 0.15, outputPerM: 0.75 },
  "groq:openai/gpt-oss-20b": { inputPerM: 0.1, outputPerM: 0.5 },
  "gemini:gemini-flash-latest": { inputPerM: 0.3, outputPerM: 2.5 },
  "gemini:gemini-2.5-flash": { inputPerM: 0.3, outputPerM: 2.5 },
  "gemini:gemini-flash-lite-latest": { inputPerM: 0.1, outputPerM: 0.4 },
  "gemini:gemini-2.5-flash-lite": { inputPerM: 0.1, outputPerM: 0.4 },
  // Paid equivalent of the :free Gemma route.
  "openrouter:google/gemma-4-31b-it:free": { inputPerM: 0.1, outputPerM: 0.3 },
};

// Conservative default for an unlisted model, so unknown cost is never zero.
const DEFAULT_TEXT_PRICE: TokenPrice = { inputPerM: 0.5, outputPerM: 2.5 };

export function textCostUsd(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  const price = TEXT_PRICES[`${provider}:${model}`] ?? DEFAULT_TEXT_PRICE;
  return (inputTokens * price.inputPerM + outputTokens * price.outputPerM) / 1_000_000;
}

export function hasTextPrice(provider: string, model: string): boolean {
  return `${provider}:${model}` in TEXT_PRICES;
}

/** Per generated image. */
export function imageCostUsd(provider: string, width: number, height: number): number {
  const megapixels = (width * height) / 1_000_000;
  switch (provider) {
    case "cloudflare": {
      // Workers AI flux-1-schnell: 4.8 neurons per 512x512 tile (by the longer side)
      // plus 9.6 neurons per step, 4 steps, at $0.011 per 1,000 neurons.
      const tiles = Math.ceil(Math.max(width, height) / 512) ** 2;
      return ((tiles * 4.8 + 4 * 9.6) * 0.011) / 1000;
    }
    case "huggingface":
      return 0.0027 * Math.max(megapixels, 0.25);
    default:
      return 0.003;
  }
}

export const MODERATION_COST_USD = 0; // OpenAI omni-moderation is free
export const EMAIL_COST_USD = 0.0005;
export const STORAGE_PUT_COST_USD = 0.00002;
