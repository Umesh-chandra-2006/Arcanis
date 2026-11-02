// The signup funnel and channel table for /admin/metrics: visit to return, and
// where people came from. First-party events only. Separate from the Gate 1a
// metrics, which keep the Phase Plan's definitions. Admins are left out so the
// founder's own use does not count. Each person step counts accounts created in
// the window, so the steps read as one cohort. Visits are page loads: no device
// id is used to count them (privacy policy), so one person can count twice.
// Computed in JS over the window; fine at soft-launch scale.
import { and, eq, gte, inArray, lt } from "drizzle-orm";
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

export interface ChannelRow {
  channel: string;
  visits: number;
  signups: number;
  firstSpells: number;
  shared: number;
}

export interface FunnelReport {
  days: number;
  steps: FunnelStep[];
  channels: ChannelRow[];
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
  const admins = new Set((await db.select({ id: p0Users.id }).from(p0Users).where(eq(p0Users.role, "admin"))).map((u) => u.id));

  const events = (
    await db
      .select({ type: p0AnalyticsEvents.eventType, userId: p0AnalyticsEvents.userId, metadata: p0AnalyticsEvents.metadata })
      .from(p0AnalyticsEvents)
      .where(
        and(
          gte(p0AnalyticsEvents.createdAt, from),
          lt(p0AnalyticsEvents.createdAt, now),
          inArray(p0AnalyticsEvents.eventType, ["landing_view", "preview_viewed", "landing_draft_started", "signup_confirmed", "creation_succeeded", "share_clicked", "session_day_n"])
        )
      )
  ).filter((e) => e.userId === null || !admins.has(e.userId));

  const count = (type: string) => events.filter((e) => e.type === type).length;
  const visits = count("landing_view") + count("preview_viewed");

  const creations = new Map<number, number>();
  for (const e of events) {
    if (e.type === "creation_succeeded" && e.userId !== null && playerIds.has(e.userId)) creations.set(e.userId, (creations.get(e.userId) ?? 0) + 1);
  }
  const madeAtLeast = (n: number) => [...creations.values()].filter((c) => c >= n).length;
  const sharers = new Set(events.filter((e) => e.type === "share_clicked" && e.userId !== null && playerIds.has(e.userId)).map((e) => e.userId as number));

  // A return can only be judged once the day has fully passed for that player.
  const returnedOn = (n: number) => {
    const eligible = players.filter((u) => u.createdAt.getTime() <= now.getTime() - (n + 1) * DAY);
    const ids = new Set(eligible.map((u) => u.id));
    const back = new Set(events.filter((e) => e.type === "session_day_n" && e.userId !== null && ids.has(e.userId) && (e.metadata as { n?: number })?.n === n).map((e) => e.userId));
    return { count: back.size, of: eligible.length };
  };

  // Channels: visits from the visit events, people from the channel on their signup event.
  const channelOf = (metadata: unknown) => (metadata as { channel?: string | null })?.channel || "unknown";
  const rows = new Map<string, ChannelRow>();
  const row = (channel: string) => {
    let existing = rows.get(channel);
    if (!existing) rows.set(channel, (existing = { channel, visits: 0, signups: 0, firstSpells: 0, shared: 0 }));
    return existing;
  };
  for (const e of events) {
    if (e.type === "landing_view" || e.type === "preview_viewed") row(channelOf(e.metadata)).visits++;
  }
  const playerChannel = new Map<number, string>();
  for (const e of events) {
    if (e.type === "signup_confirmed" && e.userId !== null && playerIds.has(e.userId)) playerChannel.set(e.userId, channelOf(e.metadata));
  }
  for (const player of players) {
    const r = row(playerChannel.get(player.id) ?? "unknown");
    r.signups++;
    if (creations.has(player.id)) r.firstSpells++;
    if (sharers.has(player.id)) r.shared++;
  }

  const signups = players.length;
  return {
    days,
    steps: [
      { key: "visit", label: "Visits (landing and spell pages)", count: visits, of: null, note: "page loads" },
      { key: "draft", label: "Wrote a spell before signing up", count: count("landing_draft_started"), of: visits },
      { key: "signup", label: "Signed up", count: signups, of: visits },
      { key: "first_spell", label: "Forged a first spell", count: madeAtLeast(1), of: signups },
      { key: "second_spell", label: "Forged a second spell", count: madeAtLeast(2), of: madeAtLeast(1) },
      { key: "shared", label: "Shared a spell", count: sharers.size, of: madeAtLeast(1) },
      { key: "day1", label: "Came back on day 1", ...returnedOn(1), note: "of accounts old enough" },
      { key: "day7", label: "Came back on day 7", ...returnedOn(7), note: "of accounts old enough" },
    ],
    channels: [...rows.values()].sort((a, b) => b.signups - a.signups || b.visits - a.visits),
  };
}
