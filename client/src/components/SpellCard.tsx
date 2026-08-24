import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpellCard as GameSpellCard } from "@/components/game/spell-card";
import { ElementIcon } from "@/components/game/element-icon";

interface Spell {
  id: string;
  name: string;
  tier: "Basic" | "Advanced" | "Mega" | string;
  element: string;
  primaryCategory?: string;
  castType?: string;
  damage?: string | number;
  mpCost?: number;
  willCost?: string | number;
  castTime?: string | number;
  lore?: string;
  flavor?: string;
  imageUrl?: string;
  art?: string;
  artAccent?: string;
}

interface SpellCardProps {
  spell: Spell;
  size?: "sm" | "md" | "lg";
  onAddToDeck?: (spellId: string) => void;
  onCast?: (spellId: string) => void;
}

export function SpellCard({ spell, size = "md", onAddToDeck, onCast }: SpellCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const cardData = {
    id: spell.id,
    name: spell.name,
    flavor: spell.flavor || spell.lore || "",
    element: spell.element,
    tier: spell.tier,
    primaryCategory: spell.primaryCategory,
    castType: spell.castType,
    art: spell.art || spell.imageUrl,
    artAccent: spell.artAccent,
  };

  return (
    <>
      <GameSpellCard
        spell={cardData}
        size={size}
        onClick={() => setIsOpen(true)}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-semibold flex items-center gap-2">
              <ElementIcon element={spell.element} size={20} />
              {spell.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="aspect-video bg-secondary/50 rounded-md overflow-hidden flex items-center justify-center border border-border">
              {spell.imageUrl || spell.art ? (
                <img src={spell.imageUrl || spell.art} alt={spell.name} className="w-full h-full object-cover rounded-md" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <ElementIcon element={spell.element} size={48} />
                  <span className="text-xs text-muted-foreground capitalize">{spell.element}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Tier</p>
                <Badge variant="outline" className="border-primary/40 text-primary">{spell.tier}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Element</p>
                <Badge variant="outline" className="capitalize">{spell.element}</Badge>
              </div>
            </div>

            {(spell.damage !== undefined || spell.mpCost !== undefined) && (
              <div className="grid grid-cols-4 gap-2 text-center p-3 bg-secondary/30 rounded-md border border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Damage</p>
                  <p className="font-mono font-bold text-sm">{spell.damage ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">MP</p>
                  <p className="font-mono font-bold text-sm text-sky-400">{spell.mpCost ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tier</p>
                  <p className="font-mono font-bold text-sm text-primary">{spell.tier || "Basic"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cast</p>
                  <p className="font-mono font-bold text-sm">{spell.castTime ? `${spell.castTime}s` : "-"}</p>
                </div>
              </div>
            )}

            {(spell.lore || spell.flavor) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Lore</p>
                <p className="text-sm italic text-foreground/90 font-serif leading-relaxed">{spell.lore || spell.flavor}</p>
              </div>
            )}

            {onAddToDeck && (
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => {
                onAddToDeck(spell.id);
                setIsOpen(false);
              }}>
                Add to Deck
              </Button>
            )}

            {onCast && (
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => {
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
