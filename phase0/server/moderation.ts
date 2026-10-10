// Layer 2b policy (Build Plan 13, task A6). The provider returns raw category
// scores; this module decides. Fantasy combat is the product, so plain
// "violence" never blocks (omni-moderation flags "a spear of fire that burns
// the enemy" as violence); graphic gore, sexual content, hate, self-harm,
// real-world harm and threats do. Thresholds are tuned in A14 against a
// hand-reviewed sample.
import { nanoid } from "nanoid";
import { requireDb } from "./db";
import { p0ModerationEvents } from "../drizzle/schema";
import type { CallContext, ModerationInput, ModerationResult } from "../shared/providers";
import { moderateWithTelemetry } from "./providers/moderation";

export type ModerationSurface = "spell_input" | "spell_text" | "spell_image" | "review";
export type Verdict = "pass" | "borderline" | "reject";

interface Threshold {
  borderline: number;
  reject: number;
}

const BASE: Record<string, Threshold> = {
  sexual: { borderline: 0.3, reject: 0.7 },
  "sexual/minors": { borderline: 0.05, reject: 0.2 },
  harassment: { borderline: 0.6, reject: 0.9 },
  "harassment/threatening": { borderline: 0.7, reject: 0.95 },
  hate: { borderline: 0.3, reject: 0.7 },
  "hate/threatening": { borderline: 0.2, reject: 0.6 },
  illicit: { borderline: 0.5, reject: 0.85 },
  "illicit/violent": { borderline: 0.6, reject: 0.9 },
  "self-harm": { borderline: 0.4, reject: 0.8 },
  "self-harm/intent": { borderline: 0.3, reject: 0.7 },
  "self-harm/instructions": { borderline: 0.2, reject: 0.6 },
  "violence/graphic": { borderline: 0.7, reject: 0.95 },
};

export const MODERATION_POLICY: Record<ModerationSurface, Record<string, Threshold>> = {
  spell_input: BASE,
  spell_text: BASE,
  spell_image: {
    ...BASE,
    sexual: { borderline: 0.2, reject: 0.5 },
    "violence/graphic": { borderline: 0.5, reject: 0.85 },
  },
  // Reviews are public text about other players' work: stricter on harassment.
  review: {
    ...BASE,
    harassment: { borderline: 0.4, reject: 0.75 },
    "harassment/threatening": { borderline: 0.3, reject: 0.6 },
    "violence/graphic": { borderline: 0.5, reject: 0.9 },
  },
};

export interface PolicyDecision {
  verdict: Verdict;
  /** The category that decided the verdict. */
  reason: string | null;
  scores: Record<string, number>;
}

export function applyPolicy(surface: ModerationSurface, scores: Record<string, number>): PolicyDecision {
  const policy = MODERATION_POLICY[surface];
  let verdict: Verdict = "pass";
  let reason: string | null = null;
  let worst = 0;
  for (const [category, t] of Object.entries(policy)) {
    const score = scores[category] ?? 0;
    const level = score >= t.reject ? 2 : score >= t.borderline ? 1 : 0;
    const severity = level + score; // ties broken by raw score
    if (level > 0 && severity > worst) {
      worst = severity;
      verdict = level === 2 ? "reject" : "borderline";
      reason = category;
    }
  }
  return { verdict, reason, scores };
}

/**
 * Player text that names real-world groups or public figures. The classifier
 * under-scores these in a fantasy frame (corpus run 2026-10-10: "a curse that
 * targets people of a specific religion" scored hate 0.045), so a match on
 * player input or reviews escalates to Layer 2c instead of passing.
 */
export const REAL_WORLD_TARGET =
  /\b(religio\w*|muslims?|christians?|jews?|jewish|hindus?|sikhs?|buddhists?|atheists?|race|racial|ethnic\w*|black people|white people|asians?|africans?|immigrants?|refugees?|nationalit\w*|gays?|lesbians?|trans(gender)?|queer|homosexual\w*|disabled|disabilit\w*|women|men|politician\w*|president|prime minister|senator|celebrit\w*|real (person|people)|my (boss|teacher|classmate|ex|neighbou?r))\b/i;

export function escalateRealWorldTargets(surface: ModerationSurface, text: string, decision: PolicyDecision): PolicyDecision {
  if (decision.verdict !== "pass") return decision;
  if (surface !== "spell_input" && surface !== "review") return decision;
  return REAL_WORLD_TARGET.test(text) ? { ...decision, verdict: "borderline", reason: "real_world_target" } : decision;
}

export async function moderate(
  ctx: Omit<CallContext, "surface">,
  surface: ModerationSurface,
  inputs: ModerationInput[]
): Promise<PolicyDecision> {
  const result: ModerationResult = await moderateWithTelemetry({ ...ctx, surface: "moderation" }, inputs);
  const text = inputs.map((i) => (i.type === "text" ? i.text : "")).join("\n");
  return escalateRealWorldTargets(surface, text, applyPolicy(surface, result.scores));
}

export async function recordModerationEvent(event: {
  userId: number | null;
  surface: ModerationSurface | "report";
  contentType: "text" | "image";
  targetType?: "spell" | "review" | null;
  targetId?: string | null;
  verdict: Verdict | "report";
  reason?: string | null;
  scores?: Record<string, number> | null;
  excerpt?: string | null;
  escalatedTo2c?: boolean;
  layer2cResult?: string | null;
  runId?: string | null;
  status?: "open" | "resolved";
}): Promise<string> {
  const id = nanoid(36);
  await requireDb()
    .insert(p0ModerationEvents)
    .values({
      id,
      userId: event.userId,
      surface: event.surface,
      contentType: event.contentType,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      verdict: event.verdict,
      reason: event.reason?.slice(0, 64) ?? null,
      scores: event.scores ?? null,
      excerpt: event.excerpt?.slice(0, 2000) ?? null,
      escalatedTo2c: event.escalatedTo2c ?? false,
      layer2cResult: event.layer2cResult ?? null,
      runId: event.runId ?? null,
      // Automatic rejections are already handled; borderline passes and reports need a human look.
      status: event.status ?? (event.verdict === "reject" ? "resolved" : "open"),
    });
  return id;
}
