// Deterministic providers for tests only (end-to-end test, task A15). Selected
// with SPELL_LLM_PROVIDER=fake / SEMANTIC_CHECK_PROVIDERS=fake / IMAGE_PROVIDER=fake,
// and never outside NODE_ENV=test.
import sharp from "sharp";
import type { ImageProvider, ImageRequest, ImageResult, TextProvider, TextRequest, TextResult } from "../../shared/providers";

export class FakeTextProvider implements TextProvider {
  readonly name = "fake";
  readonly model = "fake-text";
  async complete(req: TextRequest): Promise<TextResult> {
    const isCheck = req.system.includes("content reviewer");
    const text = isCheck
      ? JSON.stringify({ pass: true, reason_code: "ok" })
      : JSON.stringify({
          flavor_text: "A seam of light opens and closes around the caster.",
          lore_line: "Some doors open only once.",
          image_prompt: "a seam of golden light in darkness",
          research_complexity: 3,
          stats: { damage_min: 16, damage_max: 22, mp_cost: 12, will_cost_min: 15, will_cost_max: 16, cast_time_ms: 450, drain_ratio: 0.25 },
        });
    return { text, provider: this.name, model: this.model, inputTokens: 100, outputTokens: 100 };
  }
}

export class FakeImageProvider implements ImageProvider {
  readonly name = "fake";
  readonly model = "fake-image";
  async generate(req: ImageRequest): Promise<ImageResult> {
    const bytes = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#7a3fb0" } }).png().toBuffer();
    return { bytes: new Uint8Array(bytes), mime: "image/png", provider: this.name, model: this.model, width: req.width, height: req.height };
  }
}

export const fakeProvidersAllowed = () => process.env.NODE_ENV === "test";
