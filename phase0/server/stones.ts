// Refinement Stones (Master Doc 22.1, v7.6). Every stone operation goes through
// this module. The ledger follows the Spark rules: append-only, amounts never
// change, status moves pending -> committed or pending -> reversed. A stone is
// minted only by a creation whose Spark committed, and spent only on a mend.
// Nothing here converts a stone to or from Spark.
import { nanoid } from "nanoid";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0StoneLedger, p0Users } from "../drizzle/schema";
import { STONES } from "../shared/constants";

type Db = ReturnType<typeof requireDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** A mend that has neither committed nor refunded after this long crashed. */
export const STALE_STONE_RESERVATION_MS = 10 * 60 * 1000;

function isDuplicateKey(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "ER_DUP_ENTRY" || e?.cause?.code === "ER_DUP_ENTRY";
}

async function balanceIn(tx: Tx | Db, userId: number): Promise<number> {
  const [row] = await tx
    .select({ total: sql<string | null>`SUM(${p0StoneLedger.amount})` })
    .from(p0StoneLedger)
    .where(and(eq(p0StoneLedger.userId, userId), ne(p0StoneLedger.status, "reversed")));
  return Number(row?.total ?? 0);
}

export async function getStoneBalance(userId: number): Promise<number> {
  return balanceIn(requireDb(), userId);
}

/**
 * Mints the stone a forged spell earns. Call only after that creation's Spark
 * has committed. Idempotent per spell, so a retry can never mint twice.
 */
export async function grantStoneForCreation(userId: number, spellId: string): Promise<boolean> {
  try {
    await requireDb().insert(p0StoneLedger).values({
      id: nanoid(36),
      userId,
      amount: STONES.perCreation,
      type: "grant_creation",
      status: "committed",
      refId: spellId,
      idempotencyKey: `forge:${spellId}`,
    });
    return true;
  } catch (error) {
    if (isDuplicateKey(error)) return false;
    throw error;
  }
}

export type StoneReserveResult =
  | { ok: true; entryId: string; balance: number }
  | { ok: false; reason: "insufficient_funds" | "no_user"; balance: number };

/**
 * Reserves the mend cost before any generation runs. READ COMMITTED with the
 * user's row lock, for the reason given in server/spark.ts: concurrent
 * reserves can never overspend.
 */
export async function reserveStone(userId: number, runId: string, now = new Date()): Promise<StoneReserveResult> {
  return requireDb().transaction(
    async (tx) => {
      const [user] = await tx.select({ id: p0Users.id }).from(p0Users).where(eq(p0Users.id, userId)).for("update");
      if (!user) return { ok: false, reason: "no_user", balance: 0 };
      // A spend left pending by a crashed run is released, never kept.
      await tx
        .update(p0StoneLedger)
        .set({ status: "reversed", note: "stale reservation released", updatedAt: sql`CURRENT_TIMESTAMP(3)` })
        .where(
          and(
            eq(p0StoneLedger.userId, userId),
            eq(p0StoneLedger.status, "pending"),
            eq(p0StoneLedger.type, "spend_mend"),
            lt(p0StoneLedger.createdAt, new Date(now.getTime() - STALE_STONE_RESERVATION_MS))
          )
        );
      const balance = await balanceIn(tx, userId);
      if (balance < STONES.mendCost) return { ok: false, reason: "insufficient_funds", balance };
      const entryId = nanoid(36);
      await tx.insert(p0StoneLedger).values({
        id: entryId,
        userId,
        amount: -STONES.mendCost,
        type: "spend_mend",
        status: "pending",
        refId: runId,
      });
      return { ok: true, entryId, balance: balance - STONES.mendCost };
    },
    { isolationLevel: "read committed" }
  );
}

async function settle(entryId: string, status: "committed" | "reversed"): Promise<boolean> {
  const [result] = await requireDb()
    .update(p0StoneLedger)
    .set({ status, updatedAt: sql`CURRENT_TIMESTAMP(3)` })
    .where(and(eq(p0StoneLedger.id, entryId), eq(p0StoneLedger.status, "pending"), eq(p0StoneLedger.type, "spend_mend")));
  return (result as { affectedRows?: number }).affectedRows === 1;
}

/** Commits a reserved stone. Returns false if it was not pending. */
export function commitStone(entryId: string): Promise<boolean> {
  return settle(entryId, "committed");
}

/** Returns a reserved stone. A conditional update, so only one of any number of concurrent refunds succeeds. */
export function refundStone(entryId: string): Promise<boolean> {
  return settle(entryId, "reversed");
}
