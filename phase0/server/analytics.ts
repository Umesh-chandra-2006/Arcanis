import { nanoid } from "nanoid";
import { gte } from "drizzle-orm";
import { requireDb } from "./db";
import { p0AnalyticsEvents, p0Users } from "../drizzle/schema";

export interface TrackEventInput {
  eventType: string;
  userId?: number | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(input: TrackEventInput): Promise<void> {
  const db = getDbSafe();
  if (!db) return;

  try {
    await db.insert(p0AnalyticsEvents).values({
      id: nanoid(36),
      eventType: input.eventType.slice(0, 64),
      userId: input.userId ?? null,
      sessionId: input.sessionId?.slice(0, 64) ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.warn("[Analytics] Failed to track event:", error);
  }
}

export interface DailyMetrics {
  date: string;
  newSignups: number;
  spellsCreated: number;
  spellsShared: number;
  sharePageViews: number;
  sharePageCtaClicks: number;
  magicLinksRequested: number;
  magicLinksVerified: number;
}

export async function getDailyMetrics(days: number): Promise<DailyMetrics[]> {
  const db = getDbSafe();
  if (!db) return [];

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const events = await db
    .select({ eventType: p0AnalyticsEvents.eventType, createdAt: p0AnalyticsEvents.createdAt })
    .from(p0AnalyticsEvents)
    .where(gte(p0AnalyticsEvents.createdAt, since));

  const signups = await db
    .select({ createdAt: p0Users.createdAt })
    .from(p0Users)
    .where(gte(p0Users.createdAt, since));

  const byDay = new Map<string, DailyMetrics>();

  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    byDay.set(d.toISOString().slice(0, 10), {
      date: d.toISOString().slice(0, 10),
      newSignups: 0,
      spellsCreated: 0,
      spellsShared: 0,
      sharePageViews: 0,
      sharePageCtaClicks: 0,
      magicLinksRequested: 0,
      magicLinksVerified: 0,
    });
  }

  const dayOf = (ts: Date) => ts.toISOString().slice(0, 10);

  for (const e of events) {
    const key = dayOf(e.createdAt);
    const row = byDay.get(key);
    if (!row) continue;
    switch (e.eventType) {
      case "spell_creation_completed":
        row.spellsCreated++;
        break;
      case "spell_shared":
        row.spellsShared++;
        break;
      case "share_page_viewed":
        row.sharePageViews++;
        break;
      case "share_page_cta_clicked":
        row.sharePageCtaClicks++;
        break;
      case "magic_link_requested":
        row.magicLinksRequested++;
        break;
      case "magic_link_verified":
        row.magicLinksVerified++;
        break;
    }
  }

  for (const s of signups) {
    const row = byDay.get(dayOf(s.createdAt));
    if (row) row.newSignups++;
  }

  return [...byDay.values()];
}

function getDbSafe() {
  try {
    return requireDb();
  } catch {
    return null;
  }
}