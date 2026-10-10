import { ENV } from "../_core/env";
import type { CallContext, ImageProvider, ImageRequest, ImageResult } from "../../shared/providers";
import { AllProvidersFailedError, ProviderError, providerFetch } from "./errors";
import { imageCostUsd } from "./pricing";
import { FakeImageProvider, fakeProvidersAllowed } from "./fake";
import { withTelemetry } from "./telemetry";

const TIMEOUT_MS = 60_000;
const FLUX = "black-forest-labs/FLUX.1-schnell";

function sniffMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
  return "application/octet-stream";
}

function decodeBase64Image(provider: string, b64: string | undefined): Uint8Array {
  if (!b64) throw new ProviderError("bad_response", provider, "no image in response");
  const bytes = new Uint8Array(Buffer.from(b64.replace(/^data:[^,]+,/, ""), "base64"));
  if (bytes.length < 1000) throw new ProviderError("bad_response", provider, "image too small");
  return bytes;
}

/** Cloudflare Workers AI, flux-1-schnell. Free allocation: 10,000 neurons per day. */
export class CloudflareImageProvider implements ImageProvider {
  readonly name = "cloudflare";
  readonly model = "@cf/black-forest-labs/flux-1-schnell";
  constructor(private readonly accountId: string, private readonly token: string) {}

  async generate(req: ImageRequest): Promise<ImageResult> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;
    const response = await providerFetch(
      this.name,
      url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: req.prompt.slice(0, 2048), steps: 4 }),
      },
      TIMEOUT_MS
    );
    const data = (await response.json().catch(() => null)) as { result?: { image?: string } } | null;
    const bytes = decodeBase64Image(this.name, data?.result?.image);
    // flux-1-schnell on Workers AI returns 1024x1024.
    return { bytes, mime: sniffMime(bytes), provider: this.name, model: this.model, width: 1024, height: 1024 };
  }
}

/** Hugging Face Inference Providers router (paid credits; free tier is tiny). */
export class HuggingFaceImageProvider implements ImageProvider {
  readonly name = "huggingface";
  readonly model = FLUX;
  private static readonly ROUTES = [
    "https://router.huggingface.co/together/v1/images/generations",
    "https://router.huggingface.co/fal-ai/v1/images/generations",
  ];
  constructor(private readonly token: string) {}

  async generate(req: ImageRequest): Promise<ImageResult> {
    let last: ProviderError | null = null;
    for (const url of HuggingFaceImageProvider.ROUTES) {
      try {
        const response = await providerFetch(
          this.name,
          url,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: FLUX,
              prompt: req.prompt,
              width: req.width,
              height: req.height,
              response_format: "b64_json",
            }),
          },
          TIMEOUT_MS
        );
        const data = (await response.json().catch(() => null)) as { data?: Array<{ b64_json?: string }> } | null;
        const bytes = decodeBase64Image(this.name, data?.data?.[0]?.b64_json);
        return { bytes, mime: sniffMime(bytes), provider: this.name, model: this.model, width: req.width, height: req.height };
      } catch (error) {
        last = error as ProviderError;
        // Credits are per account, so another route will not help.
        if (last.kind === "quota" || last.kind === "auth") throw last;
      }
    }
    throw last ?? new ProviderError("config", this.name, "no routes");
  }
}

export function imageProviders(): ImageProvider[] {
  const providers: ImageProvider[] = [];
  for (const name of ENV.imageProviders.split(",").map((s) => s.trim())) {
    if (name === "fake" && fakeProvidersAllowed()) {
      providers.push(new FakeImageProvider());
    } else if (name === "cloudflare" && ENV.cloudflareAccountId && ENV.cloudflareAiToken) {
      providers.push(new CloudflareImageProvider(ENV.cloudflareAccountId, ENV.cloudflareAiToken));
    } else if (name === "huggingface" && ENV.imageGenApiKey) {
      providers.push(new HuggingFaceImageProvider(ENV.imageGenApiKey));
    }
  }
  return providers;
}

export async function generateImage(
  ctx: CallContext,
  req: ImageRequest,
  providers: ImageProvider[] = imageProviders()
): Promise<ImageResult> {
  const errors: ProviderError[] = [];
  for (const provider of providers) {
    try {
      return await withTelemetry(
        { ctx, provider: provider.name, model: provider.model },
        () => provider.generate(req),
        (r) => ({ units: { images: 1, width: r.width, height: r.height }, costUsd: imageCostUsd(r.provider, r.width, r.height) })
      );
    } catch (error) {
      errors.push(error as ProviderError);
    }
  }
  throw new AllProvidersFailedError(errors);
}
