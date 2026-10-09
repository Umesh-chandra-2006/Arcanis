import { it, expect } from "vitest";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { p0AnalyticsEvents, p0Referrals, p0Spells } from "../drizzle/schema";
import { computeGateMetrics } from "./gate-metrics";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import type { TrpcContext } from "./_core/context";

function caller(user: TrpcContext["user"] = null) {
  const sessionId = nanoid(32);
  const ctx = {
    req: { headers: {}, ip: `203.0.113.${Math.floor(Math.random() * 250)}` },
    res: { getHeader: () => undefined, setHeader: () => {} },
    user,
    sessionId,
    ip: `203.0.113.${Math.floor(Math.random() * 250)}`,
    device: { deviceId: sessionId, fingerprint: null, ip: null },
  } as unknown as TrpcContext;
  return { api: appRouter.createCaller(ctx), sessionId };
}

describeDb("public tracking endpoint", () => {
  it("accepts an allowlisted anonymous event and drops unknown props", async () => {
    const { api, sessionId } = caller();
    await api.analytics.track({ eventType: "preview_cta_clicked", metadata: { spellId: "abc", email: "leak@example.com" } });
    const [row] = await (await getDb())!.select().from(p0AnalyticsEvents).where(eq(p0AnalyticsEvents.sessionId, sessionId));
    expect(row.metadata).toEqual({ spellId: "abc" });
    expect(row.userId).toBeNull();
  });

  it("rejects events outside the allowlist, bad props, and oversized payloads", async () => {
    const { api } = caller();
    await expect(api.analytics.track({ eventType: "creation_succeeded", metadata: {} })).rejects.toThrow();
    await expect(api.analytics.track({ eventType: "lab_opened", metadata: {} })).rejects.toThrow(); // signed-in only
    await expect(api.analytics.track({ eventType: "share_clicked", metadata: { spellId: "x", channel: "fax" } })).rejects.toThrow();
    await expect(api.analytics.track({ eventType: "landing_view", metadata: { path: "x".repeat(2000) } })).rejects.toThrow();
  });

  it("takes the user from the session, never the payload", async () => {
    const user = await createTestUser();
    const { api, sessionId } = caller(user);
    await api.analytics.track({ eventType: "lab_opened", metadata: { userId: 1 } as Record<string, unknown> });
    const [row] = await (await getDb())!.select().from(p0AnalyticsEvents).where(eq(p0AnalyticsEvents.sessionId, sessionId));
    expect(row.userId).toBe(user.id);
    expect(row.metadata).toEqual({});
  });

  it("rate-limits per anonymous id", async () => {
    const { api } = caller();
    let refused = 0;
    for (let i = 0; i < 65; i++) {
      await api.analytics.track({ eventType: "landing_view", metadata: {} }).catch(() => refused++);
    }
    expect(refused).toBeGreaterThan(0);
  });

  it("gate metrics are admin-only", async () => {
    const user = await createTestUser();
    await expect(caller(user).api.analytics.gateMetrics()).rejects.toThrow();
  });
});

describeDb("gate 1a metrics", () => {
  it("computes signup conversion, day-7 retention and k-factor per the Phase Plan", async () => {
    const db = (await getDb())!;
    // An isolated period far in the future so other test data never counts.
    const t0 = new Date(Date.UTC(2034, 0, 1, 12));
    const at = (days: number) => new Date(t0.getTime() + days * 86_400_000);
    const users = await Promise.all([0, 1, 2, 3].map(() => createTestUser({ createdAt: t0 })));
    const spell = async (owner: number, day: number) => {
      const id = nanoid(36);
      await db.insert(p0Spells).values({
        id, ownerId: owner, name: "m", element: "Fire", category: "Attack", castType: "Instant", tier: "Basic",
        damageMin: 10, damageMax: 12, mpCost: 10, willCostMin: 12, willCostMax: 13, castTimeMs: 400,
        flavorText: "f", loreLine: "l", imageUrl: "", generationMetadata: {}, createdAt: at(day),
      });
      return id;
    };
    // users 0 and 1 create within 24h; user 0 creates again on day 9 (day-7 retained); user 2 creates on day 3.
    const first0 = await spell(users[0].id, 0.5);
    await spell(users[1].id, 0.2);
    await spell(users[0].id, 9);
    await spell(users[2].id, 3);
    const event = (type: string, userId: number | null, day: number, metadata: Record<string, unknown> = {}) =>
      db.insert(p0AnalyticsEvents).values({ id: nanoid(36), eventType: type, userId, metadata, createdAt: at(day) });
    await event("share_clicked", users[0].id, 1, { spellId: first0, channel: "copy" });

    const report = await computeGateMetrics({ now: at(20), days: 21 });
    const m = Object.fromEntries(report.metrics.map((x) => [x.key, x]));
    expect(m.signup_to_first_creation.detail).toBe("2 / 4");
    expect(m.signup_to_first_creation.value).toBeCloseTo(0.5);
    expect(m.day7_creation_retention.detail).toBe("1 / 3");
    expect(m.first_creation_to_share.detail.startsWith("1 / 3")).toBe(true);

    // k-factor over the last 7 days: 2 shares by 2 active players, 1 attributed signup.
    await event("session_day_n", users[0].id, 15, { n: 15 });
    await event("session_day_n", users[1].id, 16, { n: 16 });
    await event("share_clicked", users[0].id, 15, { spellId: first0, channel: "copy" });
    await event("share_clicked", users[1].id, 16, { spellId: first0, channel: "copy" });
    await db.insert(p0Referrals).values({ id: nanoid(36), inviterId: users[0].id, inviteeId: users[3].id, status: "pending", createdAt: at(17) });
    const week = await computeGateMetrics({ now: at(20), days: 21 });
    const k = week.metrics.find((x) => x.key === "k_factor")!;
    expect(k.value).toBeCloseTo((2 / 2) * (1 / 2));
  });
});
