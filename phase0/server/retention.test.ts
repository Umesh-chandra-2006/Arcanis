import { describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { p0DeviceGrants, p0LoginTokens, p0ModerationEvents } from "../drizzle/schema";
import { requestSignIn, verifySignInCode } from "./auth-service";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import { RETENTION, runRetention, runRetentionSafely } from "./retention";

const DAY = 86_400_000;
const now = new Date();
const old = new Date(now.getTime() - RETENTION.maxAgeMs - 2 * DAY);
const recent = new Date(now.getTime() - RETENTION.maxAgeMs + 2 * DAY);

async function moderationEvent(createdAt: Date, status: "open" | "resolved") {
  const id = nanoid(36);
  await (await getDb())!.insert(p0ModerationEvents).values({ id, surface: "spell_input", contentType: "text", verdict: "reject", excerpt: "flagged words", status, createdAt });
  return id;
}

async function grant(prefix: "fp" | "did", userId: number, createdAt: Date) {
  const deviceKey = `${prefix}:${nanoid(24)}`;
  await (await getDb())!.insert(p0DeviceGrants).values({ deviceKey, userId, ipPrefix: "203.0.113", createdAt });
  return deviceKey;
}

describeDb("retention cleanup", () => {
  it("removes reviewed moderation records older than 12 months and keeps newer ones", async () => {
    const expired = await moderationEvent(old, "resolved");
    const kept = await moderationEvent(recent, "resolved");
    await runRetention(now);
    const left = await (await getDb())!.select({ id: p0ModerationEvents.id }).from(p0ModerationEvents).where(inArray(p0ModerationEvents.id, [expired, kept]));
    expect(left.map((r) => r.id)).toEqual([kept]);
  });

  it("keeps a flag still waiting for review, then removes it once reviewed", async () => {
    const waiting = await moderationEvent(old, "open");
    await runRetention(now);
    const db = (await getDb())!;
    expect(await db.select().from(p0ModerationEvents).where(inArray(p0ModerationEvents.id, [waiting]))).toHaveLength(1);
    await db.update(p0ModerationEvents).set({ status: "resolved" }).where(inArray(p0ModerationEvents.id, [waiting]));
    await runRetention(now);
    expect(await db.select().from(p0ModerationEvents).where(inArray(p0ModerationEvents.id, [waiting]))).toHaveLength(0);
  });

  it("removes signature and device rows older than 12 months and keeps newer ones", async () => {
    const user = await createTestUser();
    const keys = { oldFp: await grant("fp", user.id, old), oldDid: await grant("did", user.id, old), newFp: await grant("fp", user.id, recent), newDid: await grant("did", user.id, recent) };
    const result = await runRetention(now);
    expect(result.deviceGrants).toBeGreaterThanOrEqual(2);
    const left = await (await getDb())!.select({ key: p0DeviceGrants.deviceKey }).from(p0DeviceGrants).where(inArray(p0DeviceGrants.deviceKey, Object.values(keys)));
    expect(left.map((r) => r.key).sort()).toEqual([keys.newFp, keys.newDid].sort());
  });

  it("is safe to run twice", async () => {
    await moderationEvent(old, "resolved");
    await runRetention(now);
    await expect(runRetention(now)).resolves.toEqual({ moderationEvents: 0, deviceGrants: 0, loginTokens: 0 });
  });

  it("removes sign-in tokens more than 24 hours past expiry and keeps recent and live ones", async () => {
    const db = (await getDb())!;
    const token = async (expiresAt: Date) => {
      const id = nanoid(36);
      await db.insert(p0LoginTokens).values({ id, email: `${id.slice(0, 12).toLowerCase()}@test.arcanis`, linkHash: nanoid(64), codeHash: "x", expiresAt });
      return id;
    };
    const ids = {
      old: await token(new Date(now.getTime() - 25 * 3_600_000)),
      recent: await token(new Date(now.getTime() - 23 * 3_600_000)),
      live: await token(new Date(now.getTime() + 600_000)),
    };
    const first = await runRetention(now);
    expect(first.loginTokens).toBeGreaterThanOrEqual(1);
    const left = await db.select({ id: p0LoginTokens.id }).from(p0LoginTokens).where(inArray(p0LoginTokens.id, Object.values(ids)));
    expect(left.map((r) => r.id).sort()).toEqual([ids.recent, ids.live].sort());
    expect((await runRetention(now)).loginTokens).toBe(0);
    await db.delete(p0LoginTokens).where(inArray(p0LoginTokens.id, [ids.recent, ids.live]));
  });

  it("never affects someone in the middle of signing in", async () => {
    const address = `ret_${nanoid(10).toLowerCase().replace(/[^a-z0-9]/g, "x")}@test.arcanis`;
    const octet = () => Math.floor(Math.random() * 250);
    const sent = await requestSignIn(address, { ip: `192.0.2.${octet()}`, deviceId: nanoid(32) }, { termsAccepted: true });
    await runRetention();
    const result = await verifySignInCode(address, sent.devCode!, { deviceId: nanoid(32), fingerprint: null, ip: null }, null);
    expect(result.isNewUser).toBe(true);
  });
});

describe("a failed cleanup", () => {
  it("does not throw, and logs no data", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runRetentionSafely(now, async () => {
      throw new Error("secret-excerpt-text");
    });
    expect(result).toBeNull();
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret-excerpt-text");
    warn.mockRestore();
  });
});
