// Fixed-window rate limits stored in MySQL, so a restart of the single free
// instance cannot reset them. Used for identity and abuse limits.
import { lt, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0RateLimits } from "../drizzle/schema";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}

/**
 * Counts one hit for `key` in the current window and reports whether it is
 * within `limit`. Atomic: a single upsert increments the counter.
 */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number, now = Date.now()): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const bucket = `${key}@${windowStart}`.slice(0, 191);
  const expiresAt = new Date((windowStart + windowSeconds) * 1000);
  const db = requireDb();
  await db
    .insert(p0RateLimits)
    .values({ bucket, count: 1, expiresAt })
    .onDuplicateKeyUpdate({ set: { count: sql`${p0RateLimits.count} + 1` } });
  const [row] = await db.select({ count: p0RateLimits.count }).from(p0RateLimits).where(sql`${p0RateLimits.bucket} = ${bucket}`);
  const count = row?.count ?? 1;
  return {
    allowed: count <= limit,
    count,
    retryAfterSeconds: Math.max(1, Math.ceil(expiresAt.getTime() / 1000 - now / 1000)),
  };
}

/** Reads the current window's count without adding a hit (for limits that count only failures). */
export async function peekRateLimit(key: string, limit: number, windowSeconds: number, now = Date.now()): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const bucket = `${key}@${windowStart}`.slice(0, 191);
  const [row] = await requireDb().select({ count: p0RateLimits.count }).from(p0RateLimits).where(sql`${p0RateLimits.bucket} = ${bucket}`);
  const count = row?.count ?? 0;
  return { allowed: count < limit, count, retryAfterSeconds: Math.max(1, Math.ceil(windowStart + windowSeconds - now / 1000)) };
}

/**
 * Gives back one hit taken by `hitRateLimit` with the same `now`, for when the
 * counted action failed on our side (the player should not wait out our error).
 */
export async function releaseRateLimit(key: string, windowSeconds: number, now = Date.now()): Promise<void> {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const bucket = `${key}@${windowStart}`.slice(0, 191);
  await requireDb()
    .update(p0RateLimits)
    .set({ count: sql`${p0RateLimits.count} - 1` })
    .where(sql`${p0RateLimits.bucket} = ${bucket} and ${p0RateLimits.count} > 0`);
}

/** Deletes expired buckets; called opportunistically. */
export async function sweepRateLimits(now = new Date()): Promise<void> {
  await requireDb().delete(p0RateLimits).where(lt(p0RateLimits.expiresAt, now));
}
