import { ENV } from "../_core/env";
import type { CallContext, TextProvider, TextRequest, TextResult } from "../../shared/providers";
import { AllProvidersFailedError, ProviderError, providerFetch } from "./errors";

export { AllProvidersFailedError };
import { textCostUsd } from "./pricing";
import { FakeTextProvider, fakeProvidersAllowed } from "./fake";
import { withTelemetry } from "./telemetry";

const ENDPOINTS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

const TIMEOUT_MS = 30_000;

/** Groq, Gemini and OpenRouter all speak the OpenAI chat-completions shape. */
export class OpenAiCompatibleTextProvider implements TextProvider {
  constructor(
    readonly name: string,
    readonly model: string,
    private readonly apiKey: string,
    private readonly endpoint: string
  ) {}

  async complete(req: TextRequest): Promise<TextResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 900,
    };
    if (req.json) body.response_format = { type: "json_object" };
    // gpt-oss is a reasoning model; low effort keeps latency and tokens down.
    if (this.model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";

    const response = await providerFetch(
      this.name,
      this.endpoint,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      TIMEOUT_MS
    );
    const data = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    } | null;
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new ProviderError("bad_response", this.name, "empty completion");
    return {
      text,
      provider: this.name,
      model: this.model,
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
    };
  }
}

function keyFor(provider: string): string {
  switch (provider) {
    case "groq":
      return ENV.spellLlmApiKey;
    case "gemini":
      return ENV.geminiApiKey;
    case "openrouter":
      return ENV.openrouterApiKey;
    default:
      return "";
  }
}

function defaultModel(provider: string): string {
  switch (provider) {
    case "groq":
      return ENV.groqModel;
    case "gemini":
      return ENV.geminiModel;
    case "openrouter":
      return ENV.openrouterModel;
    default:
      return "";
  }
}

/** Parses "groq,gemini:gemini-flash-lite-latest" into configured providers, skipping ones without a key. */
export function parseTextProviders(list: string): TextProvider[] {
  const seen = new Set<string>();
  const providers: TextProvider[] = [];
  for (const entry of list.split(",").map((s) => s.trim()).filter(Boolean)) {
    const colon = entry.indexOf(":");
    const name = colon === -1 ? entry : entry.slice(0, colon);
    const model = colon === -1 ? defaultModel(name) : entry.slice(colon + 1);
    if (name === "fake") {
      if (fakeProvidersAllowed() && !seen.has("fake")) providers.push(new FakeTextProvider());
      seen.add("fake");
      continue;
    }
    const endpoint = ENDPOINTS[name];
    const key = keyFor(name);
    if (!endpoint || !model) {
      console.warn(`[Text] unknown provider "${entry}" ignored`);
      continue;
    }
    if (!key || seen.has(`${name}:${model}`)) continue;
    seen.add(`${name}:${model}`);
    providers.push(new OpenAiCompatibleTextProvider(name, model, key, endpoint));
  }
  return providers;
}

export function spellTextProviders(): TextProvider[] {
  return parseTextProviders(`${ENV.spellLlmProvider},${ENV.spellLlmFallbackProviders}`);
}

export function semanticCheckProviders(): TextProvider[] {
  return parseTextProviders(ENV.semanticCheckProviders);
}

/** One telemetry-logged call to a single provider. */
export function completeWithTelemetry(ctx: CallContext, provider: TextProvider, req: TextRequest): Promise<TextResult> {
  return withTelemetry(
    { ctx, provider: provider.name, model: provider.model },
    () => provider.complete(req),
    (r) => ({
      units: { input_tokens: r.inputTokens, output_tokens: r.outputTokens },
      costUsd: textCostUsd(r.provider, r.model, r.inputTokens, r.outputTokens),
    })
  );
}

/** Tries each provider in order; every attempt is logged. */
export async function generateText(
  ctx: CallContext,
  req: TextRequest,
  providers: TextProvider[] = ctx.surface === "semantic_check" ? semanticCheckProviders() : spellTextProviders()
): Promise<TextResult> {
  const errors: ProviderError[] = [];
  for (const provider of providers) {
    try {
      return await completeWithTelemetry(ctx, provider, req);
    } catch (error) {
      errors.push(error as ProviderError);
    }
  }
  throw new AllProvidersFailedError(errors);
}
