import { SPELL_CAPS } from "../shared/constants";
import type {
  Phase0Category,
  Phase0CastType,
  Phase0Element,
  Phase0Tier,
} from "../shared/constants";

const BASE_POWER_BUDGET = {
  Basic: 100,
  Advanced: 250,
  Mega: 600,
} as const;

const CATEGORY_MODIFIERS: Record<string, number> = {
  Attack: 1.0,
  Defense: 0.8,
  Regen: 0.9,
  Debuff: 1.1,
  Buff: 0.9,
  Drain: 1.2,
  Environmental: 1.0,
  Summon: 1.3,
  Physical: 0.7,
  Hybrid: 1.2,
};

const CAST_TYPE_MODIFIERS: Record<string, number> = {
  Instant: 1.0,
  Trap: 0.95,
  Charged: 1.05,
  Continuous: 1.15,
  Channeled: 1.25,
};

const ELEMENTAL_SHIFTS: Record<
  string,
  {
    damage_max?: number;
    mp_cost?: number;
    mp_maintenance?: number;
    cast_time_ms?: number;
    damage_min?: number;
    interruption_threshold?: number;
    mp_modifier?: number;
    scaling_factor?: number;
  }
> = {
  Fire: { damage_max: 0.08, mp_cost: -0.05 },
  Water: { damage_max: -0.05, mp_maintenance: -0.1 },
  Wind: { cast_time_ms: -0.15, damage_min: 0.05 },
  Earth: { interruption_threshold: 0.2, damage_max: -0.08 },
  Lightning: { cast_time_ms: -0.2, mp_cost: 0.1 },
  Void: { mp_modifier: 0.15, damage_min: -0.1 },
  Arcane: { scaling_factor: 0.1, mp_cost: 0.05 },
  Light: { mp_maintenance: -0.15, damage_max: -0.05 },
  Shadow: { damage_max: 0.1, interruption_threshold: -0.1 },
  Nature: { mp_maintenance: -0.1, interruption_threshold: 0.1 },
  Frost: { scaling_factor: 0.15, cast_time_ms: 0.1 },
  Chaos: { damage_min: -0.2, damage_max: 0.25 },
};

interface ArchetypeSplit {
  damage: number;
  mp: number;
  will: number;
  interruption: number;
  maintenance: number;
  scaling: number;
}

const ARCHETYPES: Record<Phase0Category, ArchetypeSplit> = {
  Attack: { damage: 0.55, mp: 0.15, will: 0.2, interruption: 0.1, maintenance: 0, scaling: 0 },
  Defense: { damage: 0.15, mp: 0.2, will: 0.15, interruption: 0.35, maintenance: 0, scaling: 0.15 },
  Regen: { damage: 0.1, mp: 0.2, will: 0.15, interruption: 0.15, maintenance: 0.4, scaling: 0 },
  Debuff: { damage: 0.25, mp: 0.2, will: 0.2, interruption: 0.1, maintenance: 0, scaling: 0.25 },
};

const DAMAGE_SPREAD: Record<Phase0Category, number> = {
  Attack: 0.3,
  Defense: 0.15,
  Regen: 0.2,
  Debuff: 0.25,
};

const ARCHETYPE_CAST_TIME_MS: Record<Phase0Category, number> = {
  Attack: 900,
  Defense: 1100,
  Regen: 1000,
  Debuff: 1000,
};

export interface PowerBudgetResult {
  damage_min: number;
  damage_max: number;
  mp_cost: number;
  will_cost_min: number;
  will_cost_max: number;
  cast_time_ms: number;
  scaling_factor: number | null;
  mp_modifier: number | null;
  interruption_threshold: number | null;
  maintenance_cost_per_turn: number | null;
  pb_used: number;
  pb_total: number;
}

export function computeSpellStats(
  element: string,
  category: string,
  castType: string,
  tier: string = "Basic"
): PowerBudgetResult {
  const basePB =
    BASE_POWER_BUDGET[tier as keyof typeof BASE_POWER_BUDGET] ?? BASE_POWER_BUDGET.Basic;
  const catMod = CATEGORY_MODIFIERS[category] ?? 1.0;
  const castMod = CAST_TYPE_MODIFIERS[castType] ?? 1.0;
  const effectivePB = basePB * catMod * castMod;

  const distribution = distributeBudget(effectivePB, category, castType, tier as Phase0Tier);

  const elementShifts = ELEMENTAL_SHIFTS[element];
  if (elementShifts) {
    applyElementalShifts(distribution, elementShifts);
  }

  clampToTierCaps(distribution, tier as Phase0Tier);

  return distribution;
}

function distributeBudget(
  effectivePB: number,
  category: string,
  castType: string,
  tier: Phase0Tier
): PowerBudgetResult {
  const archetype = ARCHETYPES[category as Phase0Category] ?? ARCHETYPES.Attack;

  const damageBudget = effectivePB * archetype.damage;
  const mpBudget = effectivePB * archetype.mp;
  const willBudget = effectivePB * archetype.will;
  const interruptionBudget = effectivePB * archetype.interruption;
  const maintenanceBudget = effectivePB * archetype.maintenance;
  const scalingBudget = effectivePB * archetype.scaling;

  const avgDamage = damageBudget; // STAT_COSTS.damage_per_point = 1.0
  const spread = DAMAGE_SPREAD[category as Phase0Category] ?? 0.25;
  const damageMin = Math.max(1, Math.floor(avgDamage * (1 - spread)));
  const damageMax = Math.max(damageMin, Math.ceil(avgDamage * (1 + spread)));

  const mpCost = Math.max(0, Math.round(mpBudget / 1.5)); // STAT_COSTS.mp_cost_per_point = -1.5

  const avgWill = Math.max(0, willBudget / 0.8); // STAT_COSTS.will_cost_per_point = -0.8
  const willCostMin = Math.max(1, Math.floor(avgWill * 0.9));
  const willCostMax = Math.max(willCostMin, Math.ceil(avgWill * 1.1));

  const interruptionThreshold =
    interruptionBudget > 0 ? Math.max(0, Math.round(interruptionBudget / 2.0)) : null; // -2.0 per point

  const scalingFactor = scalingBudget > 0 ? Math.round((scalingBudget / 15.0) * 10) / 10 : null;
  const maintenanceCostPerTurn =
    maintenanceBudget > 0 ? Math.max(0, Math.round(maintenanceBudget / 3.0)) : null; // -3.0 per turn

  let castTimeMs = ARCHETYPE_CAST_TIME_MS[category as Phase0Category] ?? 1000;
  if (castType === "Charged") castTimeMs = Math.round(castTimeMs * 1.4);
  if (castType === "Continuous" || castType === "Channeled") castTimeMs = Math.round(castTimeMs * 0.85);

  return {
    damage_min: damageMin,
    damage_max: damageMax,
    mp_cost: mpCost,
    will_cost_min: willCostMin,
    will_cost_max: willCostMax,
    cast_time_ms: castTimeMs,
    scaling_factor: scalingFactor,
    mp_modifier: null,
    interruption_threshold: interruptionThreshold,
    maintenance_cost_per_turn: maintenanceCostPerTurn,
    pb_used: Math.round(effectivePB),
    pb_total: Math.round(effectivePB),
  };
}

function applyElementalShifts(
  stats: PowerBudgetResult,
  shifts: (typeof ELEMENTAL_SHIFTS)[string]
) {
  if (shifts.damage_max !== undefined) {
    stats.damage_max = Math.max(stats.damage_min, Math.round(stats.damage_max * (1 + shifts.damage_max)));
  }
  if (shifts.damage_min !== undefined) {
    stats.damage_min = Math.max(1, Math.round(stats.damage_min * (1 + shifts.damage_min)));
    if (stats.damage_min > stats.damage_max) stats.damage_max = stats.damage_min;
  }
  if (shifts.mp_cost !== undefined) {
    stats.mp_cost = Math.max(0, Math.round(stats.mp_cost * (1 + shifts.mp_cost)));
  }
  if (shifts.cast_time_ms !== undefined) {
    stats.cast_time_ms = Math.max(400, Math.round(stats.cast_time_ms * (1 + shifts.cast_time_ms)));
  }
  if (shifts.interruption_threshold !== undefined && stats.interruption_threshold !== null) {
    stats.interruption_threshold = Math.max(
      0,
      Math.round(stats.interruption_threshold * (1 + shifts.interruption_threshold))
    );
  }
  if (shifts.scaling_factor !== undefined && stats.scaling_factor !== null) {
    stats.scaling_factor = Math.round(stats.scaling_factor * (1 + shifts.scaling_factor) * 10) / 10;
  }
  if (shifts.mp_modifier !== undefined) {
    stats.mp_modifier =
      Math.round((stats.mp_modifier ?? 0) * 100 + shifts.mp_modifier * 100) / 100;
  }
  if (shifts.mp_maintenance !== undefined && stats.maintenance_cost_per_turn !== null) {
    stats.maintenance_cost_per_turn = Math.max(
      0,
      Math.round(stats.maintenance_cost_per_turn * (1 + shifts.mp_maintenance))
    );
  }
}

function clampToTierCaps(stats: PowerBudgetResult, tier: Phase0Tier) {
  const caps = SPELL_CAPS[tier];

  stats.damage_min = clampInt(stats.damage_min, caps.damage[0], caps.damage[1]);
  stats.damage_max = clampInt(stats.damage_max, caps.damage[0], caps.damage[1]);
  if (stats.damage_min > stats.damage_max) stats.damage_min = stats.damage_max;

  stats.mp_cost = clampInt(stats.mp_cost, caps.mp[0], caps.mp[1]);
  stats.will_cost_min = clampInt(stats.will_cost_min, caps.will[0], caps.will[1]);
  stats.will_cost_max = clampInt(stats.will_cost_max, caps.will[0], caps.will[1]);
  if (stats.will_cost_min > stats.will_cost_max) stats.will_cost_min = stats.will_cost_max;

  stats.cast_time_ms = clampInt(stats.cast_time_ms, caps.castTimeMs[0], caps.castTimeMs[1]);

  if (stats.interruption_threshold !== null) {
    stats.interruption_threshold = clampInt(
      stats.interruption_threshold,
      caps.interruption[0],
      caps.interruption[1]
    );
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function powerBudgetBreakdown(
  element: string,
  category: string,
  castType: string,
  tier: string = "Basic"
): { stats: PowerBudgetResult; budgetNotes: Record<string, string> } {
  const basePB =
    BASE_POWER_BUDGET[tier as keyof typeof BASE_POWER_BUDGET] ?? BASE_POWER_BUDGET.Basic;
  const catMod = CATEGORY_MODIFIERS[category] ?? 1.0;
  const castMod = CAST_TYPE_MODIFIERS[castType] ?? 1.0;
  const effectivePB = basePB * catMod * castMod;

  return {
    stats: computeSpellStats(element, category, castType, tier),
    budgetNotes: {
      base_power_budget: String(basePB),
      category_modifier: catMod.toFixed(2),
      cast_type_modifier: castMod.toFixed(2),
      effective_power_budget: effectivePB.toFixed(1),
      archetype: category,
    },
  };
}

export function computeStatProfile(input: {
  element: string;
  category: string;
  castType: string;
  tier?: string;
}): PowerBudgetResult {
  return computeSpellStats(input.element, input.category, input.castType, input.tier ?? "Basic");
}