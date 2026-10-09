import type { ProviderOutcome } from "../../shared/providers";
import { ProviderError } from "./errors";
import { generateImage, imageProviders } from "./image";
import { moderateWithTelemetry, moderationProvider } from "./moderation";
import { putObject, storageProvider } from "./storage";
import { completeWithTelemetry, semanticCheckProviders, spellTextProviders } from "./text";

export interface CheckResult {
  surface: string;
  provider: string;
  model: string;
  outcome: ProviderOutcome;
  detail: string;
}

/** Outcomes that mean the configuration is wrong (not a transient failure). */
export const FATAL_OUTCOMES: ProviderOutcome[] = ["model_retired", "auth", "config"];

async function run(surface: string, provider: string, model: string, fn: () => Promise<string>): Promise<CheckResult> {
  try {
    return { surface, provider, model, outcome: "success", detail: await fn() };
  } catch (error) {
    const err = error instanceof ProviderError ? error : new ProviderError("network", provider, String(error));
    return { surface, provider, model, outcome: err.kind, detail: err.message.slice(0, 200) };
  }
}

/** Live call to every configured text model (Build Plan 7.7: retired IDs fail loudly). */
export async function checkTextModels(): Promise<CheckResult[]> {
  const seen = new Set<string>();
  const results: CheckResult[] = [];
  for (const provider of [...spellTextProviders(), ...semanticCheckProviders()]) {
    const id = `${provider.name}:${provider.model}`;
    if (seen.has(id)) continue;
    seen.add(id);
    results.push(
      await run("text", provider.name, provider.model, async () => {
        const r = await completeWithTelemetry({ surface: "model_check" }, provider, {
          system: "Reply with JSON only.",
          user: 'Return {"ok":true}',
          maxTokens: 300,
          json: true,
        });
        return `${r.inputTokens}+${r.outputTokens} tokens`;
      })
    );
  }
  return results;
}

export async function checkAllProviders(options: { images: boolean }): Promise<CheckResult[]> {
  const results = await checkTextModels();

  const mod = (() => {
    try {
      return moderationProvider();
    } catch (error) {
      return error as ProviderError;
    }
  })();
  if (mod instanceof ProviderError) {
    results.push({ surface: "moderation", provider: mod.provider, model: "-", outcome: "config", detail: mod.message });
  } else {
    results.push(
      await run("moderation", mod.name, mod.model, async () => {
        const r = await moderateWithTelemetry({ surface: "model_check" }, [{ type: "text", text: "A spear of fire." }], mod);
        return `${Object.keys(r.scores).length} categories`;
      })
    );
  }

  const storage = storageProvider();
  // 1x1 PNG
  const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
  results.push(
    await run("storage", storage.name, "put", async () => {
      const stored = await putObject({ surface: "model_check" }, "checks/provider-check.png", png, "image/png", storage);
      await storage.remove("checks/provider-check.png");
      return stored.url.slice(0, 80);
    })
  );

  const images = imageProviders();
  if (!images.length) {
    results.push({ surface: "image", provider: "-", model: "-", outcome: "config", detail: "no image provider has credentials (set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN)" });
  } else if (options.images) {
    for (const provider of images) {
      results.push(
        await run("image", provider.name, provider.model, async () => {
          const r = await generateImage({ surface: "model_check" }, { prompt: "a glowing ember rune", width: 512, height: 512 }, [provider]);
          return `${r.bytes.length} bytes ${r.mime}`;
        })
      );
    }
  }
  return results;
}
