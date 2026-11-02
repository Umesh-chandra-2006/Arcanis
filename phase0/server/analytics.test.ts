import { it, expect } from "vitest";
import { nanoid } from "nanoid";
import { and, eq, gte, lt } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { p0AnalyticsEvents, p0Referrals, p0Spells, p0Users } from "../drizzle/schema";
import { computeGateMetrics } from "./gate-metrics";
import { computeFunnel } from "./funnel";
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
    const { api } = caller();
    const spellId = nanoid(20);
    await api.analytics.track({ eventType: "preview_cta_clicked", metadata: { spellId, email: "leak@example.com" } });
    const rows = await (await getDb())!.select().from(p0AnalyticsEvents).where(eq(p0AnalyticsEvents.eventType, "preview_cta_clicked"));
    const row = rows.find((r) => (r.metadata as { spellId?: string }).spellId === spellId)!;
    expect(row.metadata).toEqual({ spellId });
    expect(row.userId).toBeNull();
    // The device id is anti-abuse only: an event never carries it (privacy policy).
    expect(row.sessionId).toBeNull();
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
    const { api } = caller(user);
    await api.analytics.track({ eventType: "lab_opened", metadata: { userId: 1 } as Record<string, unknown> });
    const [row] = await (await getDb())!.select().from(p0AnalyticsEvents).where(eq(p0AnalyticsEvents.userId, user.id));
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

describeDb("signup funnel", () => {
  it("is admin-only", async () => {
    const user = await createTestUser();
    await expect(caller(user).api.analytics.funnel()).rejects.toThrow();
  });

  it("counts each step once per person, and judges a return only when the day has passed", async () => {
    const db = (await getDb())!;
    // An isolated period far in the future so other test data never counts.
    const t0 = new Date(Date.UTC(2036, 0, 1, 12));
    const at = (days: number) => new Date(t0.getTime() + days * 86_400_000);
    await db.delete(p0AnalyticsEvents).where(and(gte(p0AnalyticsEvents.createdAt, at(-30)), lt(p0AnalyticsEvents.createdAt, at(60))));
    await db.delete(p0Users).where(and(gte(p0Users.createdAt, at(-30)), lt(p0Users.createdAt, at(60))));
    const [a, b, c] = await Promise.all([createTestUser({ createdAt: t0 }), createTestUser({ createdAt: t0 }), createTestUser({ createdAt: at(9.5) })]);
    const event = (eventType: string, userId: number | null, day: number, metadata: Record<string, unknown> = {}) =>
      db.insert(p0AnalyticsEvents).values({ id: nanoid(36), eventType, userId, metadata, createdAt: at(day) });

    await event("landing_view", null, 0, { channel: "reddit" });
    await event("landing_view", null, 0.1, { channel: "reddit" });
    await event("preview_viewed", null, 0.2, { channel: "referral" });
    await event("landing_draft_started", null, 0.2);
    await event("signup_confirmed", a.id, 0, { channel: "reddit", campaign: "launch" });
    await event("signup_confirmed", b.id, 0, { channel: "referral" });
    // User c has no signup event in the window, so they count as unknown.
    await event("creation_succeeded", a.id, 0.5);
    await event("creation_succeeded", a.id, 1.5);
    await event("creation_succeeded", b.id, 0.5);
    await event("share_clicked", a.id, 0.6, { spellId: "x", channel: "copy" });
    await event("share_clicked", a.id, 0.7, { spellId: "x", channel: "copy" });
    await event("session_day_n", a.id, 1.5, { n: 1 });
    await event("session_day_n", a.id, 7.5, { n: 7 });
    await event("session_day_n", c.id, 10.5, { n: 1 });

    const report = await computeFunnel({ now: at(10), days: 20 });
    const step = Object.fromEntries(report.steps.map((s) => [s.key, s]));
    expect(step.visit.count).toBe(3);
    expect(step.draft).toMatchObject({ count: 1, of: 3 });
    expect(step.signup.count).toBe(3);
    const channel = Object.fromEntries(report.channels.map((r) => [r.channel, r]));
    expect(channel.reddit).toEqual({ channel: "reddit", visits: 2, signups: 1, firstSpells: 1, shared: 1 });
    expect(channel.referral).toEqual({ channel: "referral", visits: 1, signups: 1, firstSpells: 1, shared: 0 });
    expect(channel.unknown).toMatchObject({ signups: 1, firstSpells: 0 });
    expect(step.first_spell).toMatchObject({ count: 2, of: 3 });
    expect(step.second_spell).toMatchObject({ count: 1, of: 2 });
    expect(step.shared).toMatchObject({ count: 1, of: 2 });
    // User c signed up on day 9.5, so neither return can be judged for them yet.
    expect(step.day1).toMatchObject({ count: 1, of: 2 });
    expect(step.day7).toMatchObject({ count: 1, of: 2 });

    // The gate metrics query has no upper date bound, so future rows must not stay behind.
    await db.delete(p0AnalyticsEvents).where(and(gte(p0AnalyticsEvents.createdAt, at(-30)), lt(p0AnalyticsEvents.createdAt, at(60))));
    await db.delete(p0Users).where(and(gte(p0Users.createdAt, at(-30)), lt(p0Users.createdAt, at(60))));
  });
});

describeDb("gate 1a metrics", () => {
  it("computes signup conversion, day-7 retention and k-factor per the Phase Plan", async () => {
    const db = (await getDb())!;
    // An isolated period far in the future so other test data never counts.
    const t0 = new Date(Date.UTC(2034, 0, 1, 12));
    const at = (days: number) => new Date(t0.getTime() + days * 86_400_000);
    // Repeatable: clear this test's window in the test database first.
    const window = and(gte(p0Spells.createdAt, at(-30)), lt(p0Spells.createdAt, at(60)));
    await db.delete(p0Spells).where(window);
    await db.delete(p0AnalyticsEvents).where(and(gte(p0AnalyticsEvents.createdAt, at(-30)), lt(p0AnalyticsEvents.createdAt, at(60))));
    await db.delete(p0Referrals).where(and(gte(p0Referrals.createdAt, at(-30)), lt(p0Referrals.createdAt, at(60))));
    await db.delete(p0Users).where(and(gte(p0Users.createdAt, at(-30)), lt(p0Users.createdAt, at(60))));
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
