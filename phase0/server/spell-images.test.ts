import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { dominantColor, ogVariant, cardVariant } from "./spell-images";

const solid = async (bg: string, w = 64, h = 64) =>
  new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: bg } }).png().toBuffer());

describe("spell image variants", () => {
  it("picks the vivid hue, not the dark background", async () => {
    // Mostly near-black with a red streak.
    const base = sharp({ create: { width: 64, height: 64, channels: 3, background: "#0a0a12" } });
    const streak = await sharp({ create: { width: 64, height: 16, channels: 3, background: "#d02020" } }).png().toBuffer();
    const img = new Uint8Array(await base.composite([{ input: streak, top: 24, left: 0 }]).png().toBuffer());
    const hex = await dominantColor(img);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g + 60);
    expect(r).toBeGreaterThan(b + 60);
  });

  it("falls back to gold when there is no vivid colour", async () => {
    expect(await dominantColor(await solid("#111111"))).toBe("#c9a24b");
  });

  it("composes a 1200x630 OG image and a 768x1024 card", async () => {
    const art = await solid("#335577", 512, 512);
    const og = await sharp(await ogVariant(art, { name: "Ember Lash", element: "Fire", accent: "#d02020" })).metadata();
    const card = await sharp(await cardVariant(art)).metadata();
    expect([og.width, og.height]).toEqual([1200, 630]);
    expect([card.width, card.height]).toEqual([768, 1024]);
  });
});
