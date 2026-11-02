// Retention cleanup: makes the privacy page true. Once a day, deletes what the
// policy says is kept for 12 months. It calls no provider, is safe to run twice,
// logs only counts, and a failed run waits for the next one.
import { and, inArray, lt, ne } from "drizzle-orm";
import { requireDb } from "./db";
import { sweepRateLimits } from "./db-rate-limit";
import { processAccountDeletionsSafely } from "./account-deletion";
import { p0DeviceGrants, p0LoginTokens, p0ModerationEvents } from "../drizzle/schema";

export const RETENTION = {
  /** The same 12 months as the arc_device cookie. */
  maxAgeMs: 365 * 86_400_000,
  /** With a daily run, a token goes between 24 and 48 hours after it expires: the privacy page says 48 hours. */
  loginTokenGraceMs: 86_400_000,
  batch: 500,
  /** A cap per run, so one run cannot go on for ever; the next run carries on. */
  maxBatches: 200,
  intervalMs: 24 * 3_600_000,
  firstRunDelayMs: 60_000,
};

export interface RetentionResult {
  moderationEvents: number;
  deviceGrants: number;
  loginTokens: number;
}

async function deleteInBatches(selectBatch: () => Promise<string[]>, remove: (ids: string[]) => Promise<unknown>): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < RETENTION.maxBatches; i++) {
    const ids = await selectBatch();
    if (ids.length === 0) break;
    await remove(ids);
    deleted += ids.length;
    if (ids.length < RETENTION.batch) break;
  }
  return deleted;
}

export async function runRetention(now = new Date()): Promise<RetentionResult> {
  const db = requireDb();
  const cutoff = new Date(now.getTime() - RETENTION.maxAgeMs);

  // A flag still waiting for a person is kept until it is reviewed, so nothing vanishes unseen.
  const moderationEvents = await deleteInBatches(
    async () =>
      (
        await db
          .select({ id: p0ModerationEvents.id })
          .from(p0ModerationEvents)
          .where(and(lt(p0ModerationEvents.createdAt, cutoff), ne(p0ModerationEvents.status, "open")))
          .limit(RETENTION.batch)
      ).map((row) => row.id),
    (ids) => db.delete(p0ModerationEvents).where(inArray(p0ModerationEvents.id, ids))
  );

  // Both kinds of row: `fp:` holds the browser signature hash and `did:` the device id, each with the IP prefix.
  const deviceGrants = await deleteInBatches(
    async () =>
      (await db.select({ key: p0DeviceGrants.deviceKey }).from(p0DeviceGrants).where(lt(p0DeviceGrants.createdAt, cutoff)).limit(RETENTION.batch)).map((row) => row.key),
    (keys) => db.delete(p0DeviceGrants).where(inArray(p0DeviceGrants.deviceKey, keys))
  );

  // A sign-in code or link is unusable once expired (both verify paths check expires_at), so this never
  // touches a sign-in in progress. Each row holds the email address it was sent to.
  const tokenCutoff = new Date(now.getTime() - RETENTION.loginTokenGraceMs);
  const loginTokens = await deleteInBatches(
    async () => (await db.select({ id: p0LoginTokens.id }).from(p0LoginTokens).where(lt(p0LoginTokens.expiresAt, tokenCutoff)).limit(RETENTION.batch)).map((row) => row.id),
    (ids) => db.delete(p0LoginTokens).where(inArray(p0LoginTokens.id, ids))
  );

  // Rate limit keys hold IP addresses and device ids. They were swept only on 2% of sign-in requests,
  // so at low traffic expired rows could stay for a long time. "Expire on their own" needs this.
  await sweepRateLimits(now);

  return { moderationEvents, deviceGrants, loginTokens };
}

/** Never throws: a cleanup failure must not reach the server. Returns null when the run failed. */
export async function runRetentionSafely(now = new Date(), run: (now: Date) => Promise<RetentionResult> = runRetention): Promise<RetentionResult | null> {
  try {
    const result = await run(now);
    console.log(`[Retention] deleted ${result.moderationEvents} moderation events, ${result.deviceGrants} device grants, ${result.loginTokens} login tokens`);
    return result;
  } catch (error) {
    console.warn("[Retention] run failed; the next run will retry:", error instanceof Error ? error.name : "unknown error");
    return null;
  }
}

export function startRetentionLoop(): NodeJS.Timeout {
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    void Promise.all([runRetentionSafely(), processAccountDeletionsSafely()]).finally(() => {
      running = false;
    });
  };
  // Also soon after each start, since a free instance can restart before a full day passes.
  setTimeout(tick, RETENTION.firstRunDelayMs).unref();
  const timer = setInterval(tick, RETENTION.intervalMs);
  timer.unref();
  return timer;
}
