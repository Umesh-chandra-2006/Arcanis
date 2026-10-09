import { describe, it, expect } from "vitest";
import { PREVIEW_BOT_UA } from "./_core/app";

describe("link-preview bot detection", () => {
  it.each([
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    "Twitterbot/1.0",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "WhatsApp/2.23.20.0 A",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "TelegramBot (like TwitterBot)",
    "LinkedInBot/1.0",
  ])("bot: %s", (ua) => expect(PREVIEW_BOT_UA.test(ua)).toBe(true));

  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0",
  ])("person: %s", (ua) => expect(PREVIEW_BOT_UA.test(ua)).toBe(false));
});
