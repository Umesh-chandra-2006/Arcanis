// Hybrid Power Budget and Layer 2a stat enforcement (Build Plan 7.2, 7.2a; task A7).
// Pure functions: code sets the budget, the model allocates it, this module
// enforces ranges, caps and the budget total. Tier always comes from the
// request, never from model output. Players never see budgets or points.
import {
  CAST_TIME_MS,
  DRAIN_RATIO,
  INTERRUPTION_THRESHOLD,
  MAINTENANCE_MP_PER_TURN,
  TIER_CAPS,
  hasMaintenance,
  isInterruptible,
  type CastType,
  type Category,
  type Element,
  type Tier,
} from "./taxonomy";

/** Tunable through the balance harness (A8). */
export const POWER_BUDGET_CONFIG = {
  /** Share of the maximum points a neutral spell may spend. */
  budgetShare: 0.5,
  /** Under-budget allocations are raised to this fraction of the budget. */
  floor: 0.85,
  /** Points per field when that field is at its best value. */
  weights: { damage: 40, mp: 20, will: 20, cast: 20, drain: 20, interruption: 10, maintenance: 10 },
  categoryModifier: {
    Attack: 1.0, Defense: 0.8, Regen: 0.9, Debuff: 1.1, Buff: 0.9,
    Drain: 1.2, Environmental: 1.0, Summon: 1.3, Physical: 0.7, Hybrid: 1.2,
  } as Record<Category, number>,
  castTypeModifier: { Instant: 1.0, Trap: 0.95, Charged: 1.05, Continuous: 1.15, Channeled: 1.25 } as Record<CastType, number>,
  /** Allowed slack after rounding; settle() makes allocations exact, so none. */
  roundingTolerance: 1e-6,
};

export type BudgetField = keyof typeof POWER_BUDGET_CONFIG.weights;

export interface FieldSpec {
  field: BudgetField;
  weight: number;
  range: readonly [number, number];
  /** Whether a higher value is better for the caster (costs more points). */
  higherIsBetter: boolean;
}

export interface BudgetSpec {
  tier: Tier;
  element: Element;
  category: Category;
  castType: CastType;
  fields: FieldSpec[];
  maxPoints: number;
  budget: number;
  floorPoints: number;
}

export interface StatAllocation {
  damage_min: number;
  damage_max: number;
  mp_cost: number;
  will_cost_min: number;
  will_cost_max: number;
  cast_time_ms: number;
  drain_ratio: number | null;
  interruption_threshold: number | null;
  maintenance_cost_per_turn: number | null;
}

export interface EnforcementResult {
  allocation: StatAllocation;
  /** True when any value had to be clamped into range. */
  clamped: boolean;
  rescaled: "down" | "up" | null;
  /** True when the model allocation was unusable and the default profile was used (a 2a flag). */
  fallback: boolean;
  reasons: string[];
  pointsSpent: number;
}

export function computeBudgetSpec(input: { tier: Tier; element: Element; category: Category; castType: CastType }): BudgetSpec {
  const { weights, budgetShare, floor, categoryModifier, castTypeModifier } = POWER_BUDGET_CONFIG;
  const caps = TIER_CAPS[input.tier];
  const capTier = input.tier === "Freestyle" ? "Basic" : input.tier;
  const fields: FieldSpec[] = [
    { field: "damage", weight: weights.damage, range: caps.damage, higherIsBetter: true },
    { field: "mp", weight: weights.mp, range: caps.mp, higherIsBetter: false },
    { field: "will", weight: weights.will, range: caps.will, higherIsBetter: false },
    { field: "cast", weight: weights.cast, range: CAST_TIME_MS[input.castType], higherIsBetter: false },
  ];
  if (input.category === "Drain") fields.push({ field: "drain", weight: weights.drain, range: DRAIN_RATIO, higherIsBetter: true });
  if (isInterruptible(input.castType)) {
    fields.push({ field: "interruption", weight: weights.interruption, range: INTERRUPTION_THRESHOLD[capTier], higherIsBetter: true });
  }
  if (hasMaintenance(input.castType)) {
    fields.push({ field: "maintenance", weight: weights.maintenance, range: MAINTENANCE_MP_PER_TURN[capTier], higherIsBetter: false });
  }
  const maxPoints = fields.reduce((sum, f) => sum + f.weight, 0);
  const budget = Math.min(maxPoints, maxPoints * budgetShare * categoryModifier[input.category] * castTypeModifier[input.castType]);
  return { ...input, fields, maxPoints, budget, floorPoints: budget * floor };
}

// ---- goodness: each field's position in its range, 0 = worst, 1 = best ----

type Goodness = Partial<Record<BudgetField, number>>;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function toGoodness(f: FieldSpec, value: number): number {
  const [lo, hi] = f.range;
  const t = (clamp(value, lo, hi) - lo) / (hi - lo);
  return f.higherIsBetter ? t : 1 - t;
}

function fromGoodness(f: FieldSpec, g: number): number {
  const [lo, hi] = f.range;
  const t = f.higherIsBetter ? g : 1 - g;
  return lo + clamp(t, 0, 1) * (hi - lo);
}

function fieldValue(f: BudgetField, a: StatAllocation): number | null {
  switch (f) {
    case "damage":
      return (a.damage_min + a.damage_max) / 2;
    case "mp":
      return a.mp_cost;
    case "will":
      return (a.will_cost_min + a.will_cost_max) / 2;
    case "cast":
      return a.cast_time_ms;
    case "drain":
      return a.drain_ratio;
    case "interruption":
      return a.interruption_threshold;
    case "maintenance":
      return a.maintenance_cost_per_turn;
  }
}

export function pointsSpent(spec: BudgetSpec, allocation: StatAllocation): number {
  let total = 0;
  for (const f of spec.fields) {
    const v = fieldValue(f.field, allocation);
    if (v === null || !Number.isFinite(v)) continue;
    total += f.weight * toGoodness(f, v);
  }
  return total;
}

function spentOf(spec: BudgetSpec, g: Goodness): number {
  return spec.fields.reduce((sum, f) => sum + f.weight * (g[f.field] ?? 0), 0);
}

/** Scales goodness so total points equal `target`, respecting the [0, 1] bound per field. */
function scaleTo(spec: BudgetSpec, g: Goodness, target: number): Goodness {
  const out: Goodness = { ...g };
  for (let round = 0; round < 8; round++) {
    const spent = spentOf(spec, out);
    if (Math.abs(spent - target) < 1e-9) break;
    if (spent > target) {
      const k = target / spent;
      for (const f of spec.fields) out[f.field] = (out[f.field] ?? 0) * k;
      break;
    }
    // Raise only fields that can still grow.
    const growable = spec.fields.filter((f) => (out[f.field] ?? 0) < 1 && (out[f.field] ?? 0) > 0);
    const room = growable.reduce((sum, f) => sum + f.weight * (out[f.field] ?? 0), 0);
    if (room <= 0) {
      // Nothing proportional to raise: spread the gap evenly over open fields.
      const open = spec.fields.filter((f) => (out[f.field] ?? 0) < 1);
      const openWeight = open.reduce((sum, f) => sum + f.weight, 0);
      if (openWeight <= 0) break;
      const add = (target - spent) / openWeight;
      for (const f of open) out[f.field] = Math.min(1, (out[f.field] ?? 0) + add);
      continue;
    }
    const k = 1 + (target - spent) / room;
    for (const f of growable) out[f.field] = Math.min(1, (out[f.field] ?? 0) * k);
  }
  return out;
}

// ---- default allocation (the deterministic fallback profile) ----

/** Relative emphasis per category before scaling to the budget. */
const CATEGORY_PROFILE: Partial<Record<Category, Goodness>> = {
  Attack: { damage: 0.8, mp: 0.4, will: 0.4, cast: 0.5 },
  Defense: { damage: 0.5, mp: 0.6, will: 0.5, cast: 0.7 },
  Regen: { damage: 0.6, mp: 0.4, will: 0.6, cast: 0.5 },
  Debuff: { damage: 0.5, mp: 0.5, will: 0.4, cast: 0.6 },
  Drain: { damage: 0.6, mp: 0.4, will: 0.4, cast: 0.4, drain: 0.6 },
};
const DEFAULT_PROFILE: Goodness = { damage: 0.6, mp: 0.5, will: 0.5, cast: 0.5, drain: 0.5, interruption: 0.5, maintenance: 0.5 };

/** Element tilt on the default profile (Master Doc 4 flavor; tuned via the harness). */
const ELEMENT_TILT: Record<Element, Goodness> = {
  Fire: { damage: 0.15, mp: -0.05 },
  Water: { mp: 0.1, maintenance: 0.1 },
  Wind: { cast: 0.2, damage: -0.05 },
  Earth: { interruption: 0.2, cast: -0.1, will: 0.05 },
  Lightning: { cast: 0.25, mp: -0.1 },
  Void: { will: 0.1, damage: 0.05, mp: -0.05 },
  Arcane: { mp: 0.1, will: 0.05 },
  Light: { will: 0.1, maintenance: 0.1 },
  Shadow: { damage: 0.1, interruption: -0.1 },
  Nature: { mp: 0.1, interruption: 0.05 },
  Frost: { will: 0.1, cast: -0.1, drain: 0.05 },
  Chaos: { damage: 0.2, will: -0.15 },
};

const DAMAGE_SPREAD = 0.25; // default ± around the average, as a fraction of the average

function allocationFromGoodness(spec: BudgetSpec, g: Goodness, spreadOf?: StatAllocation): StatAllocation {
  const field = (name: BudgetField) => spec.fields.find((f) => f.field === name);
  const value = (name: BudgetField) => {
    const f = field(name);
    return f ? fromGoodness(f, g[name] ?? 0) : null;
  };
  const caps = TIER_CAPS[spec.tier];
  const damageAvg = value("damage")!;
  const halfSpread = spreadOf
    ? (spreadOf.damage_max - spreadOf.damage_min) / 2
    : damageAvg * DAMAGE_SPREAD;
  const willAvg = value("will")!;
  const willHalf = spreadOf ? (spreadOf.will_cost_max - spreadOf.will_cost_min) / 2 : 1;
  const span = (avg: number, half: number, [lo, hi]: readonly [number, number]) => {
    const h = Math.min(half, avg - lo, hi - avg);
    return [avg - Math.max(0, h), avg + Math.max(0, h)] as const;
  };
  const [dMin, dMax] = span(damageAvg, halfSpread, caps.damage);
  const [wMin, wMax] = span(willAvg, willHalf, caps.will);
  const drain = value("drain");
  const interruption = value("interruption");
  const maintenance = value("maintenance");
  return {
    damage_min: dMin,
    damage_max: dMax,
    mp_cost: value("mp")!,
    will_cost_min: wMin,
    will_cost_max: wMax,
    cast_time_ms: value("cast")!,
    drain_ratio: drain,
    interruption_threshold: interruption,
    maintenance_cost_per_turn: maintenance,
  };
}

/**
 * Rounds to whole stats (cast time to 10 ms, drain ratio to 0.01), then settles
 * the result back inside the budget and floor.
 */
function roundAllocation(spec: BudgetSpec, a: StatAllocation): StatAllocation {
  const caps = TIER_CAPS[spec.tier];
  const [cMin, cMax] = CAST_TIME_MS[spec.castType];
  const r = {
    damage_min: clamp(Math.round(a.damage_min), caps.damage[0], caps.damage[1]),
    damage_max: clamp(Math.round(a.damage_max), caps.damage[0], caps.damage[1]),
    mp_cost: clamp(Math.round(a.mp_cost), caps.mp[0], caps.mp[1]),
    will_cost_min: clamp(Math.round(a.will_cost_min), caps.will[0], caps.will[1]),
    will_cost_max: clamp(Math.round(a.will_cost_max), caps.will[0], caps.will[1]),
    cast_time_ms: clamp(Math.round(a.cast_time_ms / 10) * 10, cMin, cMax),
    drain_ratio: a.drain_ratio === null ? null : Math.round(a.drain_ratio * 100) / 100,
    interruption_threshold: a.interruption_threshold === null ? null : Math.round(a.interruption_threshold),
    maintenance_cost_per_turn: a.maintenance_cost_per_turn === null ? null : Math.round(a.maintenance_cost_per_turn),
  };
  if (r.damage_min > r.damage_max) r.damage_min = r.damage_max;
  if (r.will_cost_min > r.will_cost_max) r.will_cost_min = r.will_cost_max;
  return settle(spec, r);
}

/**
 * One whole-unit move of a field, toward the caster's advantage (+1) or
 * disadvantage (-1). Returns null when the field cannot move that way.
 */
function step(spec: BudgetSpec, field: BudgetField, a: StatAllocation, dir: 1 | -1): StatAllocation | null {
  const caps = TIER_CAPS[spec.tier];
  const range = spec.fields.find((f) => f.field === field)?.range;
  if (!range) return null;
  const n = { ...a };
  const within = (v: number, [lo, hi]: readonly [number, number]) => v >= lo - 1e-9 && v <= hi + 1e-9;
  switch (field) {
    case "damage":
      if (dir < 0) {
        if (n.damage_max > n.damage_min) n.damage_max -= 1;
        else if (n.damage_min > caps.damage[0]) (n.damage_min -= 1), (n.damage_max -= 1);
        else return null;
      } else {
        if (n.damage_min < n.damage_max) n.damage_min += 1;
        else if (n.damage_max < caps.damage[1]) (n.damage_min += 1), (n.damage_max += 1);
        else return null;
      }
      return n;
    case "will":
      if (dir < 0) {
        if (n.will_cost_min < n.will_cost_max) n.will_cost_min += 1;
        else if (n.will_cost_max < caps.will[1]) (n.will_cost_min += 1), (n.will_cost_max += 1);
        else return null;
      } else {
        if (n.will_cost_max > n.will_cost_min) n.will_cost_max -= 1;
        else if (n.will_cost_min > caps.will[0]) (n.will_cost_min -= 1), (n.will_cost_max -= 1);
        else return null;
      }
      return n;
    case "mp":
      n.mp_cost -= dir;
      return within(n.mp_cost, range) ? n : null;
    case "cast":
      n.cast_time_ms -= dir * 10;
      return within(n.cast_time_ms, range) ? n : null;
    case "drain":
      n.drain_ratio = Math.round(((n.drain_ratio ?? 0) + dir * 0.01) * 100) / 100;
      return within(n.drain_ratio, range) ? n : null;
    case "interruption":
      n.interruption_threshold = (n.interruption_threshold ?? 0) + dir;
      return within(n.interruption_threshold, range) ? n : null;
    case "maintenance":
      n.maintenance_cost_per_turn = (n.maintenance_cost_per_turn ?? 0) - dir;
      return within(n.maintenance_cost_per_turn, range) ? n : null;
  }
}

/**
 * Rounding to whole units can leave an allocation slightly over the budget or
 * under the floor. Moves single units until it is inside, preferring the
 * smallest move that fixes it.
 */
function settle(spec: BudgetSpec, start: StatAllocation): StatAllocation {
  let a = start;
  for (let i = 0; i < 400; i++) {
    const spent = pointsSpent(spec, a);
    const dir: 1 | -1 | 0 = spent > spec.budget + 1e-9 ? -1 : spent < spec.floorPoints - 1e-9 ? 1 : 0;
    if (dir === 0) return a;
    const moves = spec.fields
      .map((f) => step(spec, f.field, a, dir))
      .filter((m): m is StatAllocation => m !== null)
      .map((m) => ({ m, spent: pointsSpent(spec, m) }))
      // Never cross the opposite bound while fixing this one.
      .filter((x) => (dir < 0 ? x.spent >= spec.floorPoints - 1e-9 || x.spent < spent : x.spent <= spec.budget + 1e-9));
    if (!moves.length) return a;
    const fixes = moves.filter((x) => (dir < 0 ? x.spent <= spec.budget + 1e-9 : x.spent >= spec.floorPoints - 1e-9));
    const pool = fixes.length ? fixes : moves;
    pool.sort((x, y) => (dir < 0 ? y.spent - x.spent : x.spent - y.spent));
    a = pool[0].m;
  }
  return a;
}

export function defaultAllocation(spec: BudgetSpec): StatAllocation {
  const base = { ...DEFAULT_PROFILE, ...(CATEGORY_PROFILE[spec.category] ?? {}) };
  const tilt = ELEMENT_TILT[spec.element] ?? {};
  const g: Goodness = {};
  for (const f of spec.fields) g[f.field] = clamp((base[f.field] ?? 0.5) + (tilt[f.field] ?? 0), 0.05, 1);
  return roundAllocation(spec, allocationFromGoodness(spec, scaleTo(spec, g, spec.budget)));
}

// ---- Layer 2a: enforce a model allocation ----

const NUM = (v: unknown): number | null => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Reads a model allocation leniently; null when a required field is missing or not a number. */
export function parseAllocation(spec: BudgetSpec, raw: unknown): StatAllocation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const damageMin = NUM(o.damage_min);
  const damageMax = NUM(o.damage_max);
  const mp = NUM(o.mp_cost);
  const willMin = NUM(o.will_cost_min ?? o.will_cost);
  const willMax = NUM(o.will_cost_max ?? o.will_cost);
  const cast = NUM(o.cast_time_ms);
  if ([damageMin, damageMax, mp, willMin, willMax, cast].some((v) => v === null)) return null;
  const has = (f: BudgetField) => spec.fields.some((x) => x.field === f);
  const optional = (f: BudgetField, key: string) => {
    if (!has(f)) return null;
    const v = NUM(o[key]);
    return v === null ? Number.NaN : v;
  };
  const allocation: StatAllocation = {
    damage_min: Math.min(damageMin!, damageMax!),
    damage_max: Math.max(damageMin!, damageMax!),
    mp_cost: mp!,
    will_cost_min: Math.min(willMin!, willMax!),
    will_cost_max: Math.max(willMin!, willMax!),
    cast_time_ms: cast!,
    drain_ratio: optional("drain", "drain_ratio"),
    interruption_threshold: optional("interruption", "interruption_threshold"),
    maintenance_cost_per_turn: optional("maintenance", "maintenance_cost_per_turn"),
  };
  if (Object.values(allocation).some((v) => typeof v === "number" && Number.isNaN(v))) return null;
  return allocation;
}

function clampAllocation(spec: BudgetSpec, a: StatAllocation): { allocation: StatAllocation; clamped: boolean } {
  const caps = TIER_CAPS[spec.tier];
  const range = (f: BudgetField) => spec.fields.find((x) => x.field === f)?.range;
  let clamped = false;
  const c = (v: number, r: readonly [number, number]) => {
    const out = clamp(v, r[0], r[1]);
    if (out !== v) clamped = true;
    return out;
  };
  const optional = (v: number | null, f: BudgetField) => {
    const r = range(f);
    return r && v !== null ? c(v, r) : null;
  };
  const allocation: StatAllocation = {
    damage_min: c(a.damage_min, caps.damage),
    damage_max: c(a.damage_max, caps.damage),
    mp_cost: c(a.mp_cost, caps.mp),
    will_cost_min: c(a.will_cost_min, caps.will),
    will_cost_max: c(a.will_cost_max, caps.will),
    cast_time_ms: c(a.cast_time_ms, CAST_TIME_MS[spec.castType]),
    drain_ratio: optional(a.drain_ratio, "drain"),
    interruption_threshold: optional(a.interruption_threshold, "interruption"),
    maintenance_cost_per_turn: optional(a.maintenance_cost_per_turn, "maintenance"),
  };
  return { allocation, clamped };
}

/**
 * Layer 2a for stats: clamp to ranges and caps, rescale an over-budget
 * allocation down, raise one below the floor, fall back to the default profile
 * when the allocation is malformed.
 */
export function enforceAllocation(spec: BudgetSpec, raw: unknown): EnforcementResult {
  const parsed = parseAllocation(spec, raw);
  if (!parsed) {
    const allocation = defaultAllocation(spec);
    return { allocation, clamped: false, rescaled: null, fallback: true, reasons: ["malformed_allocation"], pointsSpent: pointsSpent(spec, allocation) };
  }
  const reasons: string[] = [];
  const { allocation: clampedAlloc, clamped } = clampAllocation(spec, parsed);
  if (clamped) reasons.push("clamped_to_caps");

  const g: Goodness = {};
  for (const f of spec.fields) g[f.field] = toGoodness(f, fieldValue(f.field, clampedAlloc) ?? 0);
  const spent = spentOf(spec, g);

  let rescaled: EnforcementResult["rescaled"] = null;
  let target: number | null = null;
  if (spent > spec.budget) {
    rescaled = "down";
    target = spec.budget;
    reasons.push("over_budget");
  } else if (spent < spec.floorPoints) {
    if (spent <= 0) {
      const allocation = defaultAllocation(spec);
      return { allocation, clamped, rescaled: null, fallback: true, reasons: [...reasons, "zero_allocation"], pointsSpent: pointsSpent(spec, allocation) };
    }
    rescaled = "up";
    target = spec.floorPoints;
    reasons.push("under_floor");
  }

  const finalAlloc =
    target === null ? clampedAlloc : allocationFromGoodness(spec, scaleTo(spec, g, target), clampedAlloc);
  const allocation = roundAllocation(spec, finalAlloc);
  return { allocation, clamped, rescaled, fallback: false, reasons, pointsSpent: pointsSpent(spec, allocation) };
}

/** The ranges the Layer 1 prompt hands the model. */
export function allocationPromptFields(spec: BudgetSpec): Record<string, { min: number; max: number; better: "higher" | "lower" }> {
  const caps = TIER_CAPS[spec.tier];
  const out: Record<string, { min: number; max: number; better: "higher" | "lower" }> = {
    damage_min: { min: caps.damage[0], max: caps.damage[1], better: "higher" },
    damage_max: { min: caps.damage[0], max: caps.damage[1], better: "higher" },
    mp_cost: { min: caps.mp[0], max: caps.mp[1], better: "lower" },
    will_cost_min: { min: caps.will[0], max: caps.will[1], better: "lower" },
    will_cost_max: { min: caps.will[0], max: caps.will[1], better: "lower" },
    cast_time_ms: { min: CAST_TIME_MS[spec.castType][0], max: CAST_TIME_MS[spec.castType][1], better: "lower" },
  };
  for (const f of spec.fields) {
    if (f.field === "drain") out.drain_ratio = { min: f.range[0], max: f.range[1], better: "higher" };
    if (f.field === "interruption") out.interruption_threshold = { min: f.range[0], max: f.range[1], better: "higher" };
    if (f.field === "maintenance") out.maintenance_cost_per_turn = { min: f.range[0], max: f.range[1], better: "lower" };
  }
  return out;
}
