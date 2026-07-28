/** Core game types and mock data for the Arcanis UI layer. */

export const ELEMENTS = [
  "fire",
  "water",
  "wind",
  "earth",
  "lightning",
  "void",
  "arcane",
  "light",
  "shadow",
  "nature",
  "frost",
  "chaos",
] as const

export type Element = (typeof ELEMENTS)[number]

export const CAST_TYPES = ["instant", "trap", "charged", "continuous", "channeled"] as const
export type CastType = (typeof CAST_TYPES)[number]

export const SPELL_CATEGORIES = ["offense", "defense", "utility", "curse", "ward"] as const
export type SpellCategory = (typeof SPELL_CATEGORIES)[number]

/** Tier 1–5. Communicated through border ornamentation, never color. */
export type Tier = 1 | 2 | 3 | 4 | 5

export interface Spell {
  id: string
  name: string
  flavor: string
  element: Element
  castType: CastType
  category: SpellCategory
  tier: Tier
  /** Dominant color pulled from the artwork; drives border/accent tint. */
  artAccent: string
  art: string
}

export const SPELLS: Spell[] = [
  {
    id: "emberlash",
    name: "Emberlash",
    flavor: "The whip remembers every hand that held it.",
    element: "fire",
    castType: "instant",
    category: "offense",
    tier: 3,
    artAccent: "#d4713a",
    art: "/spells/emberlash.png",
  },
  {
    id: "hollow-veil",
    name: "Hollow Veil",
    flavor: "What the veil takes, no one asks for back.",
    element: "void",
    castType: "continuous",
    category: "ward",
    tier: 5,
    artAccent: "#6d5aa8",
    art: "/spells/hollow-veil.png",
  },
  {
    id: "glacial-lattice",
    name: "Glacial Lattice",
    flavor: "Patience, frozen into architecture.",
    element: "frost",
    castType: "charged",
    category: "defense",
    tier: 2,
    artAccent: "#6da2c9",
    art: "/spells/glacial-lattice.png",
  },
  {
    id: "stormcall",
    name: "Stormcall",
    flavor: "The sky answers those who do not flinch.",
    element: "lightning",
    castType: "channeled",
    category: "offense",
    tier: 4,
    artAccent: "#c9b06d",
    art: "/spells/stormcall.png",
  },
]

export interface Character {
  name: string
  title: string
  avatar: string
  circle: number
  circleName: string
  /** Qualitative only — HP/MP/Will are surfaced as text on the dashboard. */
  hpState: string
  mpState: string
  willState: string
  hp: { current: number; max: number }
  mp: { current: number; max: number }
  circleXp: { current: number; next: number }
  spellXp: { current: number; next: number }
  elementalXp: { current: number; next: number }
  animusRank: string
  animusDivision: string
  affinities: Record<Element, number> // 0–100
}

export const CHARACTER: Character = {
  name: "Veyra Solmire",
  title: "Ashwarden of the Sixth",
  avatar: "/avatars/mage-1.png",
  circle: 6,
  circleName: "Circle of the Kindled Mind",
  hpState: "Steady",
  mpState: "Brimming",
  willState: "Your thoughts feel clear tonight.",
  hp: { current: 340, max: 420 },
  mp: { current: 188, max: 210 },
  circleXp: { current: 4210, next: 6000 },
  spellXp: { current: 1180, next: 1500 },
  elementalXp: { current: 890, next: 1200 },
  animusRank: "Adamant",
  animusDivision: "II",
  affinities: {
    fire: 78,
    water: 22,
    wind: 41,
    earth: 33,
    lightning: 64,
    void: 51,
    arcane: 58,
    light: 12,
    shadow: 47,
    nature: 19,
    frost: 36,
    chaos: 8,
  },
}

export interface BattleRecord {
  id: string
  opponent: string
  mode: "Animus" | "Freestyle" | "Duel"
  result: "Victory" | "Defeat" | "Draw"
  detail: string
  ago: string
}

export const RECENT_BATTLES: BattleRecord[] = [
  { id: "b1", opponent: "Maelis Dren", mode: "Animus", result: "Victory", detail: "Emberlash finisher, 11 turns", ago: "2h ago" },
  { id: "b2", opponent: "Corvin Hale", mode: "Duel", result: "Defeat", detail: "Trap chain broke your guard", ago: "5h ago" },
  { id: "b3", opponent: "Ilsa Vane", mode: "Animus", result: "Victory", detail: "Hollow Veil outlasted the storm", ago: "1d ago" },
  { id: "b4", opponent: "Tammuz Or", mode: "Freestyle", result: "Draw", detail: "The narrator called it even", ago: "2d ago" },
]

export interface FriendActivity {
  id: string
  name: string
  action: string
  ago: string
}

export const FRIEND_ACTIVITY: FriendActivity[] = [
  { id: "f1", name: "Maelis Dren", action: "reached the Seventh Circle", ago: "1h ago" },
  { id: "f2", name: "Corvin Hale", action: "forged a new chaos spell", ago: "3h ago" },
  { id: "f3", name: "Ilsa Vane", action: "won 5 Animus matches in a row", ago: "6h ago" },
  { id: "f4", name: "Tammuz Or", action: "joined Hall of the Silent Lantern", ago: "1d ago" },
]
