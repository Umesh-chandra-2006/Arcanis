import { describe, expect, it } from "vitest";
import { discordText, shareText, whatsappUrl, xUrl } from "./share-links";

const url = "https://arcanis.world/spell/abc?ref=XY12";

describe("share links", () => {
  it("names the spell in the text", () => {
    expect(shareText("Ember Lance")).toContain('"Ember Lance"');
  });

  it("puts the text and the link, with its referral code, into the WhatsApp message", () => {
    const parsed = new URL(whatsappUrl("Ember Lance", url));
    expect(parsed.origin).toBe("https://wa.me");
    const text = parsed.searchParams.get("text")!;
    expect(text).toContain("Ember Lance");
    expect(text.endsWith(url)).toBe(true);
  });

  it("keeps the X link and text apart, so X can unfurl the card", () => {
    const parsed = new URL(xUrl("Ember Lance", url));
    expect(parsed.origin + parsed.pathname).toBe("https://x.com/intent/post");
    expect(parsed.searchParams.get("url")).toBe(url);
    expect(parsed.searchParams.get("text")).not.toContain("arcanis.world");
  });

  it("survives characters that would break a URL", () => {
    const parsed = new URL(whatsappUrl('A & B #1 "?"', url));
    expect(parsed.searchParams.get("text")).toContain("A & B #1");
  });

  it("gives Discord the bare link on its own line, so it unfurls", () => {
    expect(discordText("Ember Lance", url).split("\n")[1]).toBe(url);
  });
});
