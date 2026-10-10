// Spell taxonomy and hard caps (Master Doc 4, 5.1, 5.2, 6.2). The engine and
// validation support the full taxonomy; CREATION_ENABLED is what the creation
// form exposes right now (Build Plan v2.2 Section 2.3).

export const ELEMENTS = [
  "Fire", "Water", "Wind", "Earth", // Primal
  "Lightning", "Void", "Arcane", "Light", // Ethereal
  "Shadow", "Nature", "Frost", "Chaos", // Boundary
] as const;

export const CATEGORIES = [
  "Attack", "Defense", "Regen", "Debuff", "Buff",
  "Drain", "Environmental", "Summon", "Physical", "Hybrid",
] as const;

export const CAST_TYPES = ["Instant", "Trap", "Charged", "Continuous", "Channeled"] as const;

export const TIERS = ["Basic", "Advanced", "Mega", "Freestyle"] as const;

export type Element = (typeof ELEMENTS)[number];
export type Category = (typeof CATEGORIES)[number];
export type CastType = (typeof CAST_TYPES)[number];
export type Tier = (typeof TIERS)[number];

/** Temporary 1a subset: Trap and Charged return with battles (founder decision G1). */
export const CREATION_ENABLED = {
  elements: ELEMENTS,
  categories: ["Attack", "Defense", "Regen", "Debuff", "Drain"] as const satisfies readonly Category[],
  castTypes: ["Instant"] as const satisfies readonly CastType[],
  /** Player-created spells are Basic until progression ships. Tier never comes from the model. */
  tier: "Basic" as const satisfies Tier,
};

export type CreationCategory = (typeof CREATION_ENABLED.categories)[number];
export type CreationCastType = (typeof CREATION_ENABLED.castTypes)[number];

type Range = readonly [number, number];

/** Master Doc 6.2 hard caps. */
export const TIER_CAPS: Record<Tier, { damage: Range; mp: Range; will: Range }> = {
  Basic: { damage: [10, 40], mp: [8, 20], will: [10, 25] },
  Advanced: { damage: [35, 90], mp: [20, 45], will: [28, 65] },
  Mega: { damage: [80, 200], mp: [40, 80], will: [65, 130] },
  Freestyle: { damage: [5, 50], mp: [13, 17], will: [13, 32] },
};

/** Master Doc 5.2 cast time per cast type (ms). Phase0 used 800 to 1200 for Instant; the doc wins. */
export const CAST_TIME_MS: Record<CastType, Range> = {
  Instant: [200, 800],
  Trap: [500, 1000],
  Charged: [1500, 3000],
  Continuous: [300, 600],
  Channeled: [1500, 2500],
};

/** Master Doc 5.2 interruption thresholds; only Charged, Continuous and Channeled can be interrupted. */
export const INTERRUPTION_THRESHOLD: Record<Exclude<Tier, "Freestyle">, Range> = {
  Basic: [15, 25],
  Advanced: [25, 40],
  Mega: [40, 60],
};

export function isInterruptible(castType: CastType): boolean {
  return castType === "Charged" || castType === "Continuous" || castType === "Channeled";
}

export function hasMaintenance(castType: CastType): boolean {
  return castType === "Continuous" || castType === "Channeled";
}

/**
 * Not specified numerically in the Master Doc; config values, tuned through the
 * balance harness. Drain return ratio is a spell stat (Master Doc 5.1).
 */
export const DRAIN_RATIO: Range = [0.1, 0.5];
export const MAINTENANCE_MP_PER_TURN: Record<Exclude<Tier, "Freestyle">, Range> = {
  Basic: [2, 6],
  Advanced: [5, 12],
  Mega: [10, 20],
};

/** Qualitative Will cost shown in the spell detail view (Master Doc 2.1). Never a number. */
export type Strain = "light" | "moderate" | "heavy";

/** Cut points over the tier's floor-to-cap span (Master Doc 6.2); tuned via the harness. */
export function strainOf(tier: Tier, willCostAvg: number): Strain {
  const [floor, cap] = TIER_CAPS[tier].will;
  const t = (willCostAvg - floor) / Math.max(1, cap - floor);
  if (t < 1 / 3) return "light";
  if (t < 2 / 3) return "moderate";
  return "heavy";
}

/** Element tints for placeholders only; real cards take their accent from the art (Build Plan 7.6). */
export const ELEMENT_COLORS: Record<Element, { accent: string; dark: string }> = {
  Fire: { accent: "#d4713a", dark: "#3a1d0d" },
  Water: { accent: "#6da2c9", dark: "#0d1d33" },
  Wind: { accent: "#a8b8c8", dark: "#141c26" },
  Earth: { accent: "#6e9a5f", dark: "#1a2410" },
  Lightning: { accent: "#d8c46a", dark: "#2a240c" },
  Void: { accent: "#7a6fb0", dark: "#120f22" },
  Arcane: { accent: "#9b7fd9", dark: "#1b1230" },
  Light: { accent: "#e8d9a0", dark: "#2a2412" },
  Shadow: { accent: "#6b6880", dark: "#0c0b12" },
  Nature: { accent: "#7fb069", dark: "#14220f" },
  Frost: { accent: "#9fd3e6", dark: "#0e1e26" },
  Chaos: { accent: "#c0476b", dark: "#260b14" },
};
