import { createHash } from "node:crypto";
import { ENV } from "../_core/env";
import type { CallContext, StorageProvider, StoredObject } from "../../shared/providers";
import { ProviderError, providerFetch } from "./errors";
import { STORAGE_PUT_COST_USD } from "./pricing";
import { withTelemetry } from "./telemetry";

/**
 * Cloudinary (soft launch). Keys map to public_ids under the "arcanis/" folder.
 * Business logic only sees the returned URL, so the R2 swap in Phase 1b (B0)
 * is a config change plus a copy script.
 */
export class CloudinaryStorageProvider implements StorageProvider {
  readonly name = "cloudinary";
  constructor(
    private readonly cloudName: string,
    private readonly apiKey: string,
    private readonly apiSecret: string
  ) {}

  private sign(params: Record<string, string>): string {
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    return createHash("sha1").update(toSign + this.apiSecret).digest("hex");
  }

  private publicId(key: string): string {
    return `arcanis/${key.replace(/\.[a-z0-9]+$/i, "")}`;
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredObject> {
    const params = { public_id: this.publicId(key), timestamp: String(Math.floor(Date.now() / 1000)), overwrite: "true" };
    const form = new FormData();
    form.set("file", `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`);
    for (const [k, v] of Object.entries(params)) form.set(k, v);
    form.set("api_key", this.apiKey);
    form.set("signature", this.sign(params));
    const response = await providerFetch(
      this.name,
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      { method: "POST", body: form },
      30_000
    );
    const data = (await response.json().catch(() => null)) as { secure_url?: string; bytes?: number } | null;
    if (!data?.secure_url) throw new ProviderError("bad_response", this.name, "no secure_url");
    return { key, url: data.secure_url, bytes: data.bytes ?? bytes.length };
  }

  async remove(key: string): Promise<void> {
    const params = { public_id: this.publicId(key), timestamp: String(Math.floor(Date.now() / 1000)) };
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.set(k, v);
    form.set("api_key", this.apiKey);
    form.set("signature", this.sign(params));
    await providerFetch(this.name, `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, { method: "POST", body: form }, 15_000);
  }
}

/** Development and test only: returns a data: URL and stores nothing. */
export class InlineStorageProvider implements StorageProvider {
  readonly name = "inline";
  async put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredObject> {
    return { key, url: `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`, bytes: bytes.length };
  }
  async remove(): Promise<void> {}
}

export function storageProvider(): StorageProvider {
  if (ENV.storageProvider === "cloudinary" && ENV.cloudinaryCloudName && ENV.cloudinaryApiKey && ENV.cloudinaryApiSecret) {
    return new CloudinaryStorageProvider(ENV.cloudinaryCloudName, ENV.cloudinaryApiKey, ENV.cloudinaryApiSecret);
  }
  if (ENV.isProduction) throw new ProviderError("config", ENV.storageProvider, "storage provider not configured");
  return new InlineStorageProvider();
}

export function putObject(
  ctx: CallContext,
  key: string,
  bytes: Uint8Array,
  contentType: string,
  provider: StorageProvider = storageProvider()
): Promise<StoredObject> {
  return withTelemetry(
    { ctx: { ...ctx, surface: "storage" }, provider: provider.name, model: "put" },
    () => provider.put(key, bytes, contentType),
    (r) => ({ units: { bytes: r.bytes }, costUsd: STORAGE_PUT_COST_USD })
  );
}
