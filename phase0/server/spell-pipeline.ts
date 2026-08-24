import { nanoid } from "nanoid";
import { desc, eq, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0Spells, type Phase0Spell } from "../drizzle/schema";
import { callLLM } from "./llm";
import { generateSpellCardImageWithRetry } from "./image-generation";
import {
  LLMSpellIdentitySchema,
  SpellCreationInputSchema,
  type SpellCreationInput,
  type LLMSpellIdentity,
} from "../shared/validation";
import { validateSpellIdentityText } from "../shared/profanity";
import { computeStatProfile } from "./power-budget";
import { getSparkBalance, spendSpark } from "./spark";
import { SPARK_CREATION_COST, VALIDATION_MESSAGES } from "../shared/constants";

export interface SpellCreationResult {
  success: boolean;
  spell?: Phase0Spell;
  error?: string;
  sparkBalance?: number;
}

const IDENTITY_SYSTEM_PROMPT = `You are the Magic Tower, the ancient classification system of Arcanis.
A spellcaster has described a spell they wish to forge. Your role is to give it a voice — NOT stats.
Return ONLY valid JSON matching the schema exactly. No preamble. No markdown. No code fences.
Fields:
- flavor_text: a short evocative description of what the spell looks and feels like when cast (1-3 sentences, no numbers).
- lore_line: a mystical one-liner whispered about the spell (max 2 sentences).
- assessment_question: a short reflective question for the caster, or null.
- image_prompt: a vivid art prompt for the spell's artwork (subject, mood, colors, composition).`;

export async function createSpell(userId: number, input: unknown): Promise<SpellCreationResult> {
  const parseResult = SpellCreationInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid input: ${parseResult.error.issues[0]?.message ?? "unknown"}`,
    };
  }

  const data = parseResult.data;

  const balanceBefore = await getSparkBalance(userId);
  if (balanceBefore.balance < 1) {
    return { success: false, error: VALIDATION_MESSAGES.NO_SPARKS };
  }

  const startedAt = Date.now();
  const stats = computeStatProfile({
    element: data.element,
    category: data.category,
    castType: data.castType,
    tier: "Basic",
  });

  const db = requireDb();
  const spellId = nanoid(36);

  const spend = await spendSpark(userId, spellId);
  if (!spend.success) {
    return { success: false, error: VALIDATION_MESSAGES.NO_SPARKS, sparkBalance: spend.balance };
  }

  const identity = await generateSpellIdentity(data);
  if (!identity) {
    await db.execute(
      sql`UPDATE p0_spark_balances SET balance = balance + ${SPARK_CREATION_COST}, total_spent = total_spent - ${SPARK_CREATION_COST} WHERE user_id = ${userId}`
    );
    return { success: false, error: VALIDATION_MESSAGES.INVALID_LLM_OUTPUT, sparkBalance: spend.balance + SPARK_CREATION_COST };
  }

  for (const field of [identity.flavor_text, identity.lore_line, identity.assessment_question ?? ""]) {
    const check = validateSpellIdentityText(field);
    if (!check.valid) {
      await db.execute(
        sql`UPDATE p0_spark_balances SET balance = balance + ${SPARK_CREATION_COST}, total_spent = total_spent - ${SPARK_CREATION_COST} WHERE user_id = ${userId}`
      );
      return { success: false, error: VALIDATION_MESSAGES.CONTENT_MODERATED, sparkBalance: spend.balance + SPARK_CREATION_COST };
    }
  }

  const imagePromise = generateSpellCardImageWithRetry(identity.image_prompt, data.name);

  const metadata = {
    llmProvider: "identity-llm",
    generationMs: Date.now() - startedAt,
    pbUsed: stats.pb_used,
    pbTotal: stats.pb_total,
    verification: "passed",
  };

  await db.insert(p0Spells).values({
    id: spellId,
    ownerId: userId,
    name: data.name,
    element: data.element,
    category: data.category,
    castType: data.castType,
    tier: "Basic",
    damageMin: stats.damage_min,
    damageMax: stats.damage_max,
    mpCost: stats.mp_cost,
    willCostMin: stats.will_cost_min,
    willCostMax: stats.will_cost_max,
    castTimeMs: stats.cast_time_ms,
    scalingFactor: stats.scaling_factor,
    mpModifier: stats.mp_modifier,
    interruptionThreshold: stats.interruption_threshold,
    maintenanceCostPerTurn: stats.maintenance_cost_per_turn,
    flavorText: identity.flavor_text,
    loreLine: identity.lore_line,
    assessmentQuestion: identity.assessment_question,
    imageUrl: "",
    shareCount: 0,
    generationMetadata: metadata as Record<string, unknown>,
    isPlatformSpell: false,
  });

  const [spell] = await db
    .select()
    .from(p0Spells)
    .where(eq(p0Spells.id, spellId))
    .limit(1);

  if (!spell) {
    return { success: false, error: "Failed to save spell", sparkBalance: spend.balance };
  }

  try {
    const imageResult = await imagePromise;
    if (imageResult.success && imageResult.url) {
      await db.update(p0Spells).set({ imageUrl: imageResult.url }).where(eq(p0Spells.id, spellId));
      spell.imageUrl = imageResult.url;
    } else {
      console.warn(`[Spell Pipeline] Image generation failed: ${imageResult.error}`);
    }
  } catch (error) {
    console.error("[Spell Pipeline] Image generation error:", error);
  }

  return { success: true, spell, sparkBalance: spend.balance };
}

async function generateSpellIdentity(data: SpellCreationInput): Promise<LLMSpellIdentity | null> {
  const userPrompt = `The spellcaster wishes to forge a spell:
Name: ${data.name}
Element: ${data.element}
Category: ${data.category}
Cast Type: ${data.castType}
Their description: ${data.description}

Return the identity JSON now.`;

  try {
    const response = await callLLM([{ role: "user", content: userPrompt }], IDENTITY_SYSTEM_PROMPT);
    const cleaned = response.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    const result = LLMSpellIdentitySchema.safeParse(parsed);
    if (!result.success) {
      console.error("[Spell Pipeline] Invalid LLM identity:", result.error.issues);
      return null;
    }
    return result.data;
  } catch (error) {
    console.error("[Spell Pipeline] LLM call failed:", error);
    return null;
  }
}

export async function getMySpells(userId: number): Promise<Phase0Spell[]> {
  const db = requireDb();
  return db
    .select()
    .from(p0Spells)
    .where(eq(p0Spells.ownerId, userId))
    .orderBy(desc(p0Spells.createdAt));
}

export async function getSpellPublic(spellId: string): Promise<Phase0Spell | null> {
  const db = requireDb();
  const [spell] = await db
    .select()
    .from(p0Spells)
    .where(eq(p0Spells.id, spellId))
    .limit(1);
  return spell ?? null;
}

export async function getFeaturedSpells(limit = 5): Promise<Phase0Spell[]> {
  const db = requireDb();
  return db
    .select()
    .from(p0Spells)
    .where(eq(p0Spells.isPlatformSpell, true))
    .orderBy(desc(p0Spells.shareCount), desc(p0Spells.createdAt))
    .limit(limit);
}

export async function incrementShareCount(spellId: string): Promise<void> {
  const db = requireDb();
  await db.execute(
    sql`UPDATE ${p0Spells} SET share_count = share_count + 1 WHERE id = ${spellId}`
  );
}