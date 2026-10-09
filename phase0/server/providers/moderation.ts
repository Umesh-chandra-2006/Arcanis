import { ENV } from "../_core/env";
import type { CallContext, ModerationInput, ModerationProvider, ModerationResult } from "../../shared/providers";
import { containsProfanity } from "../../shared/profanity";
import { ProviderError, providerFetch } from "./errors";
import { MODERATION_COST_USD } from "./pricing";
import { withTelemetry } from "./telemetry";

/** OpenAI omni-moderation (text and image, free). Returns raw scores; policy lives in server/moderation.ts. */
export class OpenAiModerationProvider implements ModerationProvider {
  readonly name = "openai";
  readonly model = "omni-moderation-latest";
  constructor(private readonly apiKey: string) {}

  async moderate(inputs: ModerationInput[]): Promise<ModerationResult> {
    const input = inputs.map((i) =>
      i.type === "text" ? { type: "text", text: i.text } : { type: "image_url", image_url: { url: i.url } }
    );
    const response = await providerFetch(
      this.name,
      "https://api.openai.com/v1/moderations",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, input }),
      },
      20_000
    );
    const data = (await response.json().catch(() => null)) as {
      results?: Array<{ category_scores?: Record<string, number> }>;
    } | null;
    const results = data?.results ?? [];
    if (!results.length) throw new ProviderError("bad_response", this.name, "no moderation results");
    // Multi-part input yields one result; take the max per category to be safe.
    const scores: Record<string, number> = {};
    for (const r of results) {
      for (const [category, score] of Object.entries(r.category_scores ?? {})) {
        scores[category] = Math.max(scores[category] ?? 0, score);
      }
    }
    return { scores, provider: this.name, model: this.model };
  }
}

/**
 * Development and test only: a word list, no network. Never selected in
 * production (moderationProvider() fails closed there).
 */
export class LocalModerationProvider implements ModerationProvider {
  readonly name = "local";
  readonly model = "profanity-list";
  async moderate(inputs: ModerationInput[]): Promise<ModerationResult> {
    const hit = inputs.some((i) => i.type === "text" && containsProfanity(i.text));
    return { scores: { harassment: hit ? 1 : 0 }, provider: this.name, model: this.model };
  }
}

export function moderationProvider(): ModerationProvider {
  if (ENV.moderationProvider === "openai" && ENV.openaiApiKey) return new OpenAiModerationProvider(ENV.openaiApiKey);
  if (ENV.moderationProvider === "local" && !ENV.isProduction) return new LocalModerationProvider();
  if (ENV.isProduction) {
    throw new ProviderError("config", ENV.moderationProvider, "moderation provider not configured; refusing to run unmoderated");
  }
  return new LocalModerationProvider();
}

export function moderateWithTelemetry(
  ctx: CallContext,
  inputs: ModerationInput[],
  provider: ModerationProvider = moderationProvider()
): Promise<ModerationResult> {
  return withTelemetry(
    { ctx: { ...ctx, surface: "moderation" }, provider: provider.name, model: provider.model },
    () => provider.moderate(inputs),
    () => ({
      units: {
        texts: inputs.filter((i) => i.type === "text").length,
        images: inputs.filter((i) => i.type === "image").length,
      },
      costUsd: MODERATION_COST_USD,
    })
  );
}
