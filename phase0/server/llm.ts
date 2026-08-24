import { ENV } from "./_core/env";

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
      const timeout = setTimeout(() => controller.abort(), 30_000);

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
          max_tokens: 900,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

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
      console.error(`[LLM] ${provider.name} request failed:`, error);
      return null;
    }
  }

  async call(messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse> {
    if (this.primaryProvider) {
      const result = await this.callProvider(this.primaryProvider, messages, systemPrompt);
      if (result) return result;
    }

    for (const fallback of this.fallbackProviders) {
      const result = await this.callProvider(fallback, messages, systemPrompt);
      if (result) return result;
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