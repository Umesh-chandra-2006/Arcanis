import { describe, it, expect } from "vitest";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { p0SparkLedger } from "../drizzle/schema";
import {
  commitSpark,
  getSparkBalance,
  grantSignupSpark,
  grantSpark,
  ipPrefix,
  refundSpark,
  reserveSpark,
  weekStartUtc,
  weeklyGrantAmount,
  STALE_RESERVATION_MS,
} from "./spark";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import { SPARK } from "../shared/constants";

const device = () => ({ deviceId: nanoid(32), fingerprint: null, ip: "203.0.113.7" });
// Users are created "now", so checking at "now" stays inside their signup week
// and no weekly allowance lands during balance assertions.
const now = () => new Date();

describe("spark pure helpers", () => {
  it("weekStartUtc is the Monday", () => {
    expect(weekStartUtc(new Date("2026-10-10T15:00:00Z")).toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(weekStartUtc(new Date("2026-10-05T00:00:00Z")).toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(weekStartUtc(new Date("2026-10-11T23:59:59Z")).toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("weekly allowance respects the rollover cap", () => {
    expect(weeklyGrantAmount(0)).toBe(3);
    expect(weeklyGrantAmount(8)).toBe(2);
    expect(weeklyGrantAmount(10)).toBe(0);
    expect(weeklyGrantAmount(14)).toBe(0);
  });

  it("ipPrefix", () => {
    expect(ipPrefix("203.0.113.7")).toBe("203.0.113");
    expect(ipPrefix("::ffff:203.0.113.7")).toBe("203.0.113");
    expect(ipPrefix("2001:db8:abcd:12::1")).toBe("2001:db8:abcd");
  });
});

describeDb("spark ledger", () => {
  it("grants the signup Spark once per account and once per device", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const d = device();
    expect(await grantSignupSpark(a.id, d)).toEqual({ granted: true });
    expect((await grantSignupSpark(a.id, device())).granted).toBe(false);
    expect(await grantSignupSpark(b.id, d)).toEqual({ granted: false, reason: "device_used" });
    expect(await grantSignupSpark(b.id, { ...d, deviceId: null })).toEqual({ granted: false, reason: "no_device" });
    expect((await getSparkBalance(a.id, now())).balance).toBe(SPARK.signupGrant);
    expect((await getSparkBalance(b.id, now())).balance).toBe(0);
  });

  it("blocks a second device on the same network with the same fingerprint", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const fp = nanoid(32).replace(/[^a-f0-9]/gi, "a").toLowerCase();
    await grantSignupSpark(a.id, { deviceId: nanoid(32), fingerprint: fp, ip: "198.51.100.10" });
    const second = await grantSignupSpark(b.id, { deviceId: nanoid(32), fingerprint: fp, ip: "198.51.100.99" });
    expect(second.granted).toBe(false);
  });

  it("parallel creates never overspend", async () => {
    const user = await createTestUser();
    await grantSpark(user.id, 2, "admin_adjust", `test:${nanoid()}`);
    const results = await Promise.all(Array.from({ length: 8 }, () => reserveSpark(user.id, nanoid(36), now())));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect((await getSparkBalance(user.id, now())).balance).toBe(0);
  });

  it("parallel refunds never double-refund", async () => {
    const user = await createTestUser();
    await grantSpark(user.id, 1, "admin_adjust", `test:${nanoid()}`);
    const r = await reserveSpark(user.id, nanoid(36), now());
    if (!r.ok) throw new Error("reserve failed");
    const refunds = await Promise.all(Array.from({ length: 6 }, () => refundSpark(r.entryId)));
    expect(refunds.filter(Boolean)).toHaveLength(1);
    expect((await getSparkBalance(user.id, now())).balance).toBe(1);
  });

  it("a committed spend cannot be refunded, and commit happens once", async () => {
    const user = await createTestUser();
    await grantSpark(user.id, 1, "admin_adjust", `test:${nanoid()}`);
    const r = await reserveSpark(user.id, nanoid(36), now());
    if (!r.ok) throw new Error("reserve failed");
    expect(await commitSpark(r.entryId)).toBe(true);
    expect(await commitSpark(r.entryId)).toBe(false);
    expect(await refundSpark(r.entryId)).toBe(false);
    expect((await getSparkBalance(user.id, now())).balance).toBe(0);
  });

  it("weekly allowance: none in the signup week, once per later week, capped", async () => {
    const user = await createTestUser({ createdAt: new Date("2026-09-01T10:00:00Z") });
    await grantSpark(user.id, 1, "admin_adjust", `test:${nanoid()}`);
    expect((await getSparkBalance(user.id, new Date("2026-09-02T10:00:00Z"))).balance).toBe(1);
    const week2 = new Date("2026-09-09T10:00:00Z");
    const parallel = await Promise.all(Array.from({ length: 5 }, () => getSparkBalance(user.id, week2)));
    expect(parallel.map((b) => b.balance)).toEqual([4, 4, 4, 4, 4]);
    await grantSpark(user.id, 5, "admin_adjust", `test:${nanoid()}`); // balance 9
    expect((await getSparkBalance(user.id, new Date("2026-09-16T10:00:00Z"))).balance).toBe(10);
  });

  it("releases a reservation left pending by a crashed run", async () => {
    const user = await createTestUser();
    await grantSpark(user.id, 1, "admin_adjust", `test:${nanoid()}`);
    const r = await reserveSpark(user.id, nanoid(36), now());
    if (!r.ok) throw new Error("reserve failed");
    const db = (await getDb())!;
    await db
      .update(p0SparkLedger)
      .set({ createdAt: new Date(Date.now() - STALE_RESERVATION_MS - 60_000) })
      .where(eq(p0SparkLedger.id, r.entryId));
    expect((await reserveSpark(user.id, nanoid(36), now())).ok).toBe(true);
  });
});
