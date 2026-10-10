// The forge queue (Master Doc 25, v7.5). When the daily breaker is closed a
// creation is not refused: the request waits here and goes through the normal
// pipeline once the forge reopens. No Spark is reserved while it waits, so the
// Spark path, Two-Step Verification and the breaker stay exactly where they
// are in createSpell. DB-driven, so a restart loses nothing.
import { nanoid } from "nanoid";
import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0ForgeQueue, type Phase0ForgeQueueEntry } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { SpellCreationInputSchema, type SpellCreationInput } from "../shared/validation";
import { createSpell, type CreationErrorCode, type PipelineDeps, type SpellCreationResult } from "./spell-pipeline";
import { getBreakerStatus } from "./spend-breaker";
import { getSparkBalance } from "./spark";
import { trackEvent } from "./analytics";
import { VALIDATION_MESSAGES } from "../shared/constants";

export const FORGE_QUEUE = {
  /** Waiting requests one player may hold. */
  maxPerPlayer: 3,
  /** Requests forged per tick, one at a time (free tiers are per-minute limited). */
  batch: 3,
  intervalMs: 2 * 60_000,
  /** Tries before a request that keeps failing on our side is given up. */
  maxAttempts: 3,
  /** A request stuck in "forging" this long (a crash mid-forge) goes back in line. */
  staleMs: 10 * 60_000,
};

// The voice: the Arcanum, the will that presides over magic itself. It does not
// forge on request; it acknowledges a spell and grants it.
export const FORGE_QUEUED_MESSAGE =
  "Your design now rests before the Arcanum, the will that presides over all magic. When the fires return it will weigh your spell and grant it to you. Your Spark is spent only then.";
export const FORGE_QUEUE_FULL_MESSAGE = `${FORGE_QUEUE.maxPerPlayer} of your designs already rest before the Arcanum. Wait for one to be granted, or withdraw one.`;

export type QueuedCreationResult =
  | SpellCreationResult
  | { success: false; code: "queued"; error: string; position: number; sparkBalance?: number }
  | { success: false; code: "queue_full"; error: string; sparkBalance?: number };

const WAITING = ["queued", "forging"] as const;

/** Adds a creation request to the line. The caller has already been refused by the breaker. */
export async function enqueueCreation(userId: number, input: unknown, sessionId?: string | null): Promise<QueuedCreationResult> {
  const parsed = SpellCreationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "invalid_input", error: `Invalid input: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  }
  const db = requireDb();
  const mine = await db
    .select({ id: p0ForgeQueue.id })
    .from(p0ForgeQueue)
    .where(and(eq(p0ForgeQueue.userId, userId), inArray(p0ForgeQueue.status, [...WAITING])));
  const { balance } = await getSparkBalance(userId);
  // Each waiting design will need one Spark when it is forged.
  if (balance <= mine.length) {
    return { success: false, code: "no_spark", error: VALIDATION_MESSAGES.NO_SPARKS, sparkBalance: balance };
  }
  if (mine.length >= FORGE_QUEUE.maxPerPlayer) {
    return { success: false, code: "queue_full", error: FORGE_QUEUE_FULL_MESSAGE, sparkBalance: balance };
  }
  const id = nanoid(36);
  await db.insert(p0ForgeQueue).values({ id, userId, input: parsed.data });
  const [ahead] = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(p0ForgeQueue)
    .where(inArray(p0ForgeQueue.status, [...WAITING]));
  const position = Number(ahead?.n ?? 1);
  await trackEvent({ eventType: "creation_queued", userId, sessionId: sessionId ?? null, metadata: { position } });
  return { success: false, code: "queued", error: FORGE_QUEUED_MESSAGE, position, sparkBalance: balance };
}

/** The creation entry point for players: forge now, or join the line when the forge is cooling. */
export async function createOrQueue(
  userId: number,
  input: unknown,
  options: { sessionId?: string | null; create?: typeof createSpell } = {}
): Promise<QueuedCreationResult> {
  const result = await (options.create ?? createSpell)(userId, input, { sessionId: options.sessionId });
  if (result.code !== "forge_cooling") return result;
  return enqueueCreation(userId, input, options.sessionId);
}

const RETRYABLE: ReadonlySet<CreationErrorCode | undefined> = new Set<CreationErrorCode | undefined>(["generation_failed"]);

async function finish(id: string, set: Partial<Phase0ForgeQueueEntry>): Promise<void> {
  await requireDb().update(p0ForgeQueue).set(set).where(eq(p0ForgeQueue.id, id));
}

/**
 * Forges waiting requests, oldest first, while the breaker is open. Each one
 * runs the full pipeline: Spark is reserved, verified output only, refund on
 * our failure.
 */
export async function processForgeQueue(
  options: { now?: Date; deps?: Partial<PipelineDeps>; forgeOpen?: () => Promise<boolean>; userId?: number } = {}
): Promise<{ forged: number; failed: number; requeued: number }> {
  const db = requireDb();
  const now = options.now ?? new Date();
  const forgeOpen = options.forgeOpen ?? (async () => (await getBreakerStatus()).open);
  const tally = { forged: 0, failed: 0, requeued: 0 };

  await db
    .update(p0ForgeQueue)
    .set({ status: "queued" })
    .where(and(eq(p0ForgeQueue.status, "forging"), lt(p0ForgeQueue.startedAt, new Date(now.getTime() - FORGE_QUEUE.staleMs))));

  for (let i = 0; i < FORGE_QUEUE.batch; i++) {
    const [next] = await db
      .select()
      .from(p0ForgeQueue)
      .where(
        and(
          eq(p0ForgeQueue.status, "queued"),
          options.userId ? eq(p0ForgeQueue.userId, options.userId) : undefined,
          // The test suite shares its database with local dev. A dev server must
          // never send a throwaway test account's design to live providers.
          ENV.isTest ? undefined : sql`${p0ForgeQueue.userId} NOT IN (SELECT id FROM p0_users WHERE email LIKE '%@test.arcanis')`
        )
      )
      .orderBy(asc(p0ForgeQueue.createdAt))
      .limit(1);
    if (!next || !(await forgeOpen())) break;

    // Claim it; exactly one worker wins.
    const [claim] = await db
      .update(p0ForgeQueue)
      .set({ status: "forging", startedAt: now, attempts: sql`${p0ForgeQueue.attempts} + 1` })
      .where(and(eq(p0ForgeQueue.id, next.id), eq(p0ForgeQueue.status, "queued")));
    if ((claim as { affectedRows?: number }).affectedRows !== 1) continue;
    const attempts = next.attempts + 1;

    let result: SpellCreationResult;
    try {
      result = await createSpell(next.userId, next.input, { deps: options.deps });
    } catch (error) {
      console.warn("[Forge queue] creation threw:", error);
      result = { success: false, code: "generation_failed" };
    }

    if (result.success && result.spell) {
      await finish(next.id, { status: "forged", spellId: result.spell.id, finishedAt: new Date() });
      await trackEvent({
        eventType: "creation_succeeded",
        userId: next.userId,
        metadata: { spellId: result.spell.id, element: result.spell.element, category: result.spell.category, queued: true },
      });
      tally.forged++;
    } else if (result.code === "forge_cooling") {
      // The forge closed again under us: back in line, and this try does not count.
      await finish(next.id, { status: "queued", attempts: next.attempts });
      tally.requeued++;
      break;
    } else if (RETRYABLE.has(result.code) && attempts < FORGE_QUEUE.maxAttempts) {
      await finish(next.id, { status: "queued" });
      tally.requeued++;
      // Our providers are struggling; leave the rest for the next tick.
      break;
    } else {
      await finish(next.id, { status: "failed", failureCode: result.code ?? "generation_failed", finishedAt: new Date() });
      const eventType = result.code === "input_rejected" ? "creation_rejected" : result.code === "generation_failed" ? "creation_refunded" : null;
      if (eventType) await trackEvent({ eventType, userId: next.userId, metadata: { code: result.code, queued: true } });
      tally.failed++;
    }
  }
  return tally;
}

function inputOf(entry: Phase0ForgeQueueEntry): Pick<SpellCreationInput, "name" | "element" | "category"> {
  const input = entry.input as SpellCreationInput;
  return { name: input.name, element: input.element, category: input.category };
}

const FAILURE_MESSAGES: Record<string, string> = {
  no_spark: "You had no Spark left when its turn came, so it was not granted.",
  input_rejected: "The Arcanum refused that design.",
  restricted: "Your account could not receive it when its turn came.",
};

/** What the player sees: designs still waiting, and outcomes not yet shown to them. */
export async function forgeQueueFor(userId: number) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(p0ForgeQueue)
    .where(and(eq(p0ForgeQueue.userId, userId), isNull(p0ForgeQueue.seenAt), inArray(p0ForgeQueue.status, ["queued", "forging", "forged", "failed"])))
    .orderBy(asc(p0ForgeQueue.createdAt));
  return {
    waiting: rows
      .filter((r) => r.status === "queued" || r.status === "forging")
      .map((r) => ({ id: r.id, ...inputOf(r), createdAt: r.createdAt.toISOString() })),
    finished: rows
      .filter((r) => r.status === "forged" || r.status === "failed")
      .map((r) => ({
        id: r.id,
        ...inputOf(r),
        forged: r.status === "forged",
        spellId: r.spellId,
        message: r.status === "forged" ? null : (FAILURE_MESSAGES[r.failureCode ?? ""] ?? "The Arcanum could not shape it. No Spark was spent."),
      })),
  };
}

/** Marks outcomes as shown, so each is announced once. */
export async function acknowledgeForged(userId: number, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await requireDb()
    .update(p0ForgeQueue)
    .set({ seenAt: new Date() })
    .where(and(eq(p0ForgeQueue.userId, userId), inArray(p0ForgeQueue.id, ids), inArray(p0ForgeQueue.status, ["forged", "failed"])));
}

/** The player withdraws a design that has not started forging. */
export async function withdrawQueued(userId: number, id: string): Promise<boolean> {
  const [result] = await requireDb()
    .update(p0ForgeQueue)
    .set({ status: "cancelled", finishedAt: new Date() })
    .where(and(eq(p0ForgeQueue.id, id), eq(p0ForgeQueue.userId, userId), eq(p0ForgeQueue.status, "queued")));
  return (result as { affectedRows?: number }).affectedRows === 1;
}

export function startForgeQueueLoop(): NodeJS.Timeout {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    void processForgeQueue()
      .catch((error) => console.warn("[Forge queue] tick failed:", error))
      .finally(() => {
        running = false;
      });
  }, FORGE_QUEUE.intervalMs);
  timer.unref();
  return timer;
}
