import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ELEMENT_COLORS, ELEMENT_ICONS, TIER_COLORS } from "@shared/constants";

interface Spell {
  id: string;
  name: string;
  tier: "Basic" | "Advanced" | "Mega";
  element: string;
  damage: string | number;
  mpCost: number;
  willCost: string | number;
  castTime: string | number;
  lore: string;
  imageUrl?: string;
}

interface SpellCardProps {
  spell: Spell;
  onAddToDeck?: (spellId: string) => void;
  onCast?: (spellId: string) => void;
}

export function SpellCard({ spell, onAddToDeck, onCast }: SpellCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tierColor = TIER_COLORS[spell.tier as keyof typeof TIER_COLORS] || "border-gray-500";
  const elementIcon = ELEMENT_ICONS[spell.element as keyof typeof ELEMENT_ICONS] || "✨";

  return (
    <>
      <Card
        className={`cursor-pointer hover:shadow-lg transition-all border-2 ${tierColor} overflow-hidden`}
        onClick={() => setIsOpen(true)}
      >
        <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-6xl">
          {spell.imageUrl ? (
            <img src={spell.imageUrl} alt={spell.name} className="w-full h-full object-cover" />
          ) : (
            elementIcon
          )}
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-sm">{spell.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {spell.tier}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl">{elementIcon}</span>
            <span className="text-xs text-muted-foreground">{spell.element}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">DMG</p>
              <p className="font-semibold">{spell.damage}</p>
            </div>
            <div>
              <p className="text-muted-foreground">MP</p>
              <p className="font-semibold">{spell.mpCost}</p>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{spell.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-8xl">
              {spell.imageUrl ? (
                <img src={spell.imageUrl} alt={spell.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                elementIcon
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Tier</p>
                <Badge>{spell.tier}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Element</p>
                <Badge variant="outline">{spell.element}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Damage</p>
                <p className="font-bold">{spell.damage}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MP</p>
                <p className="font-bold">{spell.mpCost}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Will</p>
                <p className="font-bold">{spell.willCost}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cast</p>
                <p className="font-bold">{spell.castTime}s</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Lore</p>
              <p className="text-sm italic">{spell.lore}</p>
            </div>

            {onAddToDeck && (
              <Button className="w-full" onClick={() => {
                onAddToDeck(spell.id);
                setIsOpen(false);
              }}>
                Add to Deck
              </Button>
            )}

            {onCast && (
              <Button className="w-full" onClick={() => {
                onCast(spell.id);
                setIsOpen(false);
              }}>
                Cast Spell
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
