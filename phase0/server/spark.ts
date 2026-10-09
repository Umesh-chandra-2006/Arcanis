// Spark: the hard currency (Master Doc 22, Build Plan 6). Every Spark operation
// goes through this module. The ledger is append-only: amounts never change,
// only status moves pending -> committed or pending -> reversed.
import { nanoid } from "nanoid";
import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0DeviceGrants, p0SparkLedger, p0Users, type Phase0SparkLedgerEntry } from "../drizzle/schema";
import { SPARK } from "../shared/constants";

type Db = ReturnType<typeof requireDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type EntryType = Phase0SparkLedgerEntry["type"];

/** A creation that has neither committed nor refunded after this long crashed. */
export const STALE_RESERVATION_MS = 10 * 60 * 1000;

function isDuplicateKey(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "ER_DUP_ENTRY" || e?.cause?.code === "ER_DUP_ENTRY";
}

async function balanceIn(tx: Tx | Db, userId: number): Promise<number> {
  const [row] = await tx
    .select({ total: sql<string | null>`SUM(${p0SparkLedger.amount})` })
    .from(p0SparkLedger)
    .where(and(eq(p0SparkLedger.userId, userId), ne(p0SparkLedger.status, "reversed")));
  return Number(row?.total ?? 0);
}

/**
 * Every Spark transaction runs at READ COMMITTED: after the user's row lock is
 * taken, balance reads must see spends committed by the transaction that held
 * the lock before. (TiDB's REPEATABLE READ fixes the snapshot at BEGIN, which
 * let parallel reserves overspend.)
 */
function sparkTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return requireDb().transaction(fn, { isolationLevel: "read committed" });
}

/** Serializes Spark operations per user. */
async function lockUser(tx: Tx, userId: number): Promise<{ createdAt: Date } | null> {
  const [user] = await tx
    .select({ createdAt: p0Users.createdAt })
    .from(p0Users)
    .where(eq(p0Users.id, userId))
    .for("update");
  return user ?? null;
}

async function insertEntry(
  tx: Tx | Db,
  entry: {
    userId: number;
    amount: number;
    type: EntryType;
    status: "pending" | "committed";
    refId?: string | null;
    idempotencyKey?: string | null;
    note?: string | null;
  }
): Promise<string> {
  const id = nanoid(36);
  await tx.insert(p0SparkLedger).values({
    id,
    userId: entry.userId,
    amount: entry.amount,
    type: entry.type,
    status: entry.status,
    refId: entry.refId ?? null,
    idempotencyKey: entry.idempotencyKey ?? null,
    note: entry.note ?? null,
  });
  return id;
}

/** Monday 00:00 UTC of the week containing `now`. */
export function weekStartUtc(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d;
}

/** Weekly allowance after the cap: never raises a balance above the rollover cap. */
export function weeklyGrantAmount(balance: number): number {
  return Math.max(0, Math.min(SPARK.weeklyAllowance, SPARK.rolloverCap - balance));
}

/**
 * Grants this week's free allowance once, lazily, from the week after signup.
 * Safe under concurrency: the idempotency key is unique.
 */
async function applyWeeklyAllowance(tx: Tx, userId: number, userCreatedAt: Date, now: Date): Promise<void> {
  const weekStart = weekStartUtc(now);
  if (userCreatedAt.getTime() >= weekStart.getTime()) return;
  const key = `weekly:${userId}:${weekStart.toISOString().slice(0, 10)}`;
  const [existing] = await tx
    .select({ id: p0SparkLedger.id })
    .from(p0SparkLedger)
    .where(eq(p0SparkLedger.idempotencyKey, key))
    .limit(1);
  if (existing) return;
  const amount = weeklyGrantAmount(await balanceIn(tx, userId));
  // A zero-amount row still marks the week as handled.
  try {
    await insertEntry(tx, { userId, amount, type: "grant_weekly_allowance", status: "committed", idempotencyKey: key });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }
}

export interface SparkBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

/** Current balance; grants the weekly allowance first if it is due. */
export async function getSparkBalance(userId: number, now = new Date()): Promise<SparkBalance> {
  const db = requireDb();
  await sparkTx(async (tx) => {
    const user = await lockUser(tx, userId);
    if (user) await applyWeeklyAllowance(tx, userId, user.createdAt, now);
  });
  const rows = await db
    .select({ amount: p0SparkLedger.amount, status: p0SparkLedger.status })
    .from(p0SparkLedger)
    .where(eq(p0SparkLedger.userId, userId));
  let balance = 0;
  let totalEarned = 0;
  let totalSpent = 0;
  for (const r of rows) {
    if (r.status === "reversed") continue;
    balance += r.amount;
    if (r.amount > 0) totalEarned += r.amount;
    else totalSpent -= r.amount;
  }
  return { balance, totalEarned, totalSpent };
}

export type ReserveResult =
  | { ok: true; entryId: string; balance: number }
  | { ok: false; reason: "insufficient_funds" | "no_user"; balance: number };

/**
 * Reserves the creation cost before any generation runs. One transaction holds
 * the user's row lock, so concurrent reserves can never overspend.
 */
export async function reserveSpark(userId: number, runId: string, now = new Date()): Promise<ReserveResult> {
  return sparkTx(async (tx) => {
    const user = await lockUser(tx, userId);
    if (!user) return { ok: false, reason: "no_user", balance: 0 };
    await applyWeeklyAllowance(tx, userId, user.createdAt, now);
    // A spend left pending by a crashed run is released, never kept.
    await tx
      .update(p0SparkLedger)
      .set({ status: "reversed", note: "stale reservation released", updatedAt: sql`CURRENT_TIMESTAMP(3)` })
      .where(
        and(
          eq(p0SparkLedger.userId, userId),
          eq(p0SparkLedger.status, "pending"),
          eq(p0SparkLedger.type, "spend_creation"),
          lt(p0SparkLedger.createdAt, new Date(now.getTime() - STALE_RESERVATION_MS))
        )
      );
    const balance = await balanceIn(tx, userId);
    if (balance < SPARK.creationCost) return { ok: false, reason: "insufficient_funds", balance };
    const entryId = await insertEntry(tx, {
      userId,
      amount: -SPARK.creationCost,
      type: "spend_creation",
      status: "pending",
      refId: runId,
    });
    return { ok: true, entryId, balance: balance - SPARK.creationCost };
  });
}

/** Commits a reserved spend. Returns false if it was not pending. */
export async function commitSpark(entryId: string): Promise<boolean> {
  const db = requireDb();
  const [result] = await db
    .update(p0SparkLedger)
    .set({ status: "committed", updatedAt: sql`CURRENT_TIMESTAMP(3)` })
    .where(and(eq(p0SparkLedger.id, entryId), eq(p0SparkLedger.status, "pending"), eq(p0SparkLedger.type, "spend_creation")));
  return (result as { affectedRows?: number }).affectedRows === 1;
}

/**
 * Refunds a reserved spend by reversing it. A conditional update, so only one
 * of any number of concurrent refunds can succeed. Returns true if this call
 * refunded.
 */
export async function refundSpark(entryId: string): Promise<boolean> {
  const db = requireDb();
  const [result] = await db
    .update(p0SparkLedger)
    .set({ status: "reversed", updatedAt: sql`CURRENT_TIMESTAMP(3)` })
    .where(and(eq(p0SparkLedger.id, entryId), eq(p0SparkLedger.status, "pending"), eq(p0SparkLedger.type, "spend_creation")));
  return (result as { affectedRows?: number }).affectedRows === 1;
}

/** IPv4 /24 or IPv6 /48, so a grant check survives small IP changes. */
export function ipPrefix(ip: string | undefined | null): string | null {
  if (!ip) return null;
  const clean = ip.replace(/^::ffff:/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(clean)) return clean.split(".").slice(0, 3).join(".");
  if (clean.includes(":")) return clean.split(":").slice(0, 3).join(":");
  return clean;
}

export interface DeviceSignals {
  /** Server-issued long-lived httpOnly cookie. */
  deviceId: string | null;
  /** Client-computed browser fingerprint hash (forgeable; only used together with the IP prefix). */
  fingerprint: string | null;
  ip: string | null;
}

/**
 * First free Spark grant, once per device (CLAUDE.md "Identity", F7). Denied
 * when the device cookie is missing or already granted, or when the same
 * fingerprint was granted from the same network.
 */
export async function grantSignupSpark(
  userId: number,
  device: DeviceSignals
): Promise<{ granted: boolean; reason?: "no_device" | "device_used" | "already_granted" }> {
  if (!device.deviceId) return { granted: false, reason: "no_device" };
  const prefix = ipPrefix(device.ip);
  const keys = [`did:${device.deviceId}`];
  if (device.fingerprint && prefix) keys.push(`fp:${device.fingerprint}:${prefix}`);
  return sparkTx(async (tx) => {
    await lockUser(tx, userId);
    const used = await tx.select({ key: p0DeviceGrants.deviceKey }).from(p0DeviceGrants).where(inArray(p0DeviceGrants.deviceKey, keys));
    if (used.length) return { granted: false, reason: "device_used" as const };
    try {
      await insertEntry(tx, {
        userId,
        amount: SPARK.signupGrant,
        type: "grant_signup",
        status: "committed",
        idempotencyKey: `signup:${userId}`,
      });
    } catch (error) {
      if (isDuplicateKey(error)) return { granted: false, reason: "already_granted" as const };
      throw error;
    }
    for (const deviceKey of keys) {
      await tx.insert(p0DeviceGrants).values({ deviceKey, userId, ipPrefix: prefix });
    }
    return { granted: true };
  });
}

/** Idempotent grant (referral bonuses and similar). Returns false if the key was already used. */
export async function grantSpark(
  userId: number,
  amount: number,
  type: Extract<EntryType, "grant_referral_inviter" | "grant_referral_invitee" | "admin_adjust">,
  idempotencyKey: string,
  note?: string
): Promise<boolean> {
  if (amount === 0) return false;
  const db = requireDb();
  try {
    await insertEntry(db, { userId, amount, type, status: "committed", idempotencyKey, note });
    return true;
  } catch (error) {
    if (isDuplicateKey(error)) return false;
    throw error;
  }
}

export async function recentSparkEntries(userId: number, limit = 25): Promise<Phase0SparkLedgerEntry[]> {
  const db = requireDb();
  return db
    .select()
    .from(p0SparkLedger)
    .where(eq(p0SparkLedger.userId, userId))
    .orderBy(desc(p0SparkLedger.createdAt))
    .limit(limit);
}

export async function totalSparkStats(): Promise<{ consumed: number; remaining: number }> {
  const db = requireDb();
  const [row] = await db
    .select({
      consumed: sql<string | null>`SUM(CASE WHEN ${p0SparkLedger.amount} < 0 THEN -${p0SparkLedger.amount} ELSE 0 END)`,
      remaining: sql<string | null>`SUM(${p0SparkLedger.amount})`,
    })
    .from(p0SparkLedger)
    .where(ne(p0SparkLedger.status, "reversed"));
  return { consumed: Number(row?.consumed ?? 0), remaining: Number(row?.remaining ?? 0) };
}
