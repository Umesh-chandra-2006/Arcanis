// Card art variants and storage (Build Plan 7.6, task A9). The original, a
// portrait card crop and a composed 1200x630 Open Graph image go to object
// storage; the database keeps URLs only.
import sharp from "sharp";
import type { CallContext, ImageResult } from "../shared/providers";
import { putObject } from "./providers/storage";

export interface StoredSpellImages {
  imageUrl: string;
  cardImageUrl: string;
  ogImageUrl: string;
  dominantColor: string;
}

const CARD = { width: 768, height: 1024 };
const OG = { width: 1200, height: 630 };

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

const GOLD = "#c9a24b";

/**
 * Accent colour for the card border: the most common vivid hue in the art.
 * Dark-fantasy art is mostly near-black, so plain "dominant colour" picks a
 * murky shadow; only saturated, mid-brightness pixels vote here. Gold when the
 * art has no vivid colour.
 */
export async function dominantColor(bytes: Uint8Array): Promise<string> {
  const { data, info } = await sharp(bytes).resize(48, 48, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = Array.from({ length: 12 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < info.width * info.height * 3; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    if (sat < 0.35 || light < 45 || light > 225) continue;
    let hue = 0;
    if (max === r) hue = ((g - b) / (max - min)) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
    const bucket = buckets[Math.floor((((hue * 60) % 360) + 360) % 360 / 30)];
    bucket.weight += sat;
    bucket.r += r * sat;
    bucket.g += g * sat;
    bucket.b += b * sat;
  }
  const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
  // Too few vivid pixels to be meaningful.
  if (best.weight < 20) return GOLD;
  let [r, g, b] = [best.r / best.weight, best.g / best.weight, best.b / best.weight];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum < 100) {
    const lift = 100 / Math.max(lum, 1);
    [r, g, b] = [r * lift, g * lift, b * lift];
  }
  return toHex(r, g, b);
}

export async function cardVariant(bytes: Uint8Array): Promise<Buffer> {
  return sharp(bytes).resize(CARD.width, CARD.height, { fit: "cover", position: "attention" }).webp({ quality: 86 }).toBuffer();
}

/**
 * Composed share image: the art on the right, spell name, element and the
 * Arcanis mark on a black and gold panel. Not a crop of the square art.
 */
export async function ogVariant(bytes: Uint8Array, meta: { name: string; element: string; accent: string }): Promise<Buffer> {
  const art = await sharp(bytes).resize(630, 630, { fit: "cover", position: "attention" }).toBuffer();
  const name = escapeXml(meta.name.slice(0, 40));
  const size = name.length > 22 ? 52 : 64;
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG.width}" height="${OG.height}">
  <defs>
    <linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#0b0a08" stop-opacity="1"/>
      <stop offset="0.55" stop-color="#0b0a08" stop-opacity="0.95"/>
      <stop offset="0.75" stop-color="#0b0a08" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${OG.width}" height="${OG.height}" fill="url(#fade)"/>
  <rect x="18" y="18" width="${OG.width - 36}" height="${OG.height - 36}" fill="none" stroke="#c9a24b" stroke-width="3"/>
  <rect x="28" y="28" width="${OG.width - 56}" height="${OG.height - 56}" fill="none" stroke="${meta.accent}" stroke-opacity="0.6" stroke-width="1.5"/>
  <text x="72" y="120" font-family="Georgia, 'DejaVu Serif', serif" font-size="26" letter-spacing="10" fill="#c9a24b">ARCANIS</text>
  <text x="72" y="300" font-family="Georgia, 'DejaVu Serif', serif" font-size="${size}" font-weight="bold" fill="#f3e6c4">${name}</text>
  <text x="72" y="360" font-family="Georgia, 'DejaVu Serif', serif" font-size="30" fill="${meta.accent}">${escapeXml(meta.element)} spell</text>
  <text x="72" y="540" font-family="Georgia, 'DejaVu Serif', serif" font-size="24" fill="#9a8f78">Forged by a player. Describe yours.</text>
</svg>`);
  return sharp({ create: { width: OG.width, height: OG.height, channels: 3, background: "#0b0a08" } })
    .composite([
      { input: art, left: OG.width - 630, top: 0 },
      { input: overlay, left: 0, top: 0 },
    ])
    .jpeg({ quality: 86 })
    .toBuffer();
}

export async function storeSpellImage(
  ids: Omit<CallContext, "surface">,
  spellId: string,
  image: ImageResult,
  meta: { name: string; element: string }
): Promise<StoredSpellImages> {
  const accent = await dominantColor(image.bytes);
  const [card, og] = await Promise.all([cardVariant(image.bytes), ogVariant(image.bytes, { ...meta, accent })]);
  const ext = image.mime === "image/png" ? "png" : image.mime === "image/webp" ? "webp" : "jpg";
  const ctx = { ...ids, surface: "storage" as const };
  const [original, cardStored, ogStored] = await Promise.all([
    putObject(ctx, `spells/${spellId}/original.${ext}`, image.bytes, image.mime),
    putObject(ctx, `spells/${spellId}/card.webp`, new Uint8Array(card), "image/webp"),
    putObject(ctx, `spells/${spellId}/og.jpg`, new Uint8Array(og), "image/jpeg"),
  ]);
  return { imageUrl: original.url, cardImageUrl: cardStored.url, ogImageUrl: ogStored.url, dominantColor: accent };
}
