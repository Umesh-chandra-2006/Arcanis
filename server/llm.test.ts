import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callLLM } from "./llm";

describe("LLM Provider Integration", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should have primary LLM provider configured", () => {
    const provider = process.env.SPELL_LLM_PROVIDER;
    expect(provider).toBeDefined();
    expect(provider).toBe("groq");
  });

  it("should have primary LLM API key configured", () => {
    const apiKey = process.env.SPELL_LLM_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey?.length).toBeGreaterThan(0);
  });

  it("should have LLM fallback providers configured", () => {
    const fallbacks = process.env.SPELL_LLM_FALLBACK_PROVIDERS;
    expect(fallbacks).toBeDefined();
    expect(fallbacks).toContain("gemini");
    expect(fallbacks).toContain("openrouter");
  });

  it("should have Gemini API key configured", () => {
    const geminiKey = process.env.GEMINI_API_KEY;
    expect(geminiKey).toBeDefined();
    expect(geminiKey?.length).toBeGreaterThan(0);
  });

  it("should have OpenRouter API key configured", () => {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    expect(openrouterKey).toBeDefined();
    expect(openrouterKey?.length).toBeGreaterThan(0);
  });

  it("should have Hugging Face API token configured", () => {
    const hfToken = process.env.IMAGE_GEN_API_KEY;
    expect(hfToken).toBeDefined();
    expect(hfToken?.length).toBeGreaterThan(0);
  });

  it("should successfully call the primary LLM provider via mocked fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "{\"name\": \"Ember Spear\"}"
            }
          }
        ]
      })
    });
    globalThis.fetch = mockFetch;

    const messages = [{ role: "user" as const, content: "Create a fire spell" }];
    const response = await callLLM(messages, "You are a magic helper");

    expect(response.provider).toBe("groq");
    expect(response.text).toBe("{\"name\": \"Ember Spear\"}");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://api.groq.com/openai/v1/chat/completions");
  });

  it("should fallback to secondary provider when primary fails", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal Server Error" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "{\"name\": \"Tidal Torrent\"}"
              }
            }
          ]
        })
      });
    globalThis.fetch = mockFetch;

    const messages = [{ role: "user" as const, content: "Create a water spell" }];
    const response = await callLLM(messages, "You are a magic helper");

    expect(response.provider).toBe("gemini");
    expect(response.text).toBe("{\"name\": \"Tidal Torrent\"}");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(mockFetch.mock.calls[1]?.[0]).toBe("https://generativelanguage.googleapis.com/v1beta/openai/");
  });
});
