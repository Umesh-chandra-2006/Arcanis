import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { ElementIcon } from "@/components/game/element-icon";
import { cn } from "@/lib/utils";
import { Hourglass } from "lucide-react";
import { toast } from "sonner";

const POLL_MS = 60_000;

/**
 * A design still in research (Master Doc 6.3). Research comes first: the spell
 * has not been granted, so this is not a card. It shows only what the player
 * wrote, and no time, countdown or lock language.
 */
export function ResearchTile({ name, element, size = "md" }: { name: string; element: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "w-36", md: "w-48", lg: "w-64" }[size];
  return (
    <div
      className={cn(
        "relative flex aspect-[5/7] shrink-0 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-primary/30 bg-card/60 p-3 text-center",
        sizeClasses
      )}
      aria-label={`${name}: research under way`}
    >
      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/70">
        <ElementIcon element={element} size={14} />
      </span>
      <Hourglass className="size-6 text-primary/70" />
      <p className="font-serif text-sm font-semibold leading-tight text-foreground/80 text-balance">{name}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-primary/80">Research under way</p>
    </div>
  );
}

/**
 * Tells the player when a design finishes research and the spell is granted.
 * Mounted once in the app shell; polls only while something is in research.
 */
export function ResearchWatcher() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const spells = trpc.spells.mySpells.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: (query) => (query.state.data?.some((s) => s.researching) ? POLL_MS : false),
  });
  const inResearch = useRef(new Set<string>());

  useEffect(() => {
    if (!spells.data) return;
    for (const spell of spells.data) {
      if (spell.researching) {
        inResearch.current.add(spell.id);
      } else if (inResearch.current.delete(spell.id)) {
        toast.success(`Research complete: ${spell.name}`, {
          description: "The spell is granted to you. It waits in your Spellbook.",
          duration: 12_000,
          action: { label: "Open", onClick: () => navigate("/library") },
        });
      }
    }
  }, [spells.data, navigate]);

  return null;
}
