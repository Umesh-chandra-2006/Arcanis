import { z } from "zod";
import {
  ALL_ELEMENTS,
  SPELL_TIERS,
  CAST_TYPES,
  SPELL_CATEGORIES,
  SPELL_CAPS,
  SUMMON_CAPS,
  AVATARS,
  TERRAINS,
} from "./constants";

export const SpellCreationInputSchema = z.object({
  name: z.string().min(1).max(256),
  element: z.enum(ALL_ELEMENTS),
  description: z.string().min(1).max(1000),
  summonMode: z.enum(["autonomous", "controlled"]).optional(),
});

export type SpellCreationInput = z.infer<typeof SpellCreationInputSchema>;

export const LLMSpellOutputSchema = z.object({
  name: z.string(),
  flavor_text: z.string(),
  lore_line: z.string(),
  element: z.enum(ALL_ELEMENTS),
  tier: z.enum(SPELL_TIERS),
  damage_min: z.number().int(),
  damage_max: z.number().int(),
  mp_cost: z.number().int(),
  mp_maintenance_per_turn: z.number().int().nullable(),
  will_cost_min: z.number().int(),
  will_cost_max: z.number().int(),
  will_drain_per_turn: z.number().int().nullable(),
  primary_category: z.enum(SPELL_CATEGORIES),
  secondary_category: z.enum(SPELL_CATEGORIES).nullable(),
  cast_type: z.enum(CAST_TYPES),
  cast_time_ms: z.number().int(),
  interruption_threshold: z.number().int().nullable(),
  scaling_factor: z.number().nullable(),
  mp_modifier: z.number().nullable(),
  is_physical: z.boolean(),
  physical_delivery: z.string().nullable(),
  trap_condition: z.string().nullable(),
  trap_visibility: z.enum(["visible", "hidden"]).nullable(),
  summon_profile: z
    .object({
      summon_name: z.string(),
      summon_hp: z.number().int(),
      attack_rating: z.number().int(),
      element: z.enum(ALL_ELEMENTS),
      mode: z.enum(["autonomous", "controlled"]),
      behaviors: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          directive: z.enum(["attack", "defend", "support"]).nullable(),
        })
      ),
    })
    .nullable(),
  image_prompt: z.string(),
});

export type LLMSpellOutput = z.infer<typeof LLMSpellOutputSchema>;

export function validateSpellStats(spell: LLMSpellOutput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const caps = SPELL_CAPS[spell.tier];

  if (spell.damage_min < caps.damage[0] || spell.damage_min > caps.damage[1]) {
    errors.push(
      `Damage min ${spell.damage_min} outside range [${caps.damage[0]}, ${caps.damage[1]}]`
    );
  }
  if (spell.damage_max < caps.damage[0] || spell.damage_max > caps.damage[1]) {
    errors.push(
      `Damage max ${spell.damage_max} outside range [${caps.damage[0]}, ${caps.damage[1]}]`
    );
  }
  if (spell.damage_min > spell.damage_max) {
    errors.push("Damage min must be <= damage max");
  }

  if (spell.mp_cost < caps.mp[0] || spell.mp_cost > caps.mp[1]) {
    errors.push(
      `MP cost ${spell.mp_cost} outside range [${caps.mp[0]}, ${caps.mp[1]}]`
    );
  }

  if (spell.will_cost_min < caps.will[0] || spell.will_cost_min > caps.will[1]) {
    errors.push(
      `Will cost min ${spell.will_cost_min} outside range [${caps.will[0]}, ${caps.will[1]}]`
    );
  }
  if (spell.will_cost_max < caps.will[0] || spell.will_cost_max > caps.will[1]) {
    errors.push(
      `Will cost max ${spell.will_cost_max} outside range [${caps.will[0]}, ${caps.will[1]}]`
    );
  }
  if (spell.will_cost_min > spell.will_cost_max) {
    errors.push("Will cost min must be <= will cost max");
  }

  if (spell.cast_type !== "Instant") {
    if (
      spell.interruption_threshold &&
      (spell.interruption_threshold < caps.interruption[0] ||
        spell.interruption_threshold > caps.interruption[1])
    ) {
      errors.push(
        `Interruption threshold ${spell.interruption_threshold} outside range [${caps.interruption[0]}, ${caps.interruption[1]}]`
      );
    }
  }

  if (spell.primary_category === "Summon" && spell.summon_profile) {
    const summonCaps = SUMMON_CAPS[spell.tier];
    if (
      spell.summon_profile.summon_hp < summonCaps.hp[0] ||
      spell.summon_profile.summon_hp > summonCaps.hp[1]
    ) {
      errors.push(
        `Summon HP ${spell.summon_profile.summon_hp} outside range [${summonCaps.hp[0]}, ${summonCaps.hp[1]}]`
      );
    }
    if (
      spell.summon_profile.attack_rating < summonCaps.attack[0] ||
      spell.summon_profile.attack_rating > summonCaps.attack[1]
    ) {
      errors.push(
        `Summon attack ${spell.summon_profile.attack_rating} outside range [${summonCaps.attack[0]}, ${summonCaps.attack[1]}]`
      );
    }
    if (spell.summon_profile.behaviors.length > summonCaps.behaviors) {
      errors.push(
        `Summon has ${spell.summon_profile.behaviors.length} behaviors, max is ${summonCaps.behaviors}`
      );
    }
  }

  if (spell.primary_category === "Hybrid") {
    const baseWillCost = spell.will_cost_max;
    const expectedMax = Math.floor(baseWillCost * 1.2);
    if (spell.will_cost_max > expectedMax) {
      errors.push(
        `Hybrid spell will cost exceeds 20% penalty (max ${expectedMax}, got ${spell.will_cost_max})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function clampSpellStats(spell: LLMSpellOutput): LLMSpellOutput {
  const caps = SPELL_CAPS[spell.tier];
  const summonCaps = SUMMON_CAPS[spell.tier];

  return {
    ...spell,
    damage_min: Math.max(caps.damage[0], Math.min(caps.damage[1], spell.damage_min)),
    damage_max: Math.max(caps.damage[0], Math.min(caps.damage[1], spell.damage_max)),
    mp_cost: Math.max(caps.mp[0], Math.min(caps.mp[1], spell.mp_cost)),
    will_cost_min: Math.max(caps.will[0], Math.min(caps.will[1], spell.will_cost_min)),
    will_cost_max: Math.max(caps.will[0], Math.min(caps.will[1], spell.will_cost_max)),
    interruption_threshold:
      spell.cast_type === "Instant"
        ? null
        : spell.interruption_threshold
          ? Math.max(
              caps.interruption[0],
              Math.min(caps.interruption[1], spell.interruption_threshold)
            )
          : null,
    summon_profile: spell.summon_profile
      ? {
          ...spell.summon_profile,
          summon_hp: Math.max(
            summonCaps.hp[0],
            Math.min(summonCaps.hp[1], spell.summon_profile.summon_hp)
          ),
          attack_rating: Math.max(
            summonCaps.attack[0],
            Math.min(summonCaps.attack[1], spell.summon_profile.attack_rating)
          ),
          behaviors: spell.summon_profile.behaviors.slice(0, summonCaps.behaviors),
        }
      : null,
  };
}

export const UserRegistrationSchema = z.object({
  username: z.string().min(3).max(64),
  email: z.string().email(),
  password: z.string().min(8),
  avatar: z.enum(AVATARS),
});

export type UserRegistration = z.infer<typeof UserRegistrationSchema>;

export const BattleActionSchema = z.object({
  battleId: z.string(),
  playerId: z.number(),
  action: z.enum(["cast", "trap", "pass"]),
  spellId: z.string().optional(),
  minigameResult: z
    .object({
      accuracy: z.number().min(0).max(1),
    })
    .optional(),
});

export type BattleAction = z.infer<typeof BattleActionSchema>;

export const BattleInitSchema = z.object({
  player1Id: z.number(),
  player2Id: z.number(),
  terrain: z.enum(TERRAINS),
});

export type BattleInit = z.infer<typeof BattleInitSchema>;
