import { describe, expect, it } from "vitest";
import { deriveAttribution } from "./attribution";

const host = "arcanis.world";

describe("deriveAttribution", () => {
  it("prefers a tag in the link, and keeps the campaign", () => {
    expect(deriveAttribution("?utm_source=Reddit&utm_campaign=Launch Week", "https://x.com/a", host)).toEqual({ channel: "reddit", campaign: "launch-week", referralCode: undefined });
    expect(deriveAttribution("?ch=campus", "", host).channel).toBe("campus");
  });

  it("treats an invite link as a referral and carries its code", () => {
    expect(deriveAttribution("?ref=abcd2345", "", host)).toEqual({ channel: "referral", campaign: undefined, referralCode: "ABCD2345" });
  });

  it("a tag still beats an invite link, and the code is kept", () => {
    expect(deriveAttribution("?ref=ABCD2345&utm_source=discord", "", host)).toMatchObject({ channel: "discord", referralCode: "ABCD2345" });
  });

  it("falls back to the site that sent them", () => {
    expect(deriveAttribution("", "https://t.co/xyz", host).channel).toBe("x");
    expect(deriveAttribution("", "https://www.google.co.in/", host).channel).toBe("google");
    expect(deriveAttribution("", "https://old.reddit.com/r/magicbuilding", host).channel).toBe("reddit");
    expect(deriveAttribution("", "https://someblog.example/post", host).channel).toBe("someblog.example");
  });

  it("is direct with no signal, and ignores the site itself and rubbish", () => {
    expect(deriveAttribution("", "", host).channel).toBe("direct");
    expect(deriveAttribution("", "https://www.arcanis.world/codex", host).channel).toBe("direct");
    expect(deriveAttribution("", "not a url", host).channel).toBe("direct");
    expect(deriveAttribution("?utm_source=%20%20", "", host).channel).toBe("direct");
  });

  it("only ever yields values the server accepts", () => {
    const { channel } = deriveAttribution(`?utm_source=${encodeURIComponent("<script>alert(1)</script>".repeat(5))}`, "", host);
    expect(channel).toMatch(/^[a-z0-9._-]{1,32}$/);
  });
});
