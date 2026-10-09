// Definition of Done item 9 and the Will lock: no Will number in any payload,
// and no XP, proficiency or Tower wording anywhere in the client.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { appRouter } from "./routers";
import { createSpell } from "./spell-pipeline";
import { grantSpark } from "./spark";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import type { TrpcContext } from "./_core/context";

const WILL_NUMBER = /will_?cost|willCost/i;

function callerFor(user: TrpcContext["user"]) {
  const ctx = {
    req: { headers: {}, ip: "203.0.113.1" },
    res: { getHeader: () => undefined, setHeader: () => {} },
    user,
    sessionId: nanoid(32),
    ip: "203.0.113.1",
    device: { deviceId: null, fingerprint: null, ip: null },
  } as unknown as TrpcContext;
  return appRouter.createCaller(ctx);
}

describeDb("Will never leaves the server as a number", () => {
  it("no spell-returning endpoint includes Will cost", async () => {
    const user = await createTestUser();
    await grantSpark(user.id, 2, "admin_adjust", `leak:${nanoid()}`);
    const png = new Uint8Array(await sharp({ create: { width: 32, height: 32, channels: 3, background: "#553311" } }).png().toBuffer());
    const created = await createSpell(
      user.id,
      { name: "Leak Test", element: "Frost", category: "Defense", castType: "Instant", description: "a wall of ice" },
      {
        deps: {
          text: async () => ({
            text: JSON.stringify({
              flavor_text: "Ice rises.",
              lore_line: "Cold remembers.",
              image_prompt: "an ice wall",
              research_complexity: 3,
              stats: { damage_min: 15, damage_max: 20, mp_cost: 12, will_cost_min: 15, will_cost_max: 16, cast_time_ms: 400 },
            }),
            provider: "fake",
            model: "m",
            inputTokens: 1,
            outputTokens: 1,
          }),
          image: async () => ({ bytes: png, mime: "image/png", provider: "fake", model: "m", width: 32, height: 32 }),
          moderate: async () => ({ verdict: "pass", reason: null, scores: {} }),
          sleep: async () => {},
        },
      }
    );
    expect(created.success).toBe(true);
    const api = callerFor(user);
    const payloads = [
      created,
      await api.spells.mySpells(),
      await api.spells.getSpellPublic({ spellId: created.spell!.id }),
      await api.spells.featured(),
      await api.reviews.latest(),
      await api.reviews.forSpell({ spellId: created.spell!.id }),
      await api.spells.sparkBalance(),
      await api.auth.me(),
    ];
    for (const p of payloads) expect(JSON.stringify(p)).not.toMatch(WILL_NUMBER);
  });
});

describe("client copy (DoD item 9)", () => {
  it("has no XP, proficiency or Tower wording, and no em dashes", () => {
    const root = path.resolve(import.meta.dirname, "../client");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|html|css)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf8");
          if (/\bTower\b|\bXP\b|proficienc|Circle \d|—/.test(text)) offenders.push(path.relative(root, full));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
