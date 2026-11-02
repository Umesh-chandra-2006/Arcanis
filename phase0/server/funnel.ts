// The signup funnel for /admin/metrics: visit to return. First-party events only.
// Separate from the Gate 1a metrics, which keep the Phase Plan's definitions.
// Admins are left out so the founder's own use does not count. Each person step
// counts accounts created in the window, so the steps read as one cohort.
// Computed in JS over the window; fine at soft-launch scale.
import { and, gte, inArray, lt } from "drizzle-orm";
import { requireDb } from "./db";
import { p0AnalyticsEvents, p0Users } from "../drizzle/schema";

const DAY = 86_400_000;

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  /** What the count is out of; null when the step has no earlier step to compare with. */
  of: number | null;
  note?: string;
}

export interface FunnelReport {
  days: number;
  /** The visit count is raw; devices is the count with one per browser. */
  visits: number;
  steps: FunnelStep[];
}

export async function computeFunnel(options: { days?: number; now?: Date } = {}): Promise<FunnelReport> {
  const db = requireDb();
  const now = options.now ?? new Date();
  const days = options.days ?? 28;
  const from = new Date(now.getTime() - days * DAY);

  const users = await db
    .select({ id: p0Users.id, createdAt: p0Users.createdAt, role: p0Users.role })
    .from(p0Users)
    .where(and(gte(p0Users.createdAt, from), lt(p0Users.createdAt, now)));
  const players = users.filter((u) => u.role === "user");
  const playerIds = new Set(players.map((u) => u.id));

  const events = await db
    .select({ type: p0AnalyticsEvents.eventType, userId: p0AnalyticsEvents.userId, sessionId: p0AnalyticsEvents.sessionId, metadata: p0AnalyticsEvents.metadata })
    .from(p0AnalyticsEvents)
    .where(
      and(
        gte(p0AnalyticsEvents.createdAt, from),
        lt(p0AnalyticsEvents.createdAt, now),
        inArray(p0AnalyticsEvents.eventType, ["landing_view", "landing_draft_started", "creation_succeeded", "share_clicked", "session_day_n"])
      )
    );

  const distinctDevices = (type: string) => new Set(events.filter((e) => e.type === type && e.sessionId).map((e) => e.sessionId)).size;
  const views = events.filter((e) => e.type === "landing_view");

  const creations = new Map<number, number>();
  for (const e of events) {
    if (e.type === "creation_succeeded" && e.userId !== null && playerIds.has(e.userId)) creations.set(e.userId, (creations.get(e.userId) ?? 0) + 1);
  }
  const madeAtLeast = (n: number) => [...creations.values()].filter((c) => c >= n).length;
  const sharers = new Set(events.filter((e) => e.type === "share_clicked" && e.userId !== null && playerIds.has(e.userId)).map((e) => e.userId));

  // A return can only be judged once the day has fully passed for that player.
  const returnedOn = (n: number) => {
    const eligible = players.filter((u) => u.createdAt.getTime() <= now.getTime() - (n + 1) * DAY);
    const ids = new Set(eligible.map((u) => u.id));
    const back = new Set(events.filter((e) => e.type === "session_day_n" && e.userId !== null && ids.has(e.userId) && (e.metadata as { n?: number })?.n === n).map((e) => e.userId));
    return { count: back.size, of: eligible.length };
  };

  const devices = distinctDevices("landing_view");
  const drafts = distinctDevices("landing_draft_started");
  const signups = players.length;
  return {
    days,
    visits: views.length,
    steps: [
      { key: "visit", label: "Visited the landing page", count: devices, of: null, note: "browsers" },
      { key: "draft", label: "Wrote a spell before signing up", count: drafts, of: devices, note: "browsers" },
      { key: "signup", label: "Signed up", count: signups, of: devices },
      { key: "first_spell", label: "Forged a first spell", count: madeAtLeast(1), of: signups },
      { key: "second_spell", label: "Forged a second spell", count: madeAtLeast(2), of: madeAtLeast(1) },
      { key: "shared", label: "Shared a spell", count: sharers.size, of: madeAtLeast(1) },
      { key: "day1", label: "Came back on day 1", ...returnedOn(1), note: "of accounts old enough" },
      { key: "day7", label: "Came back on day 7", ...returnedOn(7), note: "of accounts old enough" },
    ],
  };
}
