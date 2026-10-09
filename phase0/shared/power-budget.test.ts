import { describe, it, expect } from "vitest";
import {
  computeBudgetSpec,
  defaultAllocation,
  enforceAllocation,
  pointsSpent,
  POWER_BUDGET_CONFIG,
  type BudgetSpec,
  type StatAllocation,
} from "./power-budget";
import {
  CAST_TIME_MS,
  CAST_TYPES,
  CATEGORIES,
  CREATION_ENABLED,
  ELEMENTS,
  TIER_CAPS,
  TIERS,
  strainOf,
} from "./taxonomy";

// Small seeded PRNG so property runs are reproducible.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function assertInvariants(spec: BudgetSpec, a: StatAllocation) {
  const caps = TIER_CAPS[spec.tier];
  const tol = POWER_BUDGET_CONFIG.roundingTolerance;
  expect(a.damage_min).toBeGreaterThanOrEqual(caps.damage[0]);
  expect(a.damage_max).toBeLessThanOrEqual(caps.damage[1]);
  expect(a.damage_min).toBeLessThanOrEqual(a.damage_max);
  expect(a.mp_cost).toBeGreaterThanOrEqual(caps.mp[0]);
  expect(a.mp_cost).toBeLessThanOrEqual(caps.mp[1]);
  expect(a.will_cost_min).toBeGreaterThanOrEqual(caps.will[0]);
  expect(a.will_cost_max).toBeLessThanOrEqual(caps.will[1]);
  expect(a.will_cost_min).toBeLessThanOrEqual(a.will_cost_max);
  const [cMin, cMax] = CAST_TIME_MS[spec.castType];
  expect(a.cast_time_ms).toBeGreaterThanOrEqual(cMin);
  expect(a.cast_time_ms).toBeLessThanOrEqual(cMax);
  for (const f of spec.fields) {
    const v =
      f.field === "drain" ? a.drain_ratio : f.field === "interruption" ? a.interruption_threshold : f.field === "maintenance" ? a.maintenance_cost_per_turn : 0;
    if (f.field === "drain" || f.field === "interruption" || f.field === "maintenance") {
      expect(v).not.toBeNull();
      expect(v!).toBeGreaterThanOrEqual(f.range[0]);
      expect(v!).toBeLessThanOrEqual(f.range[1]);
    }
  }
  if (!spec.fields.some((f) => f.field === "drain")) expect(a.drain_ratio).toBeNull();
  if (!spec.fields.some((f) => f.field === "interruption")) expect(a.interruption_threshold).toBeNull();
  const spent = pointsSpent(spec, a);
  expect(spent).toBeLessThanOrEqual(spec.budget + tol);
  expect(spent).toBeGreaterThanOrEqual(spec.floorPoints - tol);
}

function adversarial(r: () => number): unknown {
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const wild = () => pick<unknown>([r() * 400 - 100, -1e9, 1e9, 0, Number.NaN, "17", "abc", null, undefined, Infinity, r() * 50]);
  return {
    damage_min: wild(),
    damage_max: wild(),
    mp_cost: wild(),
    will_cost_min: wild(),
    will_cost_max: wild(),
    cast_time_ms: wild(),
    drain_ratio: wild(),
    interruption_threshold: wild(),
    maintenance_cost_per_turn: wild(),
  };
}

function plausible(spec: BudgetSpec, r: () => number): unknown {
  const caps = TIER_CAPS[spec.tier];
  const within = ([lo, hi]: readonly [number, number]) => lo + r() * (hi - lo);
  const d1 = within(caps.damage);
  const d2 = within(caps.damage);
  return {
    damage_min: Math.round(Math.min(d1, d2)),
    damage_max: Math.round(Math.max(d1, d2)),
    mp_cost: Math.round(within(caps.mp)),
    will_cost_min: Math.round(within(caps.will)),
    will_cost_max: Math.round(within(caps.will)),
    cast_time_ms: Math.round(within(CAST_TIME_MS[spec.castType])),
    drain_ratio: r(),
    interruption_threshold: 20,
    maintenance_cost_per_turn: 4,
  };
}

describe("power budget spec", () => {
  it("budget never exceeds the maximum points and the floor is 85 percent", () => {
    for (const tier of TIERS)
      for (const category of CATEGORIES)
        for (const castType of CAST_TYPES) {
          const spec = computeBudgetSpec({ tier, element: "Fire", category, castType });
          expect(spec.budget).toBeLessThanOrEqual(spec.maxPoints);
          expect(spec.floorPoints).toBeCloseTo(spec.budget * POWER_BUDGET_CONFIG.floor);
        }
  });

  it("the default profile satisfies every invariant for the full taxonomy", () => {
    for (const tier of TIERS)
      for (const element of ELEMENTS)
        for (const category of CATEGORIES)
          for (const castType of CAST_TYPES) {
            const spec = computeBudgetSpec({ tier, element, category, castType });
            assertInvariants(spec, defaultAllocation(spec));
          }
  });
});

describe("Layer 2a enforcement (property)", () => {
  it("no allocation, including adversarial ones, escapes ranges, caps, floor or budget", () => {
    const r = rng(20261010);
    let runs = 0;
    for (const tier of TIERS)
      for (const element of ELEMENTS)
        for (const category of CATEGORIES)
          for (const castType of CAST_TYPES) {
            const spec = computeBudgetSpec({ tier, element, category, castType });
            for (let i = 0; i < 6; i++) {
              const raw = i % 2 ? adversarial(r) : plausible(spec, r);
              const result = enforceAllocation(spec, raw);
              assertInvariants(spec, result.allocation);
              runs++;
            }
          }
    expect(runs).toBe(TIERS.length * ELEMENTS.length * CATEGORIES.length * CAST_TYPES.length * 6);
  });

  it("malformed allocations fall back to the default profile and flag 2a", () => {
    const spec = computeBudgetSpec({ tier: "Basic", element: "Fire", category: "Attack", castType: "Instant" });
    for (const raw of [null, "x", {}, { damage_min: "lots" }, { damage_min: 10, damage_max: 20 }]) {
      const result = enforceAllocation(spec, raw);
      expect(result.fallback).toBe(true);
      expect(result.allocation).toEqual(defaultAllocation(spec));
    }
  });

  it("a Drain spell without a drain ratio is malformed", () => {
    const spec = computeBudgetSpec({ tier: "Basic", element: "Shadow", category: "Drain", castType: "Instant" });
    const result = enforceAllocation(spec, { damage_min: 15, damage_max: 25, mp_cost: 12, will_cost_min: 15, will_cost_max: 17, cast_time_ms: 500 });
    expect(result.fallback).toBe(true);
  });

  it("scales an everything-maxed allocation down to the budget", () => {
    const spec = computeBudgetSpec({ tier: "Basic", element: "Fire", category: "Attack", castType: "Instant" });
    const result = enforceAllocation(spec, { damage_min: 40, damage_max: 40, mp_cost: 8, will_cost_min: 10, will_cost_max: 10, cast_time_ms: 200 });
    expect(result.rescaled).toBe("down");
    expect(result.pointsSpent).toBeLessThanOrEqual(spec.budget + POWER_BUDGET_CONFIG.roundingTolerance);
  });

  it("raises a too-weak allocation to the floor", () => {
    const spec = computeBudgetSpec({ tier: "Basic", element: "Fire", category: "Attack", castType: "Instant" });
    const result = enforceAllocation(spec, { damage_min: 11, damage_max: 12, mp_cost: 19, will_cost_min: 24, will_cost_max: 25, cast_time_ms: 790 });
    expect(result.rescaled).toBe("up");
    expect(result.pointsSpent).toBeGreaterThanOrEqual(spec.floorPoints - POWER_BUDGET_CONFIG.roundingTolerance);
  });

  it("two spells with the same classification can differ mechanically", () => {
    const spec = computeBudgetSpec({ tier: "Basic", element: "Fire", category: "Attack", castType: "Instant" });
    // A slow, heavy blast versus a cheap, quick flick, both inside the budget.
    const heavy = enforceAllocation(spec, { damage_min: 30, damage_max: 38, mp_cost: 18, will_cost_min: 20, will_cost_max: 22, cast_time_ms: 780 });
    const quick = enforceAllocation(spec, { damage_min: 12, damage_max: 16, mp_cost: 10, will_cost_min: 14, will_cost_max: 15, cast_time_ms: 250 });
    expect(heavy.fallback || quick.fallback).toBe(false);
    expect(heavy.allocation.damage_max).toBeGreaterThan(quick.allocation.damage_max);
    expect(heavy.allocation.cast_time_ms).toBeGreaterThan(quick.allocation.cast_time_ms);
    expect(heavy.allocation.mp_cost).toBeGreaterThan(quick.allocation.mp_cost);
  });

  it("the creation subset is all 12 elements, five categories, Instant only", () => {
    expect(CREATION_ENABLED.elements).toHaveLength(12);
    expect([...CREATION_ENABLED.categories]).toEqual(["Attack", "Defense", "Regen", "Debuff", "Drain"]);
    expect([...CREATION_ENABLED.castTypes]).toEqual(["Instant"]);
  });

  it("strain descriptor spans light, moderate, heavy over the tier's Will span", () => {
    expect(strainOf("Basic", 10)).toBe("light");
    expect(strainOf("Basic", 17)).toBe("moderate");
    expect(strainOf("Basic", 25)).toBe("heavy");
  });
});
