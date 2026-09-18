import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { requireDb } from "./db";
import {
  p0SparkBalances,
  p0SparkTransactions,
  type Phase0SparkBalance,
} from "../drizzle/schema";
import { SPARK_CREATION_COST, SPARK_SIGNUP_GRANT } from "../shared/constants";

export async function grantSignupSparks(userId: number): Promise<void> {
  const db = requireDb();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(p0SparkBalances)
      .where(eq(p0SparkBalances.userId, userId))
      .limit(1);

    if (existing) return;

    await tx.insert(p0SparkBalances).values({
      userId,
      balance: SPARK_SIGNUP_GRANT,
      totalEarned: SPARK_SIGNUP_GRANT,
      totalSpent: 0,
    });

    await tx.insert(p0SparkTransactions).values({
      id: nanoid(36),
      userId,
      amount: SPARK_SIGNUP_GRANT,
      type: "signup_grant",
      spellId: null,
    });
  });
}

export async function ensureSparkBalance(userId: number): Promise<Phase0SparkBalance> {
  const db = requireDb();
  const [existing] = await db
    .select()
    .from(p0SparkBalances)
    .where(eq(p0SparkBalances.userId, userId))
    .limit(1);

  if (existing) return existing;

  const fallback: Phase0SparkBalance = {
    userId,
    balance: SPARK_SIGNUP_GRANT,
    totalEarned: SPARK_SIGNUP_GRANT,
    totalSpent: 0,
    updatedAt: new Date(),
  };

  try {
    await grantSignupSparks(userId);
  } catch (error) {
    console.warn("[Spark] Failed to lazily grant signup sparks:", error);
    return fallback;
  }

  const [row] = await db
    .select()
    .from(p0SparkBalances)
    .where(eq(p0SparkBalances.userId, userId))
    .limit(1);

  return row ?? fallback;
}

export async function getSparkBalance(userId: number): Promise<Phase0SparkBalance> {
  return ensureSparkBalance(userId);
}

export async function spendSpark(
  userId: number,
  spellId: string
): Promise<{ success: boolean; balance: number; reason?: string }> {
  const db = requireDb();

  return db.transaction(async (tx) => {
    let [balanceRow] = await tx
      .select()
      .from(p0SparkBalances)
      .where(eq(p0SparkBalances.userId, userId))
      .limit(1);

    if (!balanceRow) {
      await tx.insert(p0SparkBalances).values({
        userId,
        balance: SPARK_SIGNUP_GRANT,
        totalEarned: SPARK_SIGNUP_GRANT,
        totalSpent: 0,
      });
      [balanceRow] = await tx
        .select()
        .from(p0SparkBalances)
        .where(eq(p0SparkBalances.userId, userId))
        .limit(1);
    }

    if (!balanceRow || balanceRow.balance < SPARK_CREATION_COST) {
      return { success: false, balance: balanceRow?.balance ?? 0, reason: "insufficient_funds" };
    }

    const newBalance = balanceRow.balance - SPARK_CREATION_COST;
    await tx
      .update(p0SparkBalances)
      .set({
        balance: newBalance,
        totalSpent: balanceRow.totalSpent + SPARK_CREATION_COST,
        updatedAt: new Date(),
      })
      .where(eq(p0SparkBalances.userId, userId));

    await tx.insert(p0SparkTransactions).values({
      id: nanoid(36),
      userId,
      amount: -SPARK_CREATION_COST,
      type: "creation_spend",
      spellId,
    });

    return { success: true, balance: newBalance };
  });
}

export async function refundSpark(userId: number, spellId: string): Promise<void> {
  const db = requireDb();
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(p0SparkBalances)
      .where(eq(p0SparkBalances.userId, userId))
      .limit(1);

    if (!row) return;

    await tx
      .update(p0SparkBalances)
      .set({
        balance: row.balance + SPARK_CREATION_COST,
        totalSpent: Math.max(0, row.totalSpent - SPARK_CREATION_COST),
        updatedAt: new Date(),
      })
      .where(eq(p0SparkBalances.userId, userId));

    await tx.insert(p0SparkTransactions).values({
      id: nanoid(36),
      userId,
      amount: SPARK_CREATION_COST,
      type: "creation_refund",
      spellId,
    });
  });
}

export async function recentSparkTransactions(
  userId: number,
  limit = 25
): Promise<typeof p0SparkTransactions.$inferSelect[]> {
  const db = requireDb();
  const rows = await db
    .select()
    .from(p0SparkTransactions)
    .where(eq(p0SparkTransactions.userId, userId))
    .orderBy(p0SparkTransactions.createdAt)
    .limit(limit);
  return [...rows].reverse();
}

export async function totalSparkStats(): Promise<{ consumed: number; remaining: number }> {
  const db = requireDb();
  const rows = await db.select().from(p0SparkBalances);
  return {
    consumed: rows.reduce((sum, r) => sum + r.totalSpent, 0),
    remaining: rows.reduce((sum, r) => sum + r.balance, 0),
  };
}