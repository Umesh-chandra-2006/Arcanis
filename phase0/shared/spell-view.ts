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
  /** True while research runs. No time is ever disclosed (Master Doc 6.3). */
  researching: boolean;
  createdAt: string;
}

export function toPublicSpell(spell: SpellRowLike, now = new Date()): PublicSpell {
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
    researching: spell.researchReadyAt ? spell.researchReadyAt.getTime() > now.getTime() : false,
    createdAt: spell.createdAt.toISOString(),
  };
}
