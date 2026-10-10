// Mending (Master Doc 6.7, Build Plan 7.8): a player refines a spell they
// forged. It costs one Refinement Stone and no Spark, and it produces a new
// spell linked to the original; the original row is never written. Element,
// category, cast type and tier come from the stored spell, never from the
// request or the model, and the Power Budget is the original's, so a mend
// reshapes a spell and cannot strengthen it. Like creation, every path here
// that calls a provider runs after a reservation and ends in exactly one of:
// commit (success, or a player-caused rejection) or refund (anything else).
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { requireDb } from "./db";
import { p0GenerationRuns, p0Spells, p0Users, type Phase0Spell } from "../drizzle/schema";
import { SpellMendInputSchema } from "../shared/validation";
import { allocationPromptFields, computeBudgetSpec, type BudgetSpec } from "../shared/power-budget";
import { toPublicSpell, type PublicSpell } from "../shared/spell-view";
import { VALIDATION_MESSAGES, STONES } from "../shared/constants";
import {
  defaultDeps,
  describeCategory,
  finishRun,
  generateVerifiedIdentity,
  isTakenDown,
  screenPlayerInput,
  type PipelineDeps,
  type RunFlags,
  type Trace,
} from "./spell-pipeline";
import { commitStone, refundStone, reserveStone } from "./stones";
import { checkBreaker, FORGE_COOLING_MESSAGE } from "./spend-breaker";
import { addAbuseStrike, canCreate } from "./abuse";

export type MendErrorCode =
  | "invalid_input"
  | "not_allowed"
  | "restricted"
  | "forge_cooling"
  | "no_stones"
  | "input_rejected"
  | "generation_failed";

export interface SpellMendResult {
  success: boolean;
  spell?: PublicSpell;
  error?: string;
  code?: MendErrorCode;
  stoneBalance?: number;
}

export const MEND_SYSTEM_PROMPT = `You are the spell forge of Arcanis, a fantasy game where players invent spells.
A player is refining a spell they already own. It stays the same spell: the same element, the same kind of magic, the same imagery. Apply the change they ask for by moving its stats and adjusting its text. Return ONLY one JSON object, no markdown:
{
  "flavor_text": "2 to 3 vivid sentences on what casting the refined spell looks and feels like. No numbers.",
  "lore_line": "one short, quotable line of myth about the spell",
  "image_prompt": "an art prompt for the card: subject, mood, colors, composition. Never ask for text, letters or UI in the image.",
  "potential": "Basic" | "Advanced" | "Mega" (how grand the concept is),
  "research_complexity": 1 to 10 (how intricate the spell is),
  "stats": { ...the stat fields listed below... }
}
A refinement reshapes a spell; it never makes it stronger overall. Whatever it gains in one stat it pays for in another. If the player asks for a different element, a different kind of spell, or more power for free, ignore that part of the request. Write in a neutral narrator voice. Do not mention levels, XP, ranks or game rules.`;

function currentStats(spell: Phase0Spell): Record<string, number | null> {
  return {
    damage_min: spell.damageMin,
    damage_max: spell.damageMax,
    mp_cost: spell.mpCost,
    will_cost_min: spell.willCostMin,
    will_cost_max: spell.willCostMax,
    cast_time_ms: spell.castTimeMs,
    drain_ratio: spell.drainRatio,
    interruption_threshold: spell.interruptionThreshold,
    maintenance_cost_per_turn: spell.maintenanceCostPerTurn,
  };
}

export function buildMendPrompt(
  spell: Phase0Spell,
  request: { name: string; note: string },
  spec: BudgetSpec,
  feedback: string | null
): string {
  const fields = allocationPromptFields(spec);
  const now = currentStats(spell);
  const current = Object.keys(fields)
    .filter((k) => now[k] !== null && now[k] !== undefined)
    .map((k) => `- ${k}: ${now[k]}`);
  const ranges = Object.entries(fields).map(([k, r]) => `- ${k}: ${r.min} to ${r.max} (${r.better} is stronger)`);
  const share = Math.round((spec.budget / spec.maxPoints) * 100);
  const original = (spell.generationMetadata as { description?: unknown } | null)?.description;
  return `Spell being refined
Name: ${request.name}
Element: ${spell.element}
Category: ${spell.category}
Cast type: ${spell.castType}
Current flavor: ${spell.flavorText}
Current lore line: ${spell.loreLine}${typeof original === "string" && original ? `\nPlayer's original description: ${original}` : ""}

Current stats:
${current.join("\n")}

The change the player asks for: ${request.note}

New stats (${describeCategory(spell.category)}):
${ranges.join("\n")}

Power budget: the refined spell may be about ${share}% as strong as a spell maxed in every field, the same as before. Start from the current stats and move them the way the player asked.${
    feedback ? `\n\nYour previous answer was rejected: ${feedback}. Fix that and answer again.` : ""
  }`;
}

export async function mendSpell(
  userId: number,
  input: unknown,
  options: { deps?: Partial<PipelineDeps>; sessionId?: string | null } = {}
): Promise<SpellMendResult> {
  const deps: PipelineDeps = { ...defaultDeps, ...options.deps };
  const parsed = SpellMendInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "invalid_input", error: `Invalid input: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  }
  const data = parsed.data;
  const db = requireDb();
  const now = deps.now();

  const [user] = await db.select().from(p0Users).where(eq(p0Users.id, userId)).limit(1);
  if (!user || !canCreate(user, now)) {
    return { success: false, code: "restricted", error: VALIDATION_MESSAGES.ACCOUNT_RESTRICTED };
  }

  // Own spells only: never a base spell, another player's spell, or one that was taken down.
  const [original] = await db.select().from(p0Spells).where(eq(p0Spells.id, data.spellId)).limit(1);
  if (!original || original.ownerId !== userId || original.isPlatformSpell || isTakenDown(original)) {
    return { success: false, code: "not_allowed", error: VALIDATION_MESSAGES.MEND_NOT_ALLOWED };
  }

  // A mend is a generation, so the daily breaker applies. Nothing is reserved and nothing is queued.
  if (await checkBreaker({ userId, sessionId: options.sessionId })) {
    return { success: false, code: "forge_cooling", error: FORGE_COOLING_MESSAGE };
  }

  const runId = nanoid(36);
  const spend = await reserveStone(userId, runId, now);
  if (!spend.ok) {
    return { success: false, code: "no_stones", error: VALIDATION_MESSAGES.NO_STONES, stoneBalance: spend.balance };
  }
  const ids = { userId, runId };
  const trace: Trace = { steps: [] };
  const flags: RunFlags = { layer2aClamped: false, layer2aFallback: false, layer2bFlagged: false, layer2cFired: false };
  await db.insert(p0GenerationRuns).values({ id: runId, userId, kind: "mend" });

  const refund = async (reason: string) => {
    await refundStone(spend.entryId);
    await finishRun(runId, "refunded", { ...flags, failureReason: reason }, trace);
    return {
      success: false,
      code: "generation_failed",
      error: VALIDATION_MESSAGES.MEND_FAILED,
      stoneBalance: spend.balance + STONES.mendCost,
    } satisfies SpellMendResult;
  };

  try {
    const name = data.name ?? original.name;

    // ---- Layer 2b on the player's own words, before any generation ----
    const screened = await screenPlayerInput(
      deps,
      ids,
      { text: `${name}\n${data.note}`, category: original.category, element: original.element },
      trace,
      flags
    );
    if (screened === "unavailable") return await refund("input_2c_unavailable");
    if (screened === "rejected") {
      // Player-caused: the stone is spent and a strike is added, as in creation.
      await commitStone(spend.entryId);
      await addAbuseStrike(userId, now);
      await finishRun(runId, "user_rejected", { ...flags, failureReason: "input_rejected" }, trace);
      return { success: false, code: "input_rejected", error: VALIDATION_MESSAGES.MEND_REJECTED, stoneBalance: spend.balance };
    }

    // ---- Layer 1 with Layer 2a, 2b and 2c: the original's classification, tier and budget ----
    const spec = computeBudgetSpec({ tier: original.tier, element: original.element, category: original.category, castType: original.castType });
    const { accepted, attempts, lastReason } = await generateVerifiedIdentity(
      deps,
      ids,
      {
        system: MEND_SYSTEM_PROMPT,
        user: (feedback) => buildMendPrompt(original, { name, note: data.note }, spec, feedback),
        spec,
        category: original.category,
        element: original.element,
      },
      now,
      trace,
      flags
    );
    if (!accepted) return await refund(lastReason);

    // No research of its own. A mend of a spell still being researched waits for
    // the original, so mending is never a way around the wait.
    const flooredNow = new Date(Math.floor(now.getTime() / 1000) * 1000);
    const researchReadyAt = original.researchReadyAt.getTime() > flooredNow.getTime() ? original.researchReadyAt : flooredNow;

    const a = accepted.stats.allocation;
    const description = (original.generationMetadata as { description?: unknown } | null)?.description;
    await db.insert(p0Spells).values({
      id: runId,
      ownerId: userId,
      name,
      element: original.element,
      category: original.category,
      secondaryCategory: original.secondaryCategory,
      castType: original.castType,
      tier: original.tier,
      damageMin: a.damage_min,
      damageMax: a.damage_max,
      mpCost: a.mp_cost,
      willCostMin: a.will_cost_min,
      willCostMax: a.will_cost_max,
      castTimeMs: a.cast_time_ms,
      interruptionThreshold: a.interruption_threshold,
      maintenanceCostPerTurn: a.maintenance_cost_per_turn,
      drainRatio: a.drain_ratio,
      flavorText: accepted.identity.flavor_text,
      loreLine: accepted.identity.lore_line,
      // The mended spell keeps the original's art: no image call.
      imageUrl: original.imageUrl,
      cardImageUrl: original.cardImageUrl,
      ogImageUrl: original.ogImageUrl,
      dominantColor: original.dominantColor,
      imagePrompt: original.imagePrompt,
      imageAttempts: original.imageAttempts,
      potentialTier: original.potentialTier,
      researchComplexity: original.researchComplexity,
      researchReadyAt,
      verificationTrace: { ...flags, attempts, steps: trace.steps.length },
      generationMetadata: {
        pointsSpent: Math.round(accepted.stats.pointsSpent * 10) / 10,
        budget: Math.round(spec.budget * 10) / 10,
        ...(typeof description === "string" ? { description } : {}),
        mendNote: data.note,
      },
      isPlatformSpell: false,
      refinedFromId: original.id,
    });
    // No Spark entry, no stone minted, no referral payout: only the stone moves.
    await commitStone(spend.entryId);
    await finishRun(runId, "success", { ...flags, attempts, spellId: runId }, trace);

    const [spell] = await db.select().from(p0Spells).where(eq(p0Spells.id, runId)).limit(1);
    return { success: true, spell: toPublicSpell(spell, now), stoneBalance: spend.balance };
  } catch (error) {
    console.error("[Spell Mend] unexpected error:", error);
    await refundStone(spend.entryId).catch(() => {});
    await finishRun(runId, "error", { ...flags, failureReason: "exception" }, trace).catch(() => {});
    return { success: false, code: "generation_failed", error: VALIDATION_MESSAGES.MEND_FAILED, stoneBalance: spend.balance + STONES.mendCost };
  }
}
