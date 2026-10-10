import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpellCard as GameSpellCard } from "@/components/game/spell-card";
import { ElementIcon } from "@/components/game/element-icon";
import type { SpellCardProps } from "@/lib/adapters";
import { CAST_TIME_MS, TIER_CAPS, type CastType, type Tier } from "@shared/taxonomy";
import { Share2, Lock, Hammer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RefineDialog } from "@/components/RefineDialog";

interface SpellCardWrapperProps {
  spell: SpellCardProps;
  size?: "sm" | "md" | "lg";
  onOpen?: () => void;
}

/** A stat against the ceiling of its tier, so a spell near the top reads as strong. */
function StatBar({ label, value, fill, tone = "bg-primary" }: { label: string; value: string; fill: number; tone?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.round(Math.max(0.04, Math.min(1, fill)) * 100)}%` }} />
      </div>
    </div>
  );
}

/**
 * The sealed-potential line: the concept can be grander than the form the mage
 * can wield today. Display only; it never changes stats (Master Doc v7.4).
 */
export function PotentialNote({ tier, potential }: { tier: string; potential: string | null }) {
  if (!potential || potential === tier || potential === "Basic") return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>
        <span className="font-serif font-semibold text-primary">Sealed {potential}-class spell.</span>{" "}
        <span className="text-muted-foreground">You wield its {tier} form for now. This spell awaits your growth.</span>
      </p>
    </div>
  );
}

export function SpellStats({ spell }: { spell: SpellCardProps }) {
  const caps = TIER_CAPS[spell.tier as Tier] ?? TIER_CAPS.Basic;
  const [castMin, castMax] = CAST_TIME_MS[spell.castType as CastType] ?? CAST_TIME_MS.Instant;
  const strainFill = { Light: 0.33, Moderate: 0.66, Heavy: 1 }[spell.strain] ?? 0.5;
  return (
    <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-3">
      <StatBar label="Power" value={spell.damage} fill={spell.damageMax / caps.damage[1]} />
      <StatBar label="Speed" value={`${spell.castTime}s cast`} fill={(castMax - spell.castTimeMs) / (castMax - castMin)} tone="bg-sky-400" />
      <StatBar label="Mana cost" value={`${spell.mpCost} MP`} fill={spell.mpCost / caps.mp[1]} tone="bg-indigo-400" />
      {/* Strain is the only way Will cost is ever shown: a word, never a number. */}
      <StatBar label="Strain" value={spell.strain} fill={strainFill} tone="bg-accent" />
      {spell.drainRatio !== null && <StatBar label="Drain" value={`${Math.round(spell.drainRatio * 100)}% returned`} fill={spell.drainRatio / 0.5} tone="bg-emerald-400" />}
    </div>
  );
}

export function SpellCardWrapper({ spell, size = "md", onOpen }: SpellCardWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [refining, setRefining] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  // Only a spell the player forged can be refined (Master Doc 6.7): never a base spell.
  const canRefine = !!user && spell.ownerId === user.id && !spell.isBase;

  const open = () => {
    setIsOpen(true);
    onOpen?.();
  };

  return (
    <>
      <GameSpellCard
        spell={{ id: spell.id, name: spell.name, flavor: spell.flavor, element: spell.element, tier: spell.tier, art: spell.art, artAccent: spell.artAccent }}
        size={size}
        onClick={open}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl font-semibold">
              <ElementIcon element={spell.element} size={20} />
              {spell.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {spell.lore && <p className="text-center font-serif text-base italic leading-relaxed text-primary/90">"{spell.lore}"</p>}

            <div className="flex flex-wrap justify-center gap-1.5">
              <Badge variant="outline" className="capitalize">{spell.element}</Badge>
              <Badge variant="outline" className="capitalize">{spell.category}</Badge>
              <Badge variant="outline">{spell.castType}</Badge>
              <Badge variant="outline" className="border-primary/40 text-primary">{spell.tier} form</Badge>
              {spell.isBase && <Badge variant="outline">Base spell</Badge>}
              {spell.refinedFromId && <Badge variant="outline">Refined</Badge>}
            </div>

            <PotentialNote tier={spell.tier} potential={spell.potentialTier} />

            {spell.flavor && <p className="text-sm leading-relaxed text-foreground/90">{spell.flavor}</p>}

            <SpellStats spell={spell} />

            {canRefine && (
              <Button
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  setRefining(true);
                }}
              >
                <Hammer />
                Refine this spell
              </Button>
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
              View share page
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {canRefine && <RefineDialog spell={spell} open={refining} onOpenChange={setRefining} />}
    </>
  );
}
