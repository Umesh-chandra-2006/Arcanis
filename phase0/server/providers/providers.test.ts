import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { classifyHttpError, AllProvidersFailedError, ProviderError } from "./errors";
import { generateText } from "./text";
import { imageCostUsd, textCostUsd } from "./pricing";
import { getDb } from "../db";
import { p0ProviderCalls } from "../../drizzle/schema";
import { describeDb } from "../test/db";
import type { TextProvider, TextRequest, TextResult } from "../../shared/providers";

class FakeText implements TextProvider {
  calls = 0;
  constructor(readonly name: string, readonly model: string, private readonly behavior: () => TextResult) {}
  async complete(_req: TextRequest): Promise<TextResult> {
    this.calls++;
    return this.behavior();
  }
}

const ok = (name: string): TextResult => ({ text: "{}", provider: name, model: "m", inputTokens: 100, outputTokens: 50 });

describe("classifyHttpError", () => {
  it.each([
    [402, '{"error":"You have no remaining credits"}', "quota"],
    [429, '{"error":{"message":"You exceeded your current quota"}}', "quota"],
    [429, '{"error":{"message":"temporarily rate-limited upstream. Please retry shortly"}}', "rate_limited"],
    [429, "Too many requests", "rate_limited"],
    [400, '{"error":{"message":"The model `llama-3.1-70b-versatile` has been decommissioned"}}', "model_retired"],
    [404, '{"error":{"message":"models/gemini-1.5-flash is not found for API version v1beta"}}', "model_retired"],
    [410, '{"error":"The requested model is deprecated and no longer supported"}', "model_retired"],
    [401, "unauthorized", "auth"],
    [503, "high demand", "server"],
    [400, '{"error":"bad json"}', "bad_response"],
  ])("HTTP %i %s -> %s", (status, body, kind) => {
    expect(classifyHttpError("p", status, body).kind).toBe(kind);
  });
});

describe("pricing", () => {
  it("prices known text models and never prices unknown ones at zero", () => {
    expect(textCostUsd("groq", "openai/gpt-oss-120b", 1_000_000, 0)).toBeCloseTo(0.15);
    expect(textCostUsd("x", "unknown", 1000, 1000)).toBeGreaterThan(0);
  });
  it("prices a Cloudflare 1024px FLUX image from neurons", () => {
    expect(imageCostUsd("cloudflare", 1024, 1024)).toBeCloseTo(((4 * 4.8 + 4 * 9.6) * 0.011) / 1000, 8);
  });
});

describe("generateText cascade", () => {
  it("falls through failing providers in order", async () => {
    const a = new FakeText("a", "m", () => {
      throw new ProviderError("server", "a", "down");
    });
    const b = new FakeText("b", "m", () => ok("b"));
    const result = await generateText({ surface: "spell_identity" }, { system: "s", user: "u" }, [a, b]);
    expect(result.provider).toBe("b");
    expect(a.calls).toBe(1);
  });

  it("reports quota exhaustion when every provider is out of quota", async () => {
    const quota = (n: string) =>
      new FakeText(n, "m", () => {
        throw new ProviderError("quota", n, "credits");
      });
    const error = await generateText({ surface: "spell_identity" }, { system: "s", user: "u" }, [quota("a"), quota("b")]).catch((e) => e);
    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect((error as AllProvidersFailedError).quotaExhausted).toBe(true);
  });
});

describe("no provider bypass", () => {
  it("only server/providers calls external HTTP APIs", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "providers") walk(full);
        } else if (/\.ts$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
          const src = fs.readFileSync(full, "utf8");
          if (/\bfetch\(\s*["'`]https?:/.test(src) || /api\.(groq|openai|brevo|resend|cloudinary)|generativelanguage|openrouter\.ai|huggingface\.co|api\.cloudflare\.com/.test(src)) {
            offenders.push(path.relative(root, full));
          }
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});

describeDb("telemetry", () => {
  it("writes one provider_calls row per attempt, including failures", async () => {
    const runId = nanoid(36);
    const a = new FakeText("fail", "m", () => {
      throw new ProviderError("rate_limited", "fail", "slow down");
    });
    const b = new FakeText("groq", "openai/gpt-oss-120b", () => ({ ...ok("groq"), model: "openai/gpt-oss-120b" }));
    await generateText({ surface: "spell_identity", runId, userId: 1 }, { system: "s", user: "u" }, [a, b]);
    const db = await getDb();
    const rows = await db!.select().from(p0ProviderCalls).where(eq(p0ProviderCalls.runId, runId));
    expect(rows.map((r) => r.outcome).sort()).toEqual(["rate_limited", "success"]);
    const success = rows.find((r) => r.outcome === "success")!;
    expect(success.surface).toBe("spell_identity");
    expect(success.costEstimateUsd).toBeGreaterThan(0);
    expect(success.units).toEqual({ input_tokens: 100, output_tokens: 50 });
    expect(success.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
