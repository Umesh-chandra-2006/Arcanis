export interface DbSpell {
  id: string;
  name: string;
  tier: "Basic" | "Advanced" | "Mega" | string;
  element: string;
  damageMin: number;
  damageMax: number;
  mpCost: number;
  willCostMin: number;
  willCostMax: number;
  castTimeMs: number;
  loreLine?: string | null;
  flavorText?: string | null;
  imageUrl?: string | null;
}

export function mapSpellToCardProps(spell: DbSpell) {
  const damage =
    spell.damageMin === spell.damageMax
      ? `${spell.damageMin}`
      : `${spell.damageMin}-${spell.damageMax}`;

  const willCost =
    spell.willCostMin === spell.willCostMax
      ? `${spell.willCostMin}`
      : `${spell.willCostMin}-${spell.willCostMax}`;

  const castTime = (spell.castTimeMs / 1000).toFixed(1);

  return {
    id: spell.id,
    name: spell.name,
    tier: spell.tier as "Basic" | "Advanced" | "Mega",
    element: spell.element,
    damage,
    mpCost: spell.mpCost,
    willCost,
    castTime,
    lore: spell.loreLine || spell.flavorText || "",
    imageUrl: spell.imageUrl || undefined,
  };
}
