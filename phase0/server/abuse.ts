// Abuse strikes from user-caused moderation rejections (Build Plan 13).
import { eq, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0Users } from "../drizzle/schema";
import { ABUSE } from "../shared/constants";

export async function addAbuseStrike(userId: number, now = new Date()): Promise<number> {
  const db = requireDb();
  await db.update(p0Users).set({ abuseStrikes: sql`${p0Users.abuseStrikes} + 1` }).where(eq(p0Users.id, userId));
  const [user] = await db.select({ strikes: p0Users.abuseStrikes }).from(p0Users).where(eq(p0Users.id, userId));
  if (!user) return 0;
  if (user.strikes >= ABUSE.banAtStrikes) {
    await db.update(p0Users).set({ bannedAt: now }).where(eq(p0Users.id, userId));
  } else if (user.strikes >= ABUSE.restrictAtStrikes) {
    await db
      .update(p0Users)
      .set({ restrictedUntil: new Date(now.getTime() + ABUSE.restrictHours * 3600_000) })
      .where(eq(p0Users.id, userId));
  }
  return user.strikes;
}

export async function banUser(userId: number, now = new Date()): Promise<void> {
  await requireDb().update(p0Users).set({ bannedAt: now }).where(eq(p0Users.id, userId));
}

export function canCreate(user: { bannedAt: Date | null; restrictedUntil: Date | null }, now = new Date()): boolean {
  return !user.bannedAt && !(user.restrictedUntil && user.restrictedUntil > now);
}
