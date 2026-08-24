import type { Phase0Spell as DrizzleSpell } from "@drizzle/schema";

export type Phase0Spell = DrizzleSpell;

const ELEMENT_ACCENTS: Record<string, string> = {
  fire: "#d4713a",
  water: "#6da2c9",
  wind: "#8d8a80",
  earth: "#6e9a5f",
};

function getElementalArtFallback(element: string): string {
  const el = (element || "arcane").toLowerCase();
  const accent = ELEMENT_ACCENTS[el] || "#6d5aa8";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
    <defs>
      <radialGradient id="bg" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.6" />
        <stop offset="60%" stop-color="#0f0d18" />
        <stop offset="100%" stop-color="#050408" />
      </radialGradient>
      <radialGradient id="core" cx="50%" cy="42%" r="30%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
        <stop offset="50%" stop-color="${accent}" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="400" height="560" fill="url(#bg)" />
    <circle cx="200" cy="230" r="140" fill="url(#core)" />
    <circle cx="200" cy="230" r="105" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.75" />
    <circle cx="200" cy="230" r="85" fill="none" stroke="#e8c87b" stroke-width="1" opacity="0.8" />
    <polygon points="200,145 220,210 285,230 220,250 200,315 180,250 115,230 180,210" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.8" />
    <polygon points="200,145 220,210 285,230 220,250 200,315 180,250 115,230 180,210" fill="none" stroke="#e8c87b" stroke-width="1" transform="rotate(45 200 230)" opacity="0.6" />
    <circle cx="200" cy="230" r="16" fill="${accent}" opacity="0.9" />
    <circle cx="200" cy="230" r="8" fill="#ffffff" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function mapSpellToCardProps(spell: Phase0Spell) {
  const damage =
    spell.damageMin === spell.damageMax
      ? `${spell.damageMin}`
      : `${spell.damageMin}-${spell.damageMax}`;

  const willCost =
    spell.willCostMin === spell.willCostMax
      ? `${spell.willCostMin}`
      : `${spell.willCostMin}-${spell.willCostMax}`;

  const elementKey = (spell.element || "arcane").toLowerCase();

  const artUrl =
    spell.imageUrl && spell.imageUrl.trim().length > 0
      ? spell.imageUrl
      : getElementalArtFallback(spell.element);

  return {
    id: spell.id,
    name: spell.name,
    tier: spell.tier as "Basic",
    element: spell.element,
    category: spell.category,
    castType: spell.castType || "Instant",
    damage,
    willCost,
    castTime: (spell.castTimeMs / 1000).toFixed(1),
    mpCost: spell.mpCost,
    scalingFactor: spell.scalingFactor,
    mpModifier: spell.mpModifier,
    interruptionThreshold: spell.interruptionThreshold,
    maintenanceCostPerTurn: spell.maintenanceCostPerTurn,
    lore: spell.loreLine || spell.flavorText || "",
    flavor: spell.flavorText || spell.loreLine || "",
    assessmentQuestion: spell.assessmentQuestion,
    shareCount: spell.shareCount,
    imageUrl: artUrl,
    art: artUrl,
    artAccent: ELEMENT_ACCENTS[elementKey] || "#6d5aa8",
  };
}

export type SpellCardProps = ReturnType<typeof mapSpellToCardProps>;

export function elementAccent(element: string): string {
  return ELEMENT_ACCENTS[(element || "arcane").toLowerCase()] || "#6d5aa8";
}