import { describe, it, expect } from "vitest";
import { computeSpellStats, powerBudgetBreakdown } from "./power-budget";
import { SPELL_CAPS } from "../shared/constants";

const ELEMENTS = ["Fire", "Water", "Earth", "Wind"];
const CATEGORIES = ["Attack", "Defense", "Regen", "Debuff"];

describe("computeSpellStats", () => {
  it("returns deterministic results for every Phase 0 combination", () => {
    for (const element of ELEMENTS) {
      for (const category of CATEGORIES) {
        const a = computeSpellStats(element, category, "Instant", "Basic");
        const b = computeSpellStats(element, category, "Instant", "Basic");
        expect(a).toEqual(b);
      }
    }
  });

  it("respects the damage cap by tier", () => {
    for (const category of CATEGORIES) {
      const stats = computeSpellStats("Fire", category, "Instant", "Basic");
      expect(stats.damage_min).toBeGreaterThanOrEqual(SPELL_CAPS.Basic.damage[0]);
      expect(stats.damage_max).toBeLessThanOrEqual(SPELL_CAPS.Basic.damage[1]);
    }
  });

  it("respects the mp cost cap", () => {
    for (const category of CATEGORIES) {
      const stats = computeSpellStats("Water", category, "Instant", "Basic");
      expect(stats.mp_cost).toBeGreaterThanOrEqual(SPELL_CAPS.Basic.mp[0]);
      expect(stats.mp_cost).toBeLessThanOrEqual(SPELL_CAPS.Basic.mp[1]);
    }
  });

  it("respects the will cost cap", () => {
    for (const category of CATEGORIES) {
      const stats = computeSpellStats("Wind", category, "Instant", "Basic");
      expect(stats.will_cost_min).toBeGreaterThanOrEqual(SPELL_CAPS.Basic.will[0]);
      expect(stats.will_cost_max).toBeLessThanOrEqual(SPELL_CAPS.Basic.will[1]);
    }
  });

  it("respects cast time caps", () => {
    for (const category of CATEGORIES) {
      const stats = computeSpellStats("Earth", category, "Instant", "Basic");
      expect(stats.cast_time_ms).toBeGreaterThanOrEqual(SPELL_CAPS.Basic.castTimeMs[0]);
      expect(stats.cast_time_ms).toBeLessThanOrEqual(SPELL_CAPS.Basic.castTimeMs[1]);
    }
  });

  it("produces archetype-appropriate profiles", () => {
    const attack = computeSpellStats("Fire", "Attack", "Instant", "Basic");
    const defense = computeSpellStats("Earth", "Defense", "Instant", "Basic");

    // Attack spells deal more damage than defensive ones
    expect(attack.damage_max).toBeGreaterThan(defense.damage_max);
    // Defensive spells are harder to interrupt
    expect(defense.interruption_threshold ?? 0).toBeGreaterThan(attack.interruption_threshold ?? 0);
  });

  it("applies elemental shifts differently per element", () => {
    const fire = computeSpellStats("Fire", "Attack", "Instant", "Basic");
    const water = computeSpellStats("Water", "Attack", "Instant", "Basic");
    // Fire boosts damage_max; Water reduces it
    expect(fire.damage_max).toBeGreaterThanOrEqual(water.damage_max);
  });

  it("supports the Regen archetype with maintenance costs", () => {
    const regen = computeSpellStats("Water", "Regen", "Instant", "Basic");
    expect(regen.maintenance_cost_per_turn).not.toBeNull();
    expect(regen.damage_max).toBeLessThanOrEqual(30);
  });

  it("always keeps damage_min <= damage_max", () => {
    for (const element of ELEMENTS) {
      for (const category of CATEGORIES) {
        const stats = computeSpellStats(element, category, "Instant", "Basic");
        expect(stats.damage_min).toBeLessThanOrEqual(stats.damage_max);
      }
    }
  });

  it("exposes the power budget breakdown", () => {
    const { stats, budgetNotes } = powerBudgetBreakdown("Fire", "Attack", "Instant", "Basic");
    expect(stats.pb_total).toBe(100);
    expect(budgetNotes.archetype).toBe("Attack");
    expect(budgetNotes.category_modifier).toBe("1.00");
    expect(budgetNotes.cast_type_modifier).toBe("1.00");
  });
});