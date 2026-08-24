import { callLLM, type LLMMessage } from "./llm";
import { generateSpellCardImageWithRetry } from "./image-generation";
import { getRedisService } from "./redis-service";
import { getDb } from "./db";
import {
  createSpell,
  createSummonProfile,
  addSpellToDeck,
  incrementWeeklySpellCount,
  updateSpellResearchStatus,
  updateSpellImageUrl,
} from "./spell-db";
import {
  LLMSpellOutputSchema,
  validateSpellStats,
  clampSpellStats,
  SpellCreationInputSchema,
} from "../shared/validation";
import { SPELL_CREATION_WEEKLY_LIMIT, VALIDATION_MESSAGES } from "../shared/constants";
import type { Spell } from "../drizzle/schema";

export interface SpellCreationResult {
  success: boolean;
  spell?: Spell;
  error?: string;
  researchTimeMs?: number;
}

export async function createSpellWithLLM(
  userId: number,
  input: unknown
): Promise<SpellCreationResult> {
  const parseResult = SpellCreationInputSchema.safeParse(input);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues[0]?.message || "Invalid input";
    return {
      success: false,
      error: `Invalid input: ${errorMessage}`,
    };
  }

  const { name, element, description, summonMode } = parseResult.data;

  const redis = getRedisService();
  const weeklyUsed = await redis.getWeeklySpellSlots(userId);
  if (weeklyUsed <= 0) {
    return {
      success: false,
      error: VALIDATION_MESSAGES.WEEKLY_LIMIT_EXCEEDED,
    };
  }

  const systemPrompt = `You are the Magic Tower, the ancient classification system of Magic Spar.
Your role is to generate complete spell data based on the player's input.
Return ONLY valid JSON matching the schema exactly. No preamble. No markdown. No explanation.
All numeric values must be within the specified ranges.`;

  const userPrompt = `Create a spell with these details:
Name: ${name}
Element: ${element}
Description: ${description}
${summonMode ? `Summon Mode: ${summonMode}` : ""}

Return a complete spell object as JSON.`;

  const messages: LLMMessage[] = [
    { role: "user", content: userPrompt },
  ];

  let llmOutput: unknown;
  try {
    const response = await callLLM(messages, systemPrompt);
    llmOutput = JSON.parse(response.text);
  } catch (error) {
    console.error("[Spell Creation] LLM call failed:", error);
    return {
      success: false,
      error: "Failed to generate spell from LLM",
    };
  }

  const schemaResult = LLMSpellOutputSchema.safeParse(llmOutput);
  if (!schemaResult.success) {
    console.error("[Spell Creation] Invalid LLM output schema:", schemaResult.error);
    return {
      success: false,
      error: VALIDATION_MESSAGES.INVALID_SPELL_DATA,
    };
  }

  let spell = schemaResult.data;

  const validation = validateSpellStats(spell);
  if (!validation.valid) {
    console.warn("[Spell Creation] Validation errors, clamping stats:", validation.errors);
    spell = clampSpellStats(spell);
  }

  const imagePromise = generateSpellCardImageWithRetry(
    spell.image_prompt,
    spell.name
  );

  const db = await getDb();
  if (!db) {
    return {
      success: false,
      error: "Database not available",
    };
  }

  let savedSpell: Spell | null = null;
  try {
    savedSpell = await db.transaction(async (tx) => {
      const newSpell = await createSpell(userId, {
        name: spell.name,
        element: spell.element,
        tier: spell.tier,
        primaryCategory: spell.primary_category,
        secondaryCategory: spell.secondary_category,
        castType: spell.cast_type,
        castTimeMs: spell.cast_time_ms,
        damageMin: spell.damage_min,
        damageMax: spell.damage_max,
        mpCost: spell.mp_cost,
        mpMaintenancePerTurn: spell.mp_maintenance_per_turn,
        willCostMin: spell.will_cost_min,
        willCostMax: spell.will_cost_max,
        willDrainPerTurn: spell.will_drain_per_turn,
        interruptionThreshold: spell.interruption_threshold,
        scalingFactor: spell.scaling_factor,
        mpModifier: spell.mp_modifier,
        isPhysical: spell.is_physical,
        physicalDelivery: spell.physical_delivery,
        trapCondition: spell.trap_condition,
        trapVisibility: spell.trap_visibility,
        flavorText: spell.flavor_text,
        loreLine: spell.lore_line,
        imageUrl: "",
        researchStatus: "researching",
        researchStartedAt: new Date(),
      }, tx);

      if (!newSpell) {
        throw new Error("Failed to save spell to database");
      }

      if (spell.primary_category === "Summon" && spell.summon_profile) {
        await createSummonProfile(newSpell.id, {
          summonName: spell.summon_profile.summon_name,
          summonHp: spell.summon_profile.summon_hp,
          attackRating: spell.summon_profile.attack_rating,
          element: spell.summon_profile.element,
          mode: spell.summon_profile.mode,
          behaviors: spell.summon_profile.behaviors,
        }, tx);
      }

      await addSpellToDeck(userId, newSpell.id, tx);

      return newSpell;
    });
  } catch (error) {
    console.error("[Spell Creation] Transaction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save spell to database",
    };
  }

  if (!savedSpell) {
    return {
      success: false,
      error: "Failed to save spell to database",
    };
  }

  await redis.incrementWeeklySpellCount(userId);
  await incrementWeeklySpellCount(userId);

  const researchTimeMs = 5000;
  await redis.setResearchStatus(savedSpell.id, "researching", Date.now());

  setTimeout(async () => {
    try {
      await updateSpellResearchStatus(savedSpell.id, "ready");
      await redis.setResearchStatus(savedSpell.id, "ready");
    } catch (error) {
      console.error("[Spell Creation] Failed to update research status:", error);
    }
  }, researchTimeMs);

  try {
    const imageResult = await imagePromise;
    if (imageResult.success && imageResult.url) {
      console.log(`[Spell Creation] Image generated for spell ${savedSpell.id}`);
      await updateSpellImageUrl(savedSpell.id, imageResult.url);
      savedSpell.imageUrl = imageResult.url;
    } else {
      console.warn(
        `[Spell Creation] Image generation failed: ${imageResult.error}`
      );
    }
  } catch (error) {
    console.error("[Spell Creation] Image generation error:", error);
  }

  return {
    success: true,
    spell: savedSpell,
    researchTimeMs,
  };
}

export async function getSpellResearchStatus(
  spellId: string
): Promise<{ status: "researching" | "ready"; timeRemainingMs: number }> {
  const redis = getRedisService();
  const status = await redis.getResearchStatus(spellId);

  if (!status) {
    return { status: "ready", timeRemainingMs: 0 };
  }

  const elapsedMs = Date.now() - status.startTime;
  const researchTimeMs = 5000;
  const timeRemainingMs = Math.max(0, researchTimeMs - elapsedMs);

  return {
    status: timeRemainingMs > 0 ? "researching" : "ready",
    timeRemainingMs,
  };
}
