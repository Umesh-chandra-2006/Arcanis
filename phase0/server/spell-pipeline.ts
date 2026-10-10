// Spell creation pipeline (Build Plan 7.1). Every path that calls a provider
// here runs after a Spark reservation and ends in exactly one of: commit
// (success, or a user-caused input rejection) or refund (anything else).
import { nanoid } from "nanoid";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0GenerationRuns, p0ProviderCalls, p0Spells, p0Users, type Phase0Spell } from "../drizzle/schema";
import { AllProvidersFailedError, generateText } from "./providers/text";
import { generateImage } from "./providers/image";
import type { CallContext, ImageRequest, ImageResult, ModerationInput, TextRequest, TextResult } from "../shared/providers";
import { LLMSpellIdentitySchema, SpellCreationInputSchema, type LLMSpellIdentity, type SpellCreationInput } from "../shared/validation";
import { containsProfanity } from "../shared/profanity";
import { allocationPromptFields, computeBudgetSpec, enforceAllocation, type BudgetSpec, type EnforcementResult } from "../shared/power-budget";
import { CREATION_ENABLED } from "../shared/taxonomy";
import { toPublicSpell, type PublicSpell } from "../shared/spell-view";
import { commitSpark, refundSpark, reserveSpark } from "./spark";
import { grantStoneForCreation } from "./stones";
import { checkBreaker, FORGE_COOLING_MESSAGE, tripBreaker } from "./spend-breaker";
import { moderate as moderateDefault, recordModerationEvent, type ModerationSurface, type PolicyDecision } from "./moderation";
import { semanticCheck as semanticCheckDefault, stripFences, type SemanticCheckResult } from "./semantic-check";
import { storeSpellImage as storeSpellImageDefault } from "./spell-images";
import { addAbuseStrike, canCreate } from "./abuse";
import { payReferralOnFirstCreation } from "./referrals";
import { ENV } from "./_core/env";
import { GENERATION_RETRIES, RESEARCH_EXEMPT_SPELLS, VALIDATION_MESSAGES } from "../shared/constants";

export type CreationErrorCode =
  | "invalid_input"
  | "restricted"
  | "forge_cooling"
  | "no_spark"
  | "input_rejected"
  | "generation_failed";

export interface SpellCreationResult {
  success: boolean;
  spell?: PublicSpell;
  error?: string;
  code?: CreationErrorCode;
  sparkBalance?: number;
}

/** Everything that talks to a provider, injectable for tests. */
export interface PipelineDeps {
  text: (ctx: CallContext, req: TextRequest) => Promise<TextResult>;
  image: (ctx: CallContext, req: ImageRequest) => Promise<ImageResult>;
  moderate: (ctx: Omit<CallContext, "surface">, surface: ModerationSurface, inputs: ModerationInput[]) => Promise<PolicyDecision>;
  semantic: typeof semanticCheckDefault;
  storeImage: typeof storeSpellImageDefault;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
  /** "element": no generated art (Phase 0/1a); "generated": image providers. */
  cardArt: "element" | "generated";
}

export const defaultDeps: PipelineDeps = {
  text: (ctx, req) => generateText(ctx, req),
  image: (ctx, req) => generateImage(ctx, req),
  moderate: moderateDefault,
  semantic: semanticCheckDefault,
  storeImage: storeSpellImageDefault,
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  cardArt: ENV.cardArt,
};

/** Wait before retrying Layer 1 when every provider was only throttled (free tiers are per-minute limited). */
export const RATE_LIMIT_BACKOFF_MS = [3000, 8000];

export interface Trace {
  steps: Array<Record<string, unknown>>;
}

export interface RunFlags {
  layer2aClamped: boolean;
  layer2aFallback: boolean;
  layer2bFlagged: boolean;
  layer2cFired: boolean;
}

export const IDENTITY_SYSTEM_PROMPT = `You are the spell forge of Arcanis, a fantasy game where players invent spells.
A player has described a spell. Give it a voice worthy of what they imagined, and allocate its stats. Return ONLY one JSON object, no markdown:
{
  "flavor_text": "2 to 3 vivid sentences on what casting it looks and feels like, written at the full scale the player described. If they described a world-ending force, write a world-ending force. No numbers.",
  "lore_line": "one short, quotable line of myth about the spell",
  "image_prompt": "an art prompt for the card: subject, mood, colors, composition. Never ask for text, letters or UI in the image.",
  "potential": "Basic" | "Advanced" | "Mega" (how grand the described concept is: Basic = a practical working spell; Advanced = a master's signature technique; Mega = a legendary, world-shaking force),
  "research_complexity": 1 to 10 (how intricate the spell is),
  "stats": { ...the stat fields listed below... }
}
Honor the player's own imagery and words. Write in a neutral narrator voice. Do not mention levels, XP, ranks or game rules.`;

export function describeCategory(category: string): string {
  switch (category) {
    case "Attack":
      return "damage_min/damage_max = damage dealt";
    case "Defense":
      return "damage_min/damage_max = damage absorbed";
    case "Regen":
      return "damage_min/damage_max = HP restored";
    case "Debuff":
      return "damage_min/damage_max = strength of the weakening effect";
    case "Drain":
      return "damage_min/damage_max = damage dealt; drain_ratio = share returned to the caster";
    default:
      return "damage_min/damage_max = the effect's magnitude";
  }
}

export function buildLayer1Prompt(data: SpellCreationInput, spec: BudgetSpec, feedback: string | null): string {
  const fields = allocationPromptFields(spec);
  const lines = Object.entries(fields).map(
    ([k, r]) => `- ${k}: ${r.min} to ${r.max} (${r.better} is stronger)`
  );
  const share = Math.round((spec.budget / spec.maxPoints) * 100);
  return `Spell request
Name: ${data.name}
Element: ${data.element}
Category: ${data.category}
Cast type: ${data.castType}
Player's description: ${data.description}

Stats (${describeCategory(data.category)}):
${lines.join("\n")}

Power budget: this spell may be about ${share}% as strong as a spell maxed in every field, so it cannot be best at everything.
Commit to the identity the player described; never answer with middling values across the board:
- A devastating, catastrophic or legendary spell: push damage_min and damage_max to or near the TOP of the range, and pay for it with HIGH mp_cost, HIGH will cost and a SLOW cast_time.
- A swift or precise spell: fastest cast_time, lower damage.
- An efficient or subtle spell: lowest mp_cost and will cost, modest damage.${
    feedback ? `\n\nYour previous answer was rejected: ${feedback}. Fix that and answer again.` : ""
  }`;
}

export async function finishRun(
  runId: string,
  outcome: "success" | "refunded" | "user_rejected" | "error",
  fields: Partial<typeof p0GenerationRuns.$inferInsert>,
  trace: Trace
): Promise<void> {
  const db = requireDb();
  const [cost] = await db
    .select({ total: sql<string | null>`SUM(${p0ProviderCalls.costEstimateUsd})` })
    .from(p0ProviderCalls)
    .where(eq(p0ProviderCalls.runId, runId));
  await db
    .update(p0GenerationRuns)
    // The database clock, like created_at, so durations are not skewed by the app server's clock.
    .set({ ...fields, outcome, trace, totalCostUsd: Number(cost?.total ?? 0), finishedAt: sql`CURRENT_TIMESTAMP(3)` })
    .where(eq(p0GenerationRuns.id, runId));
}

/** Image with Layer 2b; regenerates on a flag; null means "use the placeholder". */
async function produceImage(
  deps: PipelineDeps,
  ids: { userId: number; runId: string },
  prompt: string,
  trace: Trace
): Promise<ImageResult | null> {
  const style =
    "Dark fantasy digital painting, semi-realistic, dramatic chiaroscuro lighting, painterly brushwork, atmospheric depth, single-subject cinematic composition, highly detailed";
  const exclusions = "no text, no letters, no numbers, no UI, no border, no frame, no watermark, no signature";
  for (let attempt = 0; attempt <= GENERATION_RETRIES; attempt++) {
    const safer = attempt > 0 ? ", tasteful, non-graphic, no gore, fully clothed figures" : "";
    let image: ImageResult;
    try {
      image = await deps.image({ surface: "image", ...ids }, { prompt: `${style}, ${prompt}${safer}, ${exclusions}`, width: 1024, height: 1024 });
    } catch (error) {
      trace.steps.push({ step: "image", attempt, error: error instanceof Error ? error.message.slice(0, 200) : String(error) });
      if (error instanceof AllProvidersFailedError && error.quotaExhausted) return null;
      continue;
    }
    const dataUrl = `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`;
    let decision: PolicyDecision;
    try {
      decision = await deps.moderate(ids, "spell_image", [{ type: "image", url: dataUrl }]);
    } catch (error) {
      // Unmoderated images never reach a player.
      trace.steps.push({ step: "image_2b", attempt, error: String(error).slice(0, 200) });
      return null;
    }
    trace.steps.push({ step: "image_2b", attempt, verdict: decision.verdict, reason: decision.reason });
    if (decision.verdict === "pass") return image;
    // A text model cannot see the image, so a borderline image is regenerated rather than sent to 2c.
    await recordModerationEvent({
      userId: ids.userId,
      surface: "spell_image",
      contentType: "image",
      targetType: "spell",
      targetId: ids.runId,
      verdict: decision.verdict,
      reason: decision.reason,
      scores: decision.scores,
      excerpt: prompt,
      runId: ids.runId,
      status: "resolved",
    });
  }
  return null;
}

/**
 * Layer 2b on the player's own words, before any generation, with Layer 2c on
 * a borderline verdict. Shared by creation and mending. "unavailable" means
 * the check could not run (our failure); "rejected" is the player's doing.
 */
export async function screenPlayerInput(
  deps: PipelineDeps,
  ids: { userId: number; runId: string },
  input: { text: string; category: string; element: string },
  trace: Trace,
  flags: RunFlags
): Promise<"ok" | "rejected" | "unavailable"> {
  const { userId, runId } = ids;
  const inputText = input.text;
  const inputDecision = await deps.moderate(ids, "spell_input", [{ type: "text", text: inputText }]);
  trace.steps.push({ step: "input_2b", verdict: inputDecision.verdict, reason: inputDecision.reason });
  let inputRejected = inputDecision.verdict === "reject";
  if (inputDecision.verdict !== "pass") flags.layer2bFlagged = true;
  if (inputDecision.verdict === "borderline") {
    flags.layer2cFired = true;
    const check = await deps.semantic(ids, {
      kind: "player_input",
      category: input.category,
      element: input.element,
      content: inputText,
      flag: `moderation borderline: ${inputDecision.reason}`,
    });
    trace.steps.push({ step: "input_2c", ...check });
    await recordModerationEvent({
      userId,
      surface: "spell_input",
      contentType: "text",
      verdict: "borderline",
      reason: inputDecision.reason,
      scores: inputDecision.scores,
      excerpt: inputText,
      escalatedTo2c: true,
      layer2cResult: check.reasonCode,
      runId,
      status: check.pass ? "open" : "resolved",
    });
    if (check.reasonCode === "check_unavailable") return "unavailable";
    inputRejected = !check.pass;
  }
  if (!inputRejected) return "ok";
  if (inputDecision.verdict === "reject") {
    await recordModerationEvent({
      userId,
      surface: "spell_input",
      contentType: "text",
      verdict: "reject",
      reason: inputDecision.reason,
      scores: inputDecision.scores,
      excerpt: inputText,
      runId,
    });
  }
  return "rejected";
}

export interface VerifiedIdentity {
  identity: LLMSpellIdentity;
  stats: EnforcementResult;
}

/**
 * Layer 1 with Layers 2a, 2b and conditional 2c, and silent retries. The one
 * place generated spell text and stats are accepted, for creation and mending
 * alike: nothing leaves here unverified. `accepted` is null when every attempt
 * failed; the caller refunds.
 */
export async function generateVerifiedIdentity(
  deps: PipelineDeps,
  ids: { userId: number; runId: string },
  request: { system: string; user: (feedback: string | null) => string; spec: BudgetSpec; category: string; element: string },
  now: Date,
  trace: Trace,
  flags: RunFlags
): Promise<{ accepted: VerifiedIdentity | null; attempts: number; lastReason: string }> {
  const { userId, runId } = ids;
  const { spec } = request;
  let accepted: VerifiedIdentity | null = null;
  let feedback: string | null = null;
  let attempts = 0;
  let lastReason = "layer1_failed";
  for (let attempt = 0; attempt <= GENERATION_RETRIES && !accepted; attempt++) {
    attempts++;
    let response: TextResult;
    try {
      response = await deps.text({ surface: "spell_identity", ...ids }, {
        system: request.system,
        user: request.user(feedback),
        json: true,
        maxTokens: 1200,
      });
    } catch (error) {
      trace.steps.push({ step: "layer1", attempt, error: error instanceof Error ? error.message.slice(0, 200) : String(error) });
      if (error instanceof AllProvidersFailedError && error.quotaExhausted) {
        await tripBreaker("provider_quota", now);
        lastReason = "provider_quota";
        break;
      }
      lastReason = "provider_unavailable";
      const throttled =
        error instanceof AllProvidersFailedError && error.errors.length > 0 && error.errors.every((e) => e.kind === "rate_limited" || e.kind === "server");
      if (throttled && attempt < GENERATION_RETRIES) await deps.sleep(RATE_LIMIT_BACKOFF_MS[attempt] ?? 8000);
      continue;
    }

    // Layer 2a: schema
    let identity: LLMSpellIdentity;
    try {
      const schema = LLMSpellIdentitySchema.safeParse(JSON.parse(stripFences(response.text)));
      if (!schema.success) throw new Error(schema.error.issues[0]?.message ?? "schema");
      // Models like to wrap the lore line in quotation marks; the card adds its own.
      identity = { ...schema.data, lore_line: schema.data.lore_line.replace(/^[\s"'‘’“”]+|[\s"'‘’“”]+$/g, "") };
    } catch (error) {
      trace.steps.push({ step: "layer2a_schema", attempt, error: String(error).slice(0, 200) });
      feedback = "the JSON was invalid or missing fields";
      lastReason = "schema_invalid";
      continue;
    }
    const generated = `${identity.flavor_text}\n${identity.lore_line}\n${identity.image_prompt}`;
    if (containsProfanity(generated)) {
      trace.steps.push({ step: "layer2a_text", attempt, reason: "profanity" });
      feedback = "the text used offensive language";
      lastReason = "text_profanity";
      continue;
    }

    // Layer 2a: stats against the Power Budget
    const stats = enforceAllocation(spec, identity.stats);
    flags.layer2aClamped ||= stats.clamped || stats.rescaled !== null;
    flags.layer2aFallback ||= stats.fallback;
    trace.steps.push({ step: "layer2a_stats", attempt, reasons: stats.reasons, fallback: stats.fallback });

    // Layer 2b on generated text
    const textDecision = await deps.moderate(ids, "spell_text", [{ type: "text", text: generated }]);
    trace.steps.push({ step: "text_2b", attempt, verdict: textDecision.verdict, reason: textDecision.reason });
    if (textDecision.verdict === "reject") {
      flags.layer2bFlagged = true;
      await recordModerationEvent({
        userId,
        surface: "spell_text",
        contentType: "text",
        verdict: "reject",
        reason: textDecision.reason,
        scores: textDecision.scores,
        excerpt: generated,
        runId,
      });
      feedback = "the text was too graphic or unsafe; keep it fantastical and non-graphic";
      lastReason = "text_rejected";
      continue;
    }

    // Layer 2c only when 2a or 2b flagged
    if (textDecision.verdict === "borderline" || stats.fallback) {
      if (textDecision.verdict === "borderline") flags.layer2bFlagged = true;
      flags.layer2cFired = true;
      const check: SemanticCheckResult = await deps.semantic(ids, {
        kind: "generated_text",
        category: request.category,
        element: request.element,
        content: generated,
        flag: textDecision.verdict === "borderline" ? `moderation borderline: ${textDecision.reason}` : "stat allocation malformed",
      });
      trace.steps.push({ step: "text_2c", attempt, ...check });
      if (textDecision.verdict === "borderline") {
        await recordModerationEvent({
          userId,
          surface: "spell_text",
          contentType: "text",
          verdict: "borderline",
          reason: textDecision.reason,
          scores: textDecision.scores,
          excerpt: generated,
          escalatedTo2c: true,
          layer2cResult: check.reasonCode,
          runId,
          status: check.pass ? "open" : "resolved",
        });
      }
      if (!check.pass) {
        feedback = `a reviewer flagged it (${check.reasonCode}); match the requested ${request.category} spell and keep it safe`;
        lastReason = `text_2c_${check.reasonCode}`;
        continue;
      }
    }
    accepted = { identity, stats };
  }
  return { accepted, attempts, lastReason };
}


export async function createSpell(
  userId: number,
  input: unknown,
  options: { deps?: Partial<PipelineDeps>; sessionId?: string | null } = {}
): Promise<SpellCreationResult> {
  const deps: PipelineDeps = { ...defaultDeps, ...options.deps };
  const parsed = SpellCreationInputSchema.safeParse(input);
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

  if (await checkBreaker({ userId, sessionId: options.sessionId })) {
    return { success: false, code: "forge_cooling", error: FORGE_COOLING_MESSAGE };
  }

  const runId = nanoid(36);
  const spend = await reserveSpark(userId, runId, now);
  if (!spend.ok) {
    return { success: false, code: "no_spark", error: VALIDATION_MESSAGES.NO_SPARKS, sparkBalance: spend.balance };
  }
  const ids = { userId, runId };
  const trace: Trace = { steps: [] };
  const flags: RunFlags = { layer2aClamped: false, layer2aFallback: false, layer2bFlagged: false, layer2cFired: false };
  await db.insert(p0GenerationRuns).values({ id: runId, userId });

  const refund = async (reason: string, code: CreationErrorCode = "generation_failed", error: string = VALIDATION_MESSAGES.GENERATION_FAILED) => {
    await refundSpark(spend.entryId);
    await finishRun(runId, "refunded", { ...flags, failureReason: reason }, trace);
    return { success: false, code, error, sparkBalance: spend.balance + 1 } satisfies SpellCreationResult;
  };

  try {
    // ---- Layer 2b on the player's own words, before any generation ----
    const screened = await screenPlayerInput(
      deps,
      ids,
      { text: `${data.name}\n${data.description}`, category: data.category, element: data.element },
      trace,
      flags
    );
    if (screened === "unavailable") return await refund("input_2c_unavailable");
    if (screened === "rejected") {
      // User-caused: the Spark is spent and a strike is added (Build Plan 6).
      await commitSpark(spend.entryId);
      await addAbuseStrike(userId, now);
      await finishRun(runId, "user_rejected", { ...flags, failureReason: "input_rejected" }, trace);
      return { success: false, code: "input_rejected", error: VALIDATION_MESSAGES.INPUT_REJECTED, sparkBalance: spend.balance };
    }

    // ---- Layer 1 with Layer 2a, 2b and 2c, silent retries ----
    const spec = computeBudgetSpec({ tier: CREATION_ENABLED.tier, element: data.element, category: data.category, castType: data.castType });
    const { accepted, attempts, lastReason } = await generateVerifiedIdentity(
      deps,
      ids,
      {
        system: IDENTITY_SYSTEM_PROMPT,
        user: (feedback) => buildLayer1Prompt(data, spec, feedback),
        spec,
        category: data.category,
        element: data.element,
      },
      now,
      trace,
      flags
    );

    if (!accepted) return await refund(lastReason);

    // ---- Image (never blocks creation; falls back to the placeholder) ----
    // Element mode: no generated art, no image calls; the element's art is the face.
    const image = deps.cardArt === "generated" ? await produceImage(deps, ids, accepted.identity.image_prompt, trace) : null;
    const stored = image ? await deps.storeImage({ userId, runId }, runId, image, { name: data.name, element: data.element }) : null;

    // ---- Research timer: first spells skip it ----
    const [owned] = await db.select({ n: count() }).from(p0Spells).where(eq(p0Spells.ownerId, userId));
    const complexity = accepted.identity.research_complexity;
    // Floored to the second: the column has no fractional seconds and MySQL rounds,
    // which could otherwise put an exempt spell's ready time slightly in the future.
    const researchReadyAt =
      Number(owned?.n ?? 0) < RESEARCH_EXEMPT_SPELLS
        ? new Date(Math.floor(now.getTime() / 1000) * 1000)
        : new Date(now.getTime() + (5 + (complexity - 1) * 5) * 60_000);

    const a = accepted.stats.allocation;
    await db.insert(p0Spells).values({
      id: runId,
      ownerId: userId,
      name: data.name,
      element: data.element,
      category: data.category,
      castType: data.castType,
      tier: CREATION_ENABLED.tier,
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
      imageUrl: stored?.imageUrl ?? "",
      cardImageUrl: stored?.cardImageUrl ?? null,
      ogImageUrl: stored?.ogImageUrl ?? null,
      dominantColor: stored?.dominantColor ?? null,
      imagePrompt: accepted.identity.image_prompt,
      imageAttempts: 1,
      potentialTier: accepted.identity.potential,
      researchComplexity: complexity,
      researchReadyAt,
      verificationTrace: { ...flags, attempts, steps: trace.steps.length },
      generationMetadata: {
        pointsSpent: Math.round(accepted.stats.pointsSpent * 10) / 10,
        budget: Math.round(spec.budget * 10) / 10,
        // Kept so a later mend can honor the player's own words (never sent to clients).
        description: data.description,
      },
      isPlatformSpell: false,
    });
    // A forged spell yields one Refinement Stone, and only once its Spark is committed (Master Doc 22.1).
    if (await commitSpark(spend.entryId)) {
      await grantStoneForCreation(userId, runId).catch((error) => console.warn("[Stones] grant failed:", error));
    }
    await finishRun(runId, "success", { ...flags, attempts, spellId: runId }, trace);
    await payReferralOnFirstCreation(userId).catch((error) => console.warn("[Referral] payout failed:", error));

    const [spell] = await db.select().from(p0Spells).where(eq(p0Spells.id, runId)).limit(1);
    return { success: true, spell: toPublicSpell(spell, now), sparkBalance: spend.balance };
  } catch (error) {
    console.error("[Spell Pipeline] unexpected error:", error);
    await refundSpark(spend.entryId).catch(() => {});
    await finishRun(runId, "error", { ...flags, failureReason: "exception" }, trace).catch(() => {});
    return { success: false, code: "generation_failed", error: VALIDATION_MESSAGES.GENERATION_FAILED, sparkBalance: spend.balance + 1 };
  }
}

// ---- reads ----

const visible = and(eq(p0Spells.isPublic, true), sql`${p0Spells.removedAt} IS NULL`);

export async function getMySpells(userId: number): Promise<PublicSpell[]> {
  const rows = await requireDb().select().from(p0Spells).where(eq(p0Spells.ownerId, userId)).orderBy(desc(p0Spells.createdAt));
  return rows.map((r) => toPublicSpell(r));
}

/** Raw row for server-side use (OG route); includes taken-down spells so callers can return 410. */
export async function getSpellRow(spellId: string): Promise<Phase0Spell | null> {
  const [spell] = await requireDb().select().from(p0Spells).where(eq(p0Spells.id, spellId)).limit(1);
  return spell ?? null;
}

export function isTakenDown(spell: Pick<Phase0Spell, "isPublic" | "removedAt">): boolean {
  return !spell.isPublic || spell.removedAt !== null;
}

export async function getSpellPublic(spellId: string): Promise<PublicSpell | null> {
  const spell = await getSpellRow(spellId);
  return spell && !isTakenDown(spell) ? toPublicSpell(spell) : null;
}

export async function getFeaturedSpells(limit = 5): Promise<PublicSpell[]> {
  const rows = await requireDb()
    .select()
    .from(p0Spells)
    .where(and(eq(p0Spells.isPlatformSpell, true), visible))
    .orderBy(desc(p0Spells.shareCount), desc(p0Spells.createdAt))
    .limit(limit);
  return rows.map((r) => toPublicSpell(r));
}

/** The platform base spells (Master Doc 5.6), in a stable element and tier order. */
export async function getBaseSpells(): Promise<PublicSpell[]> {
  const rows = await requireDb()
    .select()
    .from(p0Spells)
    .where(and(eq(p0Spells.isPlatformSpell, true), visible));
  return rows.map((r) => toPublicSpell(r));
}

export async function incrementShareCount(spellId: string): Promise<void> {
  await requireDb().execute(sql`UPDATE ${p0Spells} SET share_count = share_count + 1 WHERE id = ${spellId}`);
}
