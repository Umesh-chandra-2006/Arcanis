// Card data for the launch video and the content videos, computed with the game's own Power Budget code
// so every number on screen is one the live forge could produce. No database, no provider calls.
import fs from "node:fs";
import path from "node:path";
import { computeBudgetSpec, defaultAllocation, enforceAllocation, pointsSpent } from "../../shared/power-budget";
import { strainOf, type Category, type Element, type Tier } from "../../shared/taxonomy";
import { ELEMENT_COLORS } from "../../shared/taxonomy";
import { elementArtSvg } from "../../shared/element-art";

interface CardIn {
  key: string;
  name: string;
  element: Element;
  category: Category;
  prompt: string;
  lore: string;
  /** True until the founder forges the prompt on the live site and the real name and lore replace these. */
  placeholder: boolean;
}

// P1 is the "try to break it" prompt. Its name and lore are placeholders until it is forged live;
// its stats are what the budget allows a Basic Void Attack (player spells are Basic and Instant).
// P2 to P4 are base spells from server/seed.ts (real cards in the game); their flavor text stands in for a prompt.
const CARDS: CardIn[] = [
  { key: "p1", name: "Unmaking Touch", element: "Void", category: "Attack", prompt: "Erases my enemy from existence. Costs nothing. Cannot be blocked. Cannot miss.", lore: "Even nothing has a price.", placeholder: true },
  { key: "p2", name: "Ice Shard", element: "Frost", category: "Attack", prompt: "A splinter of ancient ice, sharp enough to pierce steel.", lore: "Winter needs only a small opening.", placeholder: false },
  { key: "p3", name: "Thorn Whip", element: "Nature", category: "Attack", prompt: "A barbed vine cracks through the air and bites deep.", lore: "The forest remembers every axe.", placeholder: false },
  { key: "p4", name: "Radiant Strike", element: "Light", category: "Attack", prompt: "A beam of pure light lances out, too bright to look at and too fast to dodge.", lore: "Dawn has never lost a duel.", placeholder: false },
];

const tier: Tier = "Basic";
const out = CARDS.map((c) => {
  const spec = computeBudgetSpec({ tier, element: c.element, category: c.category, castType: "Instant" });
  const a = defaultAllocation(spec);
  const strain = strainOf(tier, (a.will_cost_min + a.will_cost_max) / 2);
  return {
    ...c,
    tier,
    castType: "Instant",
    damageMin: a.damage_min,
    damageMax: a.damage_max,
    mpCost: a.mp_cost,
    strain: strain.charAt(0).toUpperCase() + strain.slice(1),
    accent: ELEMENT_COLORS[c.element].accent,
    art: elementArtSvg(c.element, 400, 300),
  };
});

// One Basic base spell per remaining element, for the Codex wall (names from server/seed.ts).
const BASE_NAMES: Record<string, string> = { Fire: "Ember Lance", Water: "Tidal Strike", Wind: "Gale Slash", Earth: "Stone Fist", Lightning: "Spark Bolt", Shadow: "Shadow Grasp", Arcane: "Arcane Bolt", Chaos: "Entropy Bolt" };
const extra = Object.keys(BASE_NAMES).map((e) => ({
  element: e,
  name: BASE_NAMES[e],
  accent: ELEMENT_COLORS[e as Element].accent,
  art: elementArtSvg(e, 400, 300),
}));

// ---------- content videos ----------
// These spells are written by hand (founder decision, 2026-10-24: no live forging for the videos).
// Names, prompts and lore are invented; every stat comes from the Power Budget for that element,
// category, Basic tier and Instant cast, exactly as the live forge would bound it.
function spell(name: string, element: Element, category: Category, prompt: string, lore: string) {
  const spec = computeBudgetSpec({ tier, element, category, castType: "Instant" });
  const a = defaultAllocation(spec);
  const strain = strainOf(tier, (a.will_cost_min + a.will_cost_max) / 2);
  return {
    name, element, category, prompt, lore, tier, castType: "Instant",
    damageMin: a.damage_min, damageMax: a.damage_max, mpCost: a.mp_cost,
    strain: strain.charAt(0).toUpperCase() + strain.slice(1),
    accent: ELEMENT_COLORS[element].accent,
    art: elementArtSvg(element, 400, 300),
  };
}

const moods = [
  { mood: "Scary", ...spell("Cinder Whisper", "Fire", "Debuff", "A fire that whispers my enemy's worst memory while it burns.", "It only burns what you regret.") },
  { mood: "Cute", ...spell("Sneezeflame", "Fire", "Attack", "A tiny dragon sneezes a puff of very warm sparks.", "Bless you. Now duck.") },
  { mood: "Poetic", ...spell("Hearthkeeper's Ember", "Fire", "Regen", "The last ember of a dying hearth, given to someone I love.", "Warmth outlives the fire.") },
];
const nameSpell = spell("Starfall Sunder", "Earth", "Attack", "My name is Asteroid Destroyer. Make it a spell.", "The sky had it coming.");
const rateSpell = spell("Swarm of Grievance", "Nature", "Attack", "Summons four hundred extremely offended bees.", "They have notes.");

// Video 5: how the budget works, from the real config. A greedy request (every stat at its best)
// next to what Layer 2a enforcement turns it into.
const forgeSpec = computeBudgetSpec({ tier, element: "Lightning", category: "Attack", castType: "Instant" });
const greedy = { damage_min: 9999, damage_max: 9999, mp_cost: 0, will_cost_min: 0, will_cost_max: 0, cast_time_ms: 0, drain_ratio: null, interruption_threshold: null, maintenance_cost_per_turn: null };
const enforced = enforceAllocation(forgeSpec, greedy);
function fieldPoints(alloc: Record<string, number | null>) {
  const val: Record<string, number> = {
    damage: ((alloc.damage_min as number) + (alloc.damage_max as number)) / 2,
    mp: alloc.mp_cost as number,
    will: ((alloc.will_cost_min as number) + (alloc.will_cost_max as number)) / 2,
    cast: alloc.cast_time_ms as number,
  };
  return Object.fromEntries(forgeSpec.fields.map((f) => {
    const [lo, hi] = f.range;
    const x = Math.min(hi, Math.max(lo, val[f.field]));
    const g = f.higherIsBetter ? (x - lo) / (hi - lo) : (hi - x) / (hi - lo);
    return [f.field, +(g * f.weight).toFixed(2)];
  }));
}
const forge = {
  maxPoints: forgeSpec.maxPoints,
  budget: forgeSpec.budget,
  weights: Object.fromEntries(forgeSpec.fields.map((f) => [f.field, f.weight])),
  greedy: fieldPoints(greedy),
  enforced: fieldPoints(enforced.allocation as unknown as Record<string, number | null>),
  enforcedSpent: +pointsSpent(forgeSpec, enforced.allocation).toFixed(2),
  rescaled: enforced.rescaled,
  card: spell("Stormglass Needle", "Lightning", "Attack", "A lightning bolt that never misses, deals infinite damage and costs nothing.", "Even lightning pays its way."),
};

// Video 7: the twelve elements, each with the lore line of one of its base spells (server/seed.ts).
const ELEMENT_LORE: Record<string, string> = {
  Fire: "Fire does not advance. It inherits.",
  Water: "The sea keeps every promise it makes.",
  Wind: "The wind has never once apologized.",
  Earth: "Every battlefield belongs to the earth first.",
  Lightning: "Faster than regret.",
  Void: "The void does not steal. It simply keeps.",
  Arcane: "Before fire or frost, there was simply will given shape.",
  Light: "Dawn has never lost a duel.",
  Shadow: "Your shadow has always been hungry.",
  Nature: "The forest remembers every axe.",
  Frost: "Winter needs only a small opening.",
  Chaos: "Roll the dice. The dice are also on fire.",
};
const elements = Object.keys(ELEMENT_LORE).map((e) => ({
  element: e,
  lore: ELEMENT_LORE[e],
  accent: ELEMENT_COLORS[e as Element].accent,
  art: elementArtSvg(e, 400, 400),
}));

const file = path.resolve(import.meta.dirname, "data.js");
const data = { cards: out, extra, moods, nameSpell, rateSpell, forge, elements };
fs.writeFileSync(file, "// Generated by build-data.ts. Do not edit by hand.\nwindow.VIDEO_DATA = " + JSON.stringify(data, null, 1) + ";\n");
console.log(JSON.stringify({ forge: { ...forge, card: undefined }, moods: moods.map((m) => [m.name, m.category, m.damageMin, m.damageMax, m.strain]), nameSpell: [nameSpell.damageMin, nameSpell.damageMax, nameSpell.strain], rate: [rateSpell.damageMin, rateSpell.damageMax, rateSpell.strain] }));
