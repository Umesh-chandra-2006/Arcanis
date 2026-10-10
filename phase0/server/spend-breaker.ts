// Daily spend circuit breaker (Build Plan 7.7, task A4). Checked before any
// Spark is reserved, so a refused creation never needs a refund.
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0BreakerDays, p0ProviderCalls, p0SparkLedger, p0StoneLedger, type Phase0BreakerDay } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sendEmail } from "./providers/email";
import { trackEvent } from "./analytics";

export const FORGE_COOLING_MESSAGE = "The forge is cooling. Try again soon.";

export type BreakerReason = "spend_limit" | "creation_limit" | "provider_quota" | "manual";

export interface BreakerStatus {
  day: string;
  open: boolean; // true = creations allowed
  reason: BreakerReason | null;
  realSpendUsd: number;
  shadowSpendUsd: number;
  /** Generations counted against the daily limit: creations plus mends. */
  creations: number;
  spendLimitUsd: number;
  creationLimit: number;
}

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function dayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

async function dayRow(day: string): Promise<Phase0BreakerDay | null> {
  const [row] = await requireDb().select().from(p0BreakerDays).where(eq(p0BreakerDays.day, day)).limit(1);
  return row ?? null;
}

async function ensureDayRow(day: string): Promise<void> {
  await requireDb().insert(p0BreakerDays).values({ day }).onDuplicateKeyUpdate({ set: { day } });
}

export async function getBreakerStatus(
  now = new Date(),
  options: { billedProviders?: string[] } = {}
): Promise<BreakerStatus> {
  const db = requireDb();
  const day = utcDay(now);
  const since = dayStart(day);
  const billed = options.billedProviders ?? ENV.billedProviders;
  const row = await dayRow(day);

  const [spend] = await db
    .select({ total: sql<string | null>`SUM(${p0ProviderCalls.costEstimateUsd})` })
    .from(p0ProviderCalls)
    .where(gte(p0ProviderCalls.createdAt, since));
  let realSpendUsd = 0;
  if (billed.length) {
    const [real] = await db
      .select({ total: sql<string | null>`SUM(${p0ProviderCalls.costEstimateUsd})` })
      .from(p0ProviderCalls)
      .where(and(gte(p0ProviderCalls.createdAt, since), inArray(p0ProviderCalls.provider, billed)));
    realSpendUsd = Number(real?.total ?? 0);
  }
  // Successful plus in-flight creations: spends that are not reversed.
  const [created] = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(p0SparkLedger)
    .where(
      and(
        eq(p0SparkLedger.type, "spend_creation"),
        inArray(p0SparkLedger.status, ["pending", "committed"]),
        gte(p0SparkLedger.createdAt, since)
      )
    );

  // A mend is a generation too (Master Doc 6.7): it draws on the same provider quota.
  const [mended] = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(p0StoneLedger)
    .where(
      and(
        eq(p0StoneLedger.type, "spend_mend"),
        inArray(p0StoneLedger.status, ["pending", "committed"]),
        gte(p0StoneLedger.createdAt, since)
      )
    );

  const spendLimitUsd = row?.spendLimitOverrideUsd ?? ENV.dailySpendLimitUsd;
  const creationLimit = row?.creationLimitOverride ?? ENV.dailyCreationLimit;
  const creations = Number(created?.n ?? 0) + Number(mended?.n ?? 0);

  let reason: BreakerReason | null = null;
  if (row?.trippedReason) {
    reason = row.trippedReason as BreakerReason;
  } else if (realSpendUsd >= spendLimitUsd) {
    reason = "spend_limit";
  } else if (creations >= creationLimit) {
    reason = "creation_limit";
  }

  return {
    day,
    open: reason === null,
    reason,
    realSpendUsd,
    shadowSpendUsd: Number(spend?.total ?? 0),
    creations,
    spendLimitUsd,
    creationLimit,
  };
}

/** Emails the founder once per day when the breaker refuses a creation. */
async function alertFounderOnce(status: BreakerStatus): Promise<void> {
  if (!ENV.founderAlertEmail) return;
  const db = requireDb();
  await ensureDayRow(status.day);
  const [result] = await db
    .update(p0BreakerDays)
    .set({ alertedAt: new Date() })
    .where(and(eq(p0BreakerDays.day, status.day), sql`${p0BreakerDays.alertedAt} IS NULL`));
  if ((result as { affectedRows?: number }).affectedRows !== 1) return;
  try {
    await sendEmail(
      { surface: "email" },
      {
        to: ENV.founderAlertEmail,
        subject: `Arcanis: creation paused (${status.reason})`,
        text: `The daily breaker refused a creation on ${status.day}.\nReason: ${status.reason}\nCreations today: ${status.creations} of ${status.creationLimit}\nReal spend: $${status.realSpendUsd.toFixed(4)} of $${status.spendLimitUsd}\nShadow spend: $${status.shadowSpendUsd.toFixed(4)}\nReset or raise it from the admin page.`,
        html: `<p>The daily breaker refused a creation on ${status.day}.</p><ul><li>Reason: ${status.reason}</li><li>Creations today: ${status.creations} of ${status.creationLimit}</li><li>Real spend: $${status.realSpendUsd.toFixed(4)} of $${status.spendLimitUsd}</li><li>Shadow spend: $${status.shadowSpendUsd.toFixed(4)}</li></ul><p>Reset or raise it from the admin page.</p>`,
      }
    );
  } catch (error) {
    console.error("[Breaker] founder alert failed:", error);
  }
}

/**
 * Gate for every generation path. Returns null when creation may proceed;
 * otherwise logs, alerts, and returns the status that refused it.
 */
export async function checkBreaker(
  ctx: { userId: number | null; sessionId?: string | null },
  now = new Date(),
  options: { billedProviders?: string[] } = {}
): Promise<BreakerStatus | null> {
  const status = await getBreakerStatus(now, options);
  if (status.open) return null;
  await trackEvent({
    eventType: "creation_blocked_spend_cap",
    userId: ctx.userId,
    sessionId: ctx.sessionId ?? null,
    metadata: { reason: status.reason, creations: status.creations, realSpendUsd: status.realSpendUsd },
  });
  await alertFounderOnce(status);
  return status;
}

/** A provider reported exhausted free quota: stop creating for the rest of the UTC day. */
export async function tripBreaker(reason: BreakerReason, now = new Date()): Promise<void> {
  const day = utcDay(now);
  await ensureDayRow(day);
  await requireDb().update(p0BreakerDays).set({ trippedReason: reason, trippedAt: now }).where(eq(p0BreakerDays.day, day));
  console.error(`[Breaker] tripped for ${day}: ${reason}`);
}

/** Admin: clear a trip for today. Limits still apply. */
export async function resetBreaker(now = new Date()): Promise<void> {
  const day = utcDay(now);
  await ensureDayRow(day);
  await requireDb().update(p0BreakerDays).set({ trippedReason: null, resetAt: now }).where(eq(p0BreakerDays.day, day));
}

/** Admin: raise or lower today's limits (null restores the env default). */
export async function setBreakerLimits(
  limits: { spendLimitUsd?: number | null; creationLimit?: number | null },
  now = new Date()
): Promise<void> {
  const day = utcDay(now);
  await ensureDayRow(day);
  const set: Partial<Phase0BreakerDay> = {};
  if (limits.spendLimitUsd !== undefined) set.spendLimitOverrideUsd = limits.spendLimitUsd;
  if (limits.creationLimit !== undefined) set.creationLimitOverride = limits.creationLimit;
  if (Object.keys(set).length) await requireDb().update(p0BreakerDays).set(set).where(eq(p0BreakerDays.day, day));
}
