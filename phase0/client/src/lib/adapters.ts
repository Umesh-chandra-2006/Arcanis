import type { PublicSpell } from "@shared/spell-view";
import { ELEMENT_COLORS } from "@shared/taxonomy";
import { elementArtDataUri } from "@shared/element-art";

export type Phase0Spell = PublicSpell;

const STRAIN_LABEL = { light: "Light", moderate: "Moderate", heavy: "Heavy" } as const;

const ELEMENT_ACCENTS: Record<string, string> = Object.fromEntries(
  Object.entries(ELEMENT_COLORS).map(([el, c]) => [el.toLowerCase(), c.accent])
);

export function mapSpellToCardProps(spell: Phase0Spell) {
  const damage =
    spell.damageMin === spell.damageMax
      ? `${spell.damageMin}`
      : `${spell.damageMin}-${spell.damageMax}`;

  const elementKey = (spell.element || "arcane").toLowerCase();

  const artUrl =
    spell.imageUrl && spell.imageUrl.trim().length > 0
      ? spell.imageUrl
      : elementArtDataUri(spell.element);

  return {
    id: spell.id,
    name: spell.name,
    tier: spell.tier,
    element: spell.element,
    category: spell.category,
    castType: spell.castType || "Instant",
    damage,
    strain: STRAIN_LABEL[spell.strain],
    damageMax: spell.damageMax,
    castTime: (spell.castTimeMs / 1000).toFixed(1),
    castTimeMs: spell.castTimeMs,
    potentialTier: spell.potentialTier,
    isBase: spell.isPlatformSpell,
    ownerId: spell.ownerId,
    refinedFromId: spell.refinedFromId,
    mpCost: spell.mpCost,
    interruptionThreshold: spell.interruptionThreshold,
    drainRatio: spell.drainRatio,
    maintenanceCostPerTurn: spell.maintenanceCostPerTurn,
    lore: spell.loreLine || "",
    flavor: spell.flavorText || "",
    researching: spell.researching,
    shareCount: spell.shareCount,
    imageUrl: artUrl,
    art: artUrl,
    // The card border takes the artwork's own colour (A9); element tint only without art.
    artAccent: spell.dominantColor || ELEMENT_ACCENTS[elementKey] || "#c9a24b",
  };
}

export type SpellCardProps = ReturnType<typeof mapSpellToCardProps>;

export function elementAccent(element: string): string {
  return ELEMENT_ACCENTS[(element || "arcane").toLowerCase()] || "#6d5aa8";
}