import { ENV } from "./_core/env";
import { getRedisService } from "./redis-service";
import { LLM_RATE_LIMITS } from "../shared/constants";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  text: string;
  provider: string;
}

interface ProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  endpoint: string;
}

class LLMProvider {
  private primaryProvider: ProviderConfig | null = null;
  private fallbackProviders: ProviderConfig[] = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const primaryProvider = ENV.spellLlmProvider || "groq";

    if (primaryProvider === "groq" && ENV.spellLlmApiKey) {
      this.primaryProvider = {
        name: "groq",
        apiKey: ENV.spellLlmApiKey,
        model: "llama-3.1-70b-versatile",
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
      };
    } else if (primaryProvider === "gemini" && ENV.geminiApiKey) {
      this.primaryProvider = {
        name: "gemini",
        apiKey: ENV.geminiApiKey,
        model: "gemini-1.5-flash",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/",
      };
    } else if (primaryProvider === "openrouter" && ENV.openrouterApiKey) {
      this.primaryProvider = {
        name: "openrouter",
        apiKey: ENV.openrouterApiKey,
        model: "meta-llama/llama-3.1-70b-instruct",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
      };
    }

    const fallbacks = ENV.spellLlmFallbackProviders || "gemini,openrouter";
    const fallbackList = fallbacks.split(",").map((p) => p.trim());

    for (const fallback of fallbackList) {
      if (fallback === "groq" && ENV.spellLlmApiKey && fallback !== primaryProvider) {
        this.fallbackProviders.push({
          name: "groq",
          apiKey: ENV.spellLlmApiKey,
          model: "llama-3.1-70b-versatile",
          endpoint: "https://api.groq.com/openai/v1/chat/completions",
        });
      } else if (fallback === "gemini" && ENV.geminiApiKey && fallback !== primaryProvider) {
        this.fallbackProviders.push({
          name: "gemini",
          apiKey: ENV.geminiApiKey,
          model: "gemini-1.5-flash",
          endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/",
        });
      } else if (
        fallback === "openrouter" &&
        ENV.openrouterApiKey &&
        fallback !== primaryProvider
      ) {
        this.fallbackProviders.push({
          name: "openrouter",
          apiKey: ENV.openrouterApiKey,
          model: "meta-llama/llama-3.1-70b-instruct",
          endpoint: "https://openrouter.ai/api/v1/chat/completions",
        });
      }
    }
  }

  async callProvider(
    provider: ProviderConfig,
    messages: LLMMessage[],
    systemPrompt: string
  ): Promise<LLMResponse | null> {
    const fullMessages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(provider.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: fullMessages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `[LLM] ${provider.name} error: ${response.status} ${JSON.stringify(errorData)}`
        );
        return null;
      }

      const data = (await response.json()) as any;
      const text = data.choices?.[0]?.message?.content || "";

      if (!text) {
        console.error(`[LLM] ${provider.name} returned empty response`);
        return null;
      }

      return { text, provider: provider.name };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error(`[LLM] ${provider.name} request timed out (30s)`);
      } else {
        console.error(`[LLM] ${provider.name} request failed:`, error);
      }
      return null;
    }
  }

  async call(
    messages: LLMMessage[],
    systemPrompt: string
  ): Promise<LLMResponse> {
    const providers = [
      ...(this.primaryProvider ? [this.primaryProvider] : []),
      ...this.fallbackProviders,
    ];

    for (const provider of providers) {
      const rateCheck = await checkLLMRateLimit(provider.name);
      if (!rateCheck.allowed) {
        console.warn(`[LLM] Rate limit hit for ${provider.name}: ${rateCheck.reason}`);
        continue;
      }

      const result = await this.callProvider(provider, messages, systemPrompt);
      if (result) {
        await recordLLMCall(provider.name);
        return result;
      }
    }

    throw new Error("All LLM providers failed");
  }
}

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new LLMProvider();
  }
  return llmProvider;
}

export async function callLLM(
  messages: LLMMessage[],
  systemPrompt: string
): Promise<LLMResponse> {
  const provider = getLLMProvider();
  return provider.call(messages, systemPrompt);
}

export async function checkLLMRateLimit(
  provider: string,
  tokensEstimate: number = 0
): Promise<{ allowed: boolean; reason?: string }> {
  const redis = getRedisService();
  const limits = LLM_RATE_LIMITS[provider as keyof typeof LLM_RATE_LIMITS];
  if (!limits) return { allowed: true };

  const key = `llm:ratelimit:${provider}:${Math.floor(Date.now() / 60000)}`;
  const count = await redis.getRateLimitCounter(key);
  const rpmLimit = Math.floor(limits.requestsPerMinute * limits.softLimitPercentage);

  if (count >= rpmLimit) {
    return {
      allowed: false,
      reason: `LLM rate limit reached for ${provider} (${count}/${rpmLimit} RPM)`,
    };
  }

  return { allowed: true };
}

export async function recordLLMCall(
  provider: string,
  tokensUsed: number = 0
): Promise<void> {
  const redis = getRedisService();
  const key = `llm:ratelimit:${provider}:${Math.floor(Date.now() / 60000)}`;
  await redis.incrementLLMCallCount(provider, key);
}
