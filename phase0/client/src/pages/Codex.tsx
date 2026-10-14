import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Page } from "@/components/layout/page";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { CodexVotes } from "@/components/Codex";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mapSpellToCardProps } from "@/lib/adapters";
import { cn } from "@/lib/utils";
import { ScrollText, Wand2 } from "lucide-react";

/**
 * The Codex (Master Doc 23, v7.7): player spells their creators chose to show,
 * newest first or by votes. No sign-in needed to look; voting needs one.
 */
export default function Codex() {
  const [sort, setSort] = useState<"new" | "top">("new");
  const codex = trpc.spells.codex.useQuery({ sort, limit: 48 }, { staleTime: 30_000 });
  const entries = codex.data ?? [];

  return (
    <Page
      title="Codex"
      subtitle="Spells their creators chose to make known. Vote for the ones worth remembering."
      action={
        <Link to="/create">
          <Button>
            <Wand2 /> Research a spell
          </Button>
        </Link>
      }
    >
      <Panel
        title={sort === "new" ? "Newly inscribed" : "Most honoured"}
        gold
        action={
          <div className="flex rounded-full border border-border p-0.5 text-xs">
            {(["new", "top"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={cn("rounded-full px-3 py-1 transition-colors", sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary")}
              >
                {s === "new" ? "Newest" : "Top"}
              </button>
            ))}
          </div>
        }
      >
        {codex.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : entries.length ? (
          <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
            {entries.map((entry) => (
              <div key={entry.spell.id} className="flex flex-col items-center gap-2">
                <SpellCardWrapper spell={mapSpellToCardProps(entry.spell)} />
                <CodexVotes key={`${entry.spell.id}:${entry.up}:${entry.down}:${entry.myVote}`} spellId={entry.spell.id} ownerId={entry.spell.ownerId} up={entry.up} down={entry.down} myVote={entry.myVote} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ScrollText className="size-9 text-muted-foreground/50" />
            <p className="font-serif text-lg font-semibold">The Codex is still blank</p>
            <p className="text-sm text-muted-foreground">No mage has inscribed a spell here yet. Yours could be the first.</p>
          </div>
        )}
      </Panel>
    </Page>
  );
}
