/**
 * ARCANIS Shared Constants
 * All game mechanics, elements, avatars, and validation rules
 */

// ============================================================================
// ELEMENTS & AMICABILITY
// ============================================================================

export const ELEMENTS = {
  PRIMAL: ["Fire", "Water", "Wind", "Earth"],
  ETHEREAL: ["Lightning", "Void", "Arcane", "Light"],
  BOUNDARY: ["Shadow", "Nature", "Frost", "Chaos"],
} as const;

export const ALL_ELEMENTS = [
  ...ELEMENTS.PRIMAL,
  ...ELEMENTS.ETHEREAL,
  ...ELEMENTS.BOUNDARY,
] as const;

export type ElementType = (typeof ALL_ELEMENTS)[number];

export type TierType = (typeof SPELL_TIERS)[number];
export type CastType = (typeof CAST_TYPES)[number];
export type CategoryType = (typeof SPELL_CATEGORIES)[number];
export type AvatarType = (typeof AVATARS)[number];

export const ELEMENT_COLORS: Record<ElementType, string> = {
  Fire: "#ff6b35",
  Water: "#0077be",
  Wind: "#a8dadc",
  Earth: "#8b7355",
  Lightning: "#ffd60a",
  Void: "#2a0845",
  Arcane: "#7209b7",
  Light: "#f1faee",
  Shadow: "#1a1a2e",
  Nature: "#06a77d",
  Frost: "#4ecdc4",
  Chaos: "#ff006e",
};

export const ELEMENT_ICONS: Record<ElementType, string> = {
  Fire: "🔥",
  Water: "💧",
  Wind: "💨",
  Earth: "🪨",
  Lightning: "⚡",
  Void: "⚫",
  Arcane: "✨",
  Light: "☀️",
  Shadow: "🌑",
  Nature: "🌿",
  Frost: "❄️",
  Chaos: "🌀",
};

export const TIER_COLORS: Record<TierType, string> = {
  Basic: "border-blue-500",
  Advanced: "border-purple-500",
  Mega: "border-red-500",
};

// Amicability table: element -> { strong, neutral, tension, conflict }
export const AMICABILITY: Record<
  ElementType,
  {
    strong: ElementType[];
    neutral: ElementType[];
    tension: ElementType[];
    conflict: ElementType[];
  }
> = {
  Fire: {
    strong: ["Wind", "Light"],
    neutral: ["Lightning", "Chaos"],
    tension: ["Frost", "Earth"],
    conflict: ["Water", "Shadow"],
  },
  Water: {
    strong: ["Frost", "Nature"],
    neutral: ["Earth", "Void"],
    tension: ["Lightning"],
    conflict: ["Fire", "Chaos"],
  },
  Wind: {
    strong: ["Fire", "Lightning"],
    neutral: ["Arcane"],
    tension: ["Earth"],
    conflict: ["Water"],
  },
  Earth: {
    strong: ["Nature", "Frost"],
    neutral: ["Water", "Shadow"],
    tension: ["Fire"],
    conflict: ["Wind", "Lightning"],
  },
  Lightning: {
    strong: ["Wind", "Arcane"],
    neutral: ["Fire", "Light"],
    tension: ["Water", "Nature"],
    conflict: ["Earth"],
  },
  Void: {
    strong: ["Shadow", "Arcane"],
    neutral: ["Frost"],
    tension: ["Wind", "Light"],
    conflict: ["Fire", "Water", "Lightning"],
  },
  Arcane: {
    strong: ["Light"],
    neutral: ["Fire", "Nature"],
    tension: ["Shadow"],
    conflict: ["Lightning", "Void"],
  },
  Light: {
    strong: ["Fire", "Arcane"],
    neutral: ["Nature", "Wind"],
    tension: ["Shadow"],
    conflict: ["Void", "Chaos"],
  },
  Shadow: {
    strong: ["Void", "Chaos"],
    neutral: ["Earth", "Frost"],
    tension: ["Light", "Nature"],
    conflict: ["Fire", "Arcane"],
  },
  Nature: {
    strong: ["Water", "Earth"],
    neutral: ["Light"],
    tension: ["Shadow", "Fire"],
    conflict: ["Lightning", "Chaos"],
  },
  Frost: {
    strong: ["Water", "Earth"],
    neutral: ["Shadow", "Void"],
    tension: ["Fire", "Wind"],
    conflict: ["Lightning", "Chaos"],
  },
  Chaos: {
    strong: ["Shadow", "Fire"],
    neutral: ["Lightning"],
    tension: ["Arcane", "Nature"],
    conflict: ["Water", "Light", "Frost"],
  },
};

// ============================================================================
// AVATARS
// ============================================================================

export const AVATARS = [
  "ashen",
  "emberveil",
  "tidecaller",
  "galeborn",
  "stonewarden",
  "voidwalker",
  "dawnbringer",
  "chaosborn",
] as const;


export const AVATAR_STATS: Record<
  AvatarType,
  {
    hp: number;
    mp: number;
    willCap: number;
    affinityBonus: Record<ElementType, number>;
    description: string;
  }
> = {
  ashen: {
    hp: 100,
    mp: 100,
    willCap: 100,
    affinityBonus: {
      Fire: 1.03,
      Water: 1.03,
      Wind: 1.03,
      Earth: 1.03,
      Lightning: 1.03,
      Void: 1.03,
      Arcane: 1.03,
      Light: 1.03,
      Shadow: 1.03,
      Nature: 1.03,
      Frost: 1.03,
      Chaos: 1.03,
    },
    description: "Balanced across all elements",
  },
  emberveil: {
    hp: 90,
    mp: 110,
    willCap: 100,
    affinityBonus: {
      Fire: 1.25,
      Water: 1.0,
      Wind: 1.0,
      Earth: 1.0,
      Lightning: 1.0,
      Void: 1.0,
      Arcane: 1.0,
      Light: 1.0,
      Shadow: 1.0,
      Nature: 1.0,
      Frost: 1.0,
      Chaos: 1.0,
    },
    description: "Fire affinity specialist",
  },
  tidecaller: {
    hp: 95,
    mp: 120,
    willCap: 95,
    affinityBonus: {
      Fire: 1.0,
      Water: 1.25,
      Wind: 1.0,
      Earth: 1.0,
      Lightning: 1.0,
      Void: 1.0,
      Arcane: 1.0,
      Light: 1.0,
      Shadow: 1.0,
      Nature: 1.0,
      Frost: 1.0,
      Chaos: 1.0,
    },
    description: "Water affinity specialist",
  },
  galeborn: {
    hp: 85,
    mp: 105,
    willCap: 115,
    affinityBonus: {
      Fire: 1.0,
      Water: 1.0,
      Wind: 1.25,
      Earth: 1.0,
      Lightning: 1.0,
      Void: 1.0,
      Arcane: 1.0,
      Light: 1.0,
      Shadow: 1.0,
      Nature: 1.0,
      Frost: 1.0,
      Chaos: 1.0,
    },
    description: "Wind affinity specialist",
  },
  stonewarden: {
    hp: 120,
    mp: 90,
    willCap: 95,
    affinityBonus: {
      Fire: 1.0,
      Water: 1.0,
      Wind: 1.0,
      Earth: 1.25,
      Lightning: 1.0,
      Void: 1.0,
      Arcane: 1.0,
      Light: 1.0,
      Shadow: 1.0,
      Nature: 1.0,
      Frost: 1.0,
      Chaos: 1.0,
    },
    description: "Earth affinity specialist",
  },
  voidwalker: {
    hp: 80,
    mp: 115,
    willCap: 120,
    affinityBonus: {
      Fire: 1.0,
      Water: 1.0,
      Wind: 1.0,
      Earth: 1.0,
      Lightning: 1.0,
      Void: 1.2,
      Arcane: 1.0,
      Light: 1.0,
      Shadow: 1.15,
      Nature: 1.0,
      Frost: 1.0,
      Chaos: 1.0,
    },
    description: "Void and Shadow affinity specialist",
  },
  dawnbringer: {
    hp: 90,
    mp: 110,
    willCap: 125,
    affinityBonus: {
      Fire: 1.0,
      Water: 1.0,
      Wind: 1.0,
      Earth: 1.0,
      Lightning: 1.0,
      Void: 1.0,
      Arcane: 1.15,
      Light: 1.2,
      Shadow: 1.0,
      Nature: 1.0,
      Frost: 1.0,
      Chaos: 1.0,
    },
    description: "Light and Arcane affinity specialist",
  },
  chaosborn: {
    hp: 95,
    mp: 105,
    willCap: 110,
    affinityBonus: {
      Fire: 1.0,
      Water: 0.92,
      Wind: 1.0,
      Earth: 1.0,
      Lightning: 1.0,
      Void: 1.0,
      Arcane: 1.0,
      Light: 0.92,
      Shadow: 1.0,
      Nature: 1.0,
      Frost: 0.92,
      Chaos: 1.3,
    },
    description: "Chaos affinity specialist",
  },
};

// ============================================================================
// SPELL MECHANICS
// ============================================================================

export const SPELL_TIERS = ["Basic", "Advanced", "Mega"] as const;

export const CAST_TYPES = ["Instant", "Trap", "Charged", "Continuous", "Channeled"] as const;

export const SPELL_CATEGORIES = [
  "Attack",
  "Defense",
  "Regen",
  "Debuff",
  "Buff",
  "Drain",
  "Environmental",
  "Summon",
  "Physical",
  "Hybrid",
] as const;

// Hard stat caps by tier
export const SPELL_CAPS: Record<
  TierType,
  {
    damage: [number, number];
    mp: [number, number];
    will: [number, number];
    interruption: [number, number];
  }
> = {
  Basic: {
    damage: [10, 40],
    mp: [8, 20],
    will: [10, 25],
    interruption: [15, 25],
  },
  Advanced: {
    damage: [35, 90],
    mp: [20, 45],
    will: [28, 65],
    interruption: [25, 40],
  },
  Mega: {
    damage: [80, 200],
    mp: [40, 80],
    will: [65, 130],
    interruption: [40, 60],
  },
};

// Summon stat caps by tier
export const SUMMON_CAPS: Record<
  TierType,
  {
    hp: [number, number];
    attack: [number, number];
    behaviors: number;
  }
> = {
  Basic: {
    hp: [20, 60],
    attack: [5, 15],
    behaviors: 1,
  },
  Advanced: {
    hp: [60, 150],
    attack: [15, 35],
    behaviors: 2,
  },
  Mega: {
    hp: [150, 400],
    attack: [30, 80],
    behaviors: 3,
  },
};

// ============================================================================
// WILL SYSTEM
// ============================================================================

export const WILL_STATES = {
  SHARP: {
    min: 300,
    max: 500,
    label: "Sharp",
    feedback: "Your mind feels crystal clear and unstoppable",
  },
  FOCUSED: {
    min: 150,
    max: 299,
    label: "Focused",
    feedback: "Your concentration is steady and controlled",
  },
  STRAINED: {
    min: 80,
    max: 149,
    label: "Strained",
    feedback: "Your thoughts feel heavy and difficult to maintain",
  },
  FAILING: {
    min: 30,
    max: 79,
    label: "Failing",
    feedback: "Your mental construct is crumbling; the spell wavers dangerously",
  },
  BROKEN: {
    min: 0,
    max: 29,
    label: "Broken",
    feedback: "Your mind goes blank; the spell collapses entirely",
  },
} as const;

export const WILL_COST_BY_TIER: Record<TierType, [number, number]> = {
  Basic: [10, 25],
  Advanced: [30, 60],
  Mega: [70, 120],
};

// ============================================================================
// BATTLE MECHANICS
// ============================================================================

export const BATTLE_TURN_DURATION_MS = 30000; // 30 seconds per turn
export const DISCONNECT_FORFEIT_MS = 60000; // 60 seconds before forfeit
export const MINIGAME_SKIP_THRESHOLD_MS = 5000; // Skip minigame if <5s remaining

export const TERRAINS = [
  "Volcanic Wastes",
  "Frozen Tundra",
  "Verdant Grove",
  "Starlit Void",
  "Crystalline Cavern",
  "Tempest Peak",
] as const;

export type TerrainType = (typeof TERRAINS)[number];

// ============================================================================
// MINIGAMES
// ============================================================================

export const MINIGAME_TYPES = {
  TIMING_STRIKE: "timing-strike",
  PATTERN_MATCH: "pattern-match",
  RAPID_TAP: "rapid-tap",
  HOLD_RELEASE: "hold-release",
  QUICK_REACTION: "quick-reaction",
  SEQUENCE_INPUT: "sequence-input",
} as const;

export const ELEMENT_TO_MINIGAME: Record<ElementType, string> = {
  Fire: MINIGAME_TYPES.TIMING_STRIKE,
  Lightning: MINIGAME_TYPES.TIMING_STRIKE,
  Chaos: MINIGAME_TYPES.TIMING_STRIKE,
  Water: MINIGAME_TYPES.PATTERN_MATCH,
  Frost: MINIGAME_TYPES.PATTERN_MATCH,
  Nature: MINIGAME_TYPES.PATTERN_MATCH,
  Wind: MINIGAME_TYPES.RAPID_TAP,
  Earth: MINIGAME_TYPES.HOLD_RELEASE,
  Void: MINIGAME_TYPES.QUICK_REACTION,
  Shadow: MINIGAME_TYPES.QUICK_REACTION,
  Arcane: MINIGAME_TYPES.QUICK_REACTION,
  Light: MINIGAME_TYPES.SEQUENCE_INPUT,
};

// ============================================================================
// RATE LIMITING
// ============================================================================

export const SPELL_CREATION_WEEKLY_LIMIT = 3; // spells per week per user
export const LLM_RATE_LIMITS = {
  groq: {
    requestsPerMinute: 30,
    tokensPerMinute: 14400,
    softLimitPercentage: 0.8, // 80% of hard limit
  },
  gemini: {
    requestsPerMinute: 60,
    tokensPerMinute: 1000000,
    softLimitPercentage: 0.8,
  },
  openrouter: {
    requestsPerMinute: 60,
    tokensPerMinute: 1000000,
    softLimitPercentage: 0.8,
  },
};

// ============================================================================
// VALIDATION MESSAGES
// ============================================================================

export const VALIDATION_MESSAGES = {
  SPELL_NAME_REQUIRED: "Spell name is required",
  SPELL_NAME_TOO_LONG: "Spell name must be 256 characters or less",
  ELEMENT_INVALID: "Invalid element selected",
  DESCRIPTION_REQUIRED: "Spell description is required",
  SUMMON_MODE_REQUIRED: "Summon mode must be specified (autonomous or controlled)",
  TIER_INVALID: "Invalid spell tier",
  DAMAGE_OUT_OF_RANGE: "Damage is outside the allowed range for this tier",
  MP_COST_OUT_OF_RANGE: "MP cost is outside the allowed range for this tier",
  WILL_COST_OUT_OF_RANGE: "Will cost is outside the allowed range for this tier",
  WEEKLY_LIMIT_EXCEEDED: "You have reached your weekly spell creation limit",
  RATE_LIMIT_EXCEEDED: "LLM rate limit exceeded, please try again later",
  INVALID_SPELL_DATA: "Invalid spell data received from LLM",
  IMAGE_GENERATION_FAILED: "Failed to generate spell card image",
} as const;
