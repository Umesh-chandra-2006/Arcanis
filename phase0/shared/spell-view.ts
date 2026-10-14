// The only shape in which a spell leaves the server. Will cost is never sent as
// a number (CLAUDE.md "Will", Master Doc 2.1): the client gets a qualitative
// strain descriptor instead. Internal fields (verification trace, prompts,
// generation metadata) never leave either.
import { strainOf, type Strain, type Tier } from "./taxonomy";

export interface SpellRowLike {
  id: string;
  ownerId: number;
  name: string;
  element: string;
  category: string;
  secondaryCategory?: string | null;
  castType: string;
  tier: string;
  damageMin: number;
  damageMax: number;
  mpCost: number;
  willCostMin: number;
  willCostMax: number;
  castTimeMs: number;
  interruptionThreshold: number | null;
  maintenanceCostPerTurn: number | null;
  drainRatio?: number | null;
  potentialTier?: string | null;
  flavorText: string;
  loreLine: string;
  imageUrl: string;
  cardImageUrl?: string | null;
  ogImageUrl?: string | null;
  dominantColor?: string | null;
  shareCount: number;
  isPlatformSpell: boolean;
  refinedFromId?: string | null;
  researchReadyAt?: Date | null;
  codexSharedAt?: Date | null;
  createdAt: Date;
}

export interface PublicSpell {
  id: string;
  ownerId: number;
  name: string;
  element: string;
  category: string;
  secondaryCategory: string | null;
  castType: string;
  tier: string;
  damageMin: number;
  damageMax: number;
  mpCost: number;
  strain: Strain;
  castTimeMs: number;
  interruptionThreshold: number | null;
  maintenanceCostPerTurn: number | null;
  drainRatio: number | null;
  /** Display only: how grand the concept is (may exceed the tier it is wielded at). */
  potentialTier: string | null;
  flavorText: string;
  loreLine: string;
  imageUrl: string;
  dominantColor: string | null;
  shareCount: number;
  isPlatformSpell: boolean;
  /** The spell this one was mended from, if any (Master Doc 6.7). */
  refinedFromId: string | null;
  /**
   * True while research runs. No time is ever disclosed (Master Doc 6.3). A
   * researching spell is sealed: its stats, text and art are blank until granted.
   */
  researching: boolean;
  /** The owner agreed to show it in the Codex (v7.7). */
  inCodex: boolean;
  createdAt: string;
}

export function toPublicSpell(spell: SpellRowLike, now = new Date()): PublicSpell {
  const researching = spell.researchReadyAt ? spell.researchReadyAt.getTime() > now.getTime() : false;
  if (researching) {
    // Research comes first (Master Doc 6.3, v7.6): until it is complete the spell
    // has not been granted, so nothing the forge made leaves the server. Only what
    // the player wrote themselves (name, element, category) is sent back.
    return {
      id: spell.id,
      ownerId: spell.ownerId,
      name: spell.name,
      element: spell.element,
      category: spell.category,
      secondaryCategory: spell.secondaryCategory ?? null,
      castType: spell.castType,
      tier: spell.tier,
      damageMin: 0,
      damageMax: 0,
      mpCost: 0,
      strain: "light",
      castTimeMs: 0,
      interruptionThreshold: null,
      maintenanceCostPerTurn: null,
      drainRatio: null,
      potentialTier: null,
      flavorText: "",
      loreLine: "",
      imageUrl: "",
      dominantColor: null,
      shareCount: 0,
      isPlatformSpell: spell.isPlatformSpell,
      refinedFromId: spell.refinedFromId ?? null,
      researching: true,
      inCodex: spell.codexSharedAt != null,
      createdAt: spell.createdAt.toISOString(),
    };
  }
  return {
    id: spell.id,
    ownerId: spell.ownerId,
    name: spell.name,
    element: spell.element,
    category: spell.category,
    secondaryCategory: spell.secondaryCategory ?? null,
    castType: spell.castType,
    tier: spell.tier,
    damageMin: spell.damageMin,
    damageMax: spell.damageMax,
    mpCost: spell.mpCost,
    strain: strainOf(spell.tier as Tier, (spell.willCostMin + spell.willCostMax) / 2),
    castTimeMs: spell.castTimeMs,
    interruptionThreshold: spell.interruptionThreshold,
    maintenanceCostPerTurn: spell.maintenanceCostPerTurn,
    drainRatio: spell.drainRatio ?? null,
    potentialTier: spell.potentialTier ?? null,
    flavorText: spell.flavorText,
    loreLine: spell.loreLine,
    // The portrait card crop when it exists; older spells only have the original.
    imageUrl: spell.cardImageUrl || spell.imageUrl,
    dominantColor: spell.dominantColor ?? null,
    shareCount: spell.shareCount,
    isPlatformSpell: spell.isPlatformSpell,
    refinedFromId: spell.refinedFromId ?? null,
    researching: false,
    inCodex: spell.codexSharedAt != null,
    createdAt: spell.createdAt.toISOString(),
  };
}
