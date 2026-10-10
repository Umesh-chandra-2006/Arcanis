import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ElementIcon } from "@/components/game/element-icon";
import { SpellStats } from "@/components/SpellCard";
import { mapSpellToCardProps, type Phase0Spell } from "@/lib/adapters";
import { STONES } from "@shared/constants";
import { toast } from "sonner";
import { Gem, Hammer, Loader2 } from "lucide-react";

// Each one trades something for something: a mend reshapes a spell, it never strengthens it.
const SUGGESTIONS = [
  "Faster to cast, even if it hits softer",
  "Hits harder, even if it costs more",
  "Cheaper to cast",
  "Lighter strain, slower cast",
];

interface RefineTarget {
  id: string;
  name: string;
  element: string;
  category: string;
  tier: string;
}

/**
 * Mending (Master Doc 6.7): the player says what should change; the forge
 * reshapes the spell inside the same class, tier and power. One Refinement
 * Stone, no Spark. The result is a new spell; the original stays as it was.
 */
export function RefineDialog({ spell, open, onOpenChange }: { spell: RefineTarget; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [note, setNote] = useState("");
  const [name, setName] = useState(spell.name);
  const [mended, setMended] = useState<Phase0Spell | null>(null);
  const stones = trpc.spells.stoneBalance.useQuery(undefined, { enabled: open });
  const mend = trpc.spells.mend.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (open) {
      setNote("");
      setName(spell.name);
      setMended(null);
    }
  }, [open, spell.id, spell.name]);

  const balance = stones.data?.balance;
  const empty = balance !== undefined && balance < STONES.mendCost;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      toast.error("Say what should change");
      return;
    }
    try {
      const result = await mend.mutateAsync({
        spellId: spell.id,
        note: note.trim(),
        ...(name.trim() && name.trim() !== spell.name ? { name: name.trim() } : {}),
      });
      await Promise.all([utils.spells.stoneBalance.invalidate(), utils.spells.mySpells.invalidate()]);
      if (result.success && result.spell) setMended(result.spell);
      else toast.error(result.error ?? "The forge could not reshape that spell. Please try again.");
    } catch (error: any) {
      toast.error(error?.message ?? "The forge is busy. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !mend.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl font-semibold">
            <ElementIcon element={spell.element} size={20} />
            {mended ? mended.name : `Refine ${spell.name}`}
          </DialogTitle>
          <DialogDescription>
            {mended
              ? "The refined spell is in your Spellbook. The original is unchanged."
              : `It stays a ${spell.tier} ${spell.element} ${spell.category} spell. Refining reshapes it; it does not make it stronger.`}
          </DialogDescription>
        </DialogHeader>

        {mended ? (
          <div className="space-y-4">
            <p className="text-center font-serif text-base italic leading-relaxed text-primary/90">"{mended.loreLine}"</p>
            <p className="text-sm leading-relaxed text-foreground/90">{mended.flavorText}</p>
            <SpellStats spell={mapSpellToCardProps(mended)} />
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refine-note">What should change?</Label>
              <Textarea
                id="refine-note"
                placeholder="Slower and heavier, like a falling tower…"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-24"
                disabled={mend.isPending}
              />
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={mend.isPending}
                    onClick={() => setNote(s)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refine-name">Name</Label>
              <Input id="refine-name" value={name} maxLength={64} onChange={(e) => setName(e.target.value)} disabled={mend.isPending} />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Gem className="size-3.5 text-primary" />
                Costs {STONES.mendCost} Refinement Stone{balance !== undefined ? `. You have ${balance}.` : ""}
              </span>
              <Button type="submit" disabled={mend.isPending || empty}>
                {mend.isPending ? <Loader2 className="animate-spin" /> : <Hammer />}
                {mend.isPending ? "Refining…" : "Refine"}
              </Button>
            </div>
            {empty && <p className="text-xs text-muted-foreground">Each spell you forge yields one Refinement Stone.</p>}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
