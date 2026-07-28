/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";
export * from "./validation";

export {
  ELEMENTS,
  ALL_ELEMENTS,
  ELEMENT_COLORS,
  AMICABILITY,
  AVATARS,
  AVATAR_STATS,
  SPELL_TIERS,
  CAST_TYPES,
  SPELL_CATEGORIES,
  SPELL_CAPS,
  SUMMON_CAPS,
  WILL_STATES,
  WILL_COST_BY_TIER,
  BATTLE_TURN_DURATION_MS,
  DISCONNECT_FORFEIT_MS,
  MINIGAME_SKIP_THRESHOLD_MS,
  TERRAINS,
  MINIGAME_TYPES,
  ELEMENT_TO_MINIGAME,
  SPELL_CREATION_WEEKLY_LIMIT,
  LLM_RATE_LIMITS,
  VALIDATION_MESSAGES,
} from "./constants";
