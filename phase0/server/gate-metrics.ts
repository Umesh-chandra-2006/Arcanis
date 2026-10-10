// Gate 1a metrics (Phase Plan v2.2 Section 5, task A11). Definitions follow the
// Phase Plan exactly; cohorts that have not had time to mature are excluded and
// counted separately. Computed in JS over the window; fine at soft-launch scale.
import { and, gte, inArray, lt } from "drizzle-orm";
import { requireDb } from "./db";
import { p0AnalyticsEvents, p0GenerationRuns, p0ModerationEvents, p0ProviderCalls, p0Referrals, p0Spells, p0Users } from "../drizzle/schema";

const DAY = 86_400_000;

export interface GateMetric {
  key: string;
  label: string;
  value: number | null;
  /** Human-readable numerator/denominator. */
  detail: string;
  target: string;
  /** null when there is not enough data to judge. */
  pass: boolean | null;
}

export interface GateReport {
  from: string;
  to: string;
  metrics: GateMetric[];
  extra: Record<string, number | string | null>;
}

const ratio = (n: number, d: number) => (d > 0 ? n / d : null);

export async function computeGateMetrics(options: { days?: number; now?: Date } = {}): Promise<GateReport> {
  const db = requireDb();
  const now = options.now ?? new Date();
  const from = new Date(now.getTime() - (options.days ?? 28) * DAY);

  const users = await db.select({ id: p0Users.id, createdAt: p0Users.createdAt, role: p0Users.role }).from(p0Users).where(gte(p0Users.createdAt, new Date(from.getTime() - 14 * DAY)));
  const players = users.filter((u) => u.role === "user");
  const spells = await db
    .select({ id: p0Spells.id, ownerId: p0Spells.ownerId, createdAt: p0Spells.createdAt, isPlatformSpell: p0Spells.isPlatformSpell })
    .from(p0Spells)
    .where(gte(p0Spells.createdAt, new Date(from.getTime() - 14 * DAY)));
  const playerSpells = spells.filter((s) => !s.isPlatformSpell);
  const events = await db
    .select({ type: p0AnalyticsEvents.eventType, userId: p0AnalyticsEvents.userId, metadata: p0AnalyticsEvents.metadata, createdAt: p0AnalyticsEvents.createdAt })
    .from(p0AnalyticsEvents)
    .where(
      and(
        gte(p0AnalyticsEvents.createdAt, new Date(from.getTime() - 14 * DAY)),
        inArray(p0AnalyticsEvents.eventType, ["share_clicked", "preview_viewed", "creation_succeeded", "session_day_n", "spark_pack_intent", "spark_zero_reached"])
      )
    );

  const spellsByOwner = new Map<number, typeof playerSpells>();
  for (const s of [...playerSpells].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    spellsByOwner.set(s.ownerId, [...(spellsByOwner.get(s.ownerId) ?? []), s]);
  }

  // 1. Signup to first creation: a stored spell within 24h of account creation.
  const signupCohort = players.filter((u) => u.createdAt >= from && u.createdAt.getTime() <= now.getTime() - DAY);
  const converted = signupCohort.filter((u) => (spellsByOwner.get(u.id) ?? []).some((s) => s.createdAt.getTime() - u.createdAt.getTime() <= DAY));

  // 2. First creation to share: share action, or the preview opened by someone else, within 7 days.
  const firstSpells = [...spellsByOwner.values()].map((list) => list[0]).filter((s) => s.createdAt >= from);
  const matureFirst = firstSpells.filter((s) => s.createdAt.getTime() <= now.getTime() - 7 * DAY);
  const shared = matureFirst.filter((s) =>
    events.some((e) => {
      const m = (e.metadata ?? {}) as Record<string, unknown>;
      if (m.spellId !== s.id) return false;
      const within = e.createdAt.getTime() - s.createdAt.getTime() <= 7 * DAY;
      if (e.type === "share_clicked") return within && e.userId === s.ownerId;
      if (e.type === "preview_viewed") return within && e.userId !== s.ownerId;
      return false;
    })
  );

  // 3. k-factor over the last complete 7 days: invites per user x invite conversion.
  const weekStart = new Date(now.getTime() - 7 * DAY);
  const week = events.filter((e) => e.createdAt >= weekStart);
  const sharesSent = week.filter((e) => e.type === "share_clicked").length;
  const active = new Set(week.filter((e) => (e.type === "creation_succeeded" || e.type === "session_day_n") && e.userId !== null).map((e) => e.userId));
  const referrals = await db.select({ createdAt: p0Referrals.createdAt, status: p0Referrals.status }).from(p0Referrals).where(gte(p0Referrals.createdAt, weekStart));
  const attributed = referrals.filter((r) => r.status !== "rejected").length;
  const invitesPerUser = ratio(sharesSent, active.size);
  const conversion = ratio(attributed, sharesSent);
  const kFactor = invitesPerUser !== null && conversion !== null ? invitesPerUser * conversion : null;

  // 4. Day-7 creation retention: first creation on day 0, another on days 7 to 13.
  const retentionCohort = firstSpells.filter((s) => s.createdAt.getTime() <= now.getTime() - 14 * DAY);
  const retained = retentionCohort.filter((first) =>
    (spellsByOwner.get(first.ownerId) ?? []).some((s) => {
      const d = (s.createdAt.getTime() - first.createdAt.getTime()) / DAY;
      return d >= 7 && d < 14;
    })
  );
  // Day-1 return: a session on day 1 after signup.
  const day1Cohort = players.filter((u) => u.createdAt >= from && u.createdAt.getTime() <= now.getTime() - 2 * DAY);
  const day1 = day1Cohort.filter((u) => events.some((e) => e.type === "session_day_n" && e.userId === u.id && (e.metadata as { n?: number })?.n === 1));

  // 5. Cost per successful creation (shadow cost while on free tiers).
  const runs = await db.select().from(p0GenerationRuns).where(and(gte(p0GenerationRuns.createdAt, from), lt(p0GenerationRuns.createdAt, now)));
  const finished = runs.filter((r) => r.outcome !== "running");
  // Per Spark spent (Phase Plan v2.3): the cost of mends is inside the total, but only creations divide it.
  const successes = finished.filter((r) => r.outcome === "success" && r.kind === "creation").length;
  const runCalls = finished.length
    ? await db.select({ cost: p0ProviderCalls.costEstimateUsd, runId: p0ProviderCalls.runId }).from(p0ProviderCalls).where(gte(p0ProviderCalls.createdAt, from))
    : [];
  const runIds = new Set(finished.map((r) => r.id));
  const totalCost = runCalls.filter((c) => c.runId && runIds.has(c.runId)).reduce((s, c) => s + c.cost, 0);

  // 6. Layer 2c trigger rate and moderation false positives (human-reviewed automatic flags that were approved).
  const fired2c = finished.filter((r) => r.layer2cFired).length;
  const reviewed = await db
    .select({ resolution: p0ModerationEvents.resolution, surface: p0ModerationEvents.surface, verdict: p0ModerationEvents.verdict })
    .from(p0ModerationEvents)
    .where(gte(p0ModerationEvents.createdAt, from));
  const humanReviewedFlags = reviewed.filter((m) => m.surface !== "report" && m.resolution !== null);
  const falsePositives = humanReviewedFlags.filter((m) => m.resolution === "approved").length;

  // 7. Fake door: intent among players who reached zero Spark (no threshold).
  const zero = new Set(events.filter((e) => e.type === "spark_zero_reached" && e.createdAt >= from).map((e) => e.userId));
  const intent = new Set(events.filter((e) => e.type === "spark_pack_intent" && e.createdAt >= from && zero.has(e.userId)).map((e) => e.userId));

  const signupRate = ratio(converted.length, signupCohort.length);
  const shareRate = ratio(shared.length, matureFirst.length);
  const d7 = ratio(retained.length, retentionCohort.length);
  const cost = successes ? totalCost / successes : null;
  const rate2c = ratio(fired2c, finished.length);
  const fp = ratio(falsePositives, humanReviewedFlags.length);

  const metrics: GateMetric[] = [
    { key: "signup_to_first_creation", label: "Signup to first creation (24h)", value: signupRate, detail: `${converted.length} / ${signupCohort.length}`, target: "≥ 50%", pass: signupRate === null ? null : signupRate >= 0.5 },
    { key: "first_creation_to_share", label: "First creation to share (7 days)", value: shareRate, detail: `${shared.length} / ${matureFirst.length} (${firstSpells.length - matureFirst.length} too recent)`, target: "≥ 15%", pass: shareRate === null ? null : shareRate >= 0.15 },
    { key: "k_factor", label: "k-factor (last 7 days)", value: kFactor, detail: `${sharesSent} shares / ${active.size} active x ${attributed} attributed signups / ${sharesSent} shares`, target: "≥ 0.3 (rework below 0.1)", pass: kFactor === null ? null : kFactor >= 0.3 },
    { key: "day7_creation_retention", label: "Day-7 creation retention", value: d7, detail: `${retained.length} / ${retentionCohort.length}`, target: "≥ 10%", pass: d7 === null ? null : d7 >= 0.1 },
    { key: "cost_per_creation", label: "Cost per successful creation (list price)", value: cost, detail: `$${totalCost.toFixed(5)} / ${successes}`, target: "≤ $0.08", pass: cost === null ? null : cost <= 0.08 },
    { key: "layer2c_rate", label: "Layer 2c trigger rate", value: rate2c, detail: `${fired2c} / ${finished.length}`, target: "≤ 15%", pass: rate2c === null ? null : rate2c <= 0.15 },
    { key: "moderation_false_positive", label: "Moderation false positives (human-reviewed)", value: fp, detail: `${falsePositives} / ${humanReviewedFlags.length}`, target: "≤ 2%", pass: fp === null ? null : fp <= 0.02 },
  ];

  return {
    from: from.toISOString(),
    to: now.toISOString(),
    metrics,
    extra: {
      day1_return: ratio(day1.length, day1Cohort.length),
      creations_per_active_user: ratio(week.filter((e) => e.type === "creation_succeeded").length, active.size),
      invites_per_user: invitesPerUser,
      invite_conversion: conversion,
      fake_door_intent_at_zero_spark: ratio(intent.size, zero.size),
      players_reached_zero_spark: zero.size,
    },
  };
}
