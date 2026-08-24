import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpellCard as GameSpellCard } from "@/components/game/spell-card";
import { ElementIcon } from "@/components/game/element-icon";
import type { SpellCardProps } from "@/lib/adapters";
import { Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SpellCardWrapperProps {
  spell: SpellCardProps & { imageUrl?: string };
  size?: "sm" | "md" | "lg";
  onOpen?: () => void;
}

function StatCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono font-bold text-sm ${className ?? ""}`}>{value}</p>
    </div>
  );
}

export function SpellCardWrapper({ spell, size = "md", onOpen }: SpellCardWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const cardData = {
    id: spell.id,
    name: spell.name,
    flavor: spell.flavor,
    element: spell.element,
    tier: spell.tier,
    primaryCategory: spell.category,
    castType: spell.castType,
    art: spell.art,
    artAccent: spell.artAccent,
  };

  const open = () => {
    setIsOpen(true);
    onOpen?.();
  };

  return (
    <>
      <GameSpellCard spell={cardData} size={size} onClick={open} />

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
              {spell.imageUrl ? (
                <img src={spell.imageUrl} alt={spell.name} className="w-full h-full object-cover rounded-md" />
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
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <Badge variant="outline" className="capitalize">{spell.category}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cast Type</p>
                <Badge variant="outline">{spell.castType}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center p-3 bg-secondary/30 rounded-md border border-border">
              <StatCell label="Damage" value={spell.damage} />
              <StatCell label="MP" value={String(spell.mpCost)} className="text-sky-400" />
              <StatCell label="Will" value={spell.willCost} className="text-accent-foreground" />
              <StatCell label="Cast" value={`${spell.castTime}s`} />
            </div>

            {(spell.interruptionThreshold !== null || spell.scalingFactor !== null || spell.maintenanceCostPerTurn !== null) && (
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-secondary/30 rounded-md border border-border">
                {spell.interruptionThreshold !== null && (
                  <StatCell label="Interrupt" value={String(spell.interruptionThreshold)} />
                )}
                {spell.scalingFactor !== null && (
                  <StatCell label="Scaling" value={`x${spell.scalingFactor}`} />
                )}
                {spell.maintenanceCostPerTurn !== null && (
                  <StatCell label="Maint/Turn" value={String(spell.maintenanceCostPerTurn)} />
                )}
              </div>
            )}

            {(spell.lore || spell.flavor) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Lore</p>
                <p className="text-sm italic text-foreground/90 font-serif leading-relaxed">{spell.lore}</p>
              </div>
            )}

            {spell.assessmentQuestion && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">The Tower asks</p>
                <p className="text-sm italic text-foreground/90 font-serif leading-relaxed">{spell.assessmentQuestion}</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                navigate(`/spell/${spell.id}`);
              }}
            >
              <Share2 />
              View Share Page
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}