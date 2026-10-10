import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Page } from "@/components/layout/page";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mapSpellToCardProps } from "@/lib/adapters";
import { ScrollText, Wand2 } from "lucide-react";

/** The public wall of newest player spells (Master Doc 23, v7.6). No sign-in needed to look. */
export default function Codex() {
  const recent = trpc.spells.recent.useQuery(undefined, { staleTime: 60_000 });
  const spells = recent.data ?? [];

  return (
    <Page
      title="Codex"
      subtitle="The newest spells forged by mages of Arcanis."
      action={
        <Link to="/create">
          <Button>
            <Wand2 /> Forge a spell
          </Button>
        </Link>
      }
    >
      <Panel title="Freshly forged" gold action={<span className="text-xs text-muted-foreground">{spells.length || ""}</span>}>
        {recent.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : spells.length ? (
          <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
            {spells.map((spell) => (
              <SpellCardWrapper key={spell.id} spell={mapSpellToCardProps(spell)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ScrollText className="size-9 text-muted-foreground/50" />
            <p className="font-serif text-lg font-semibold">The Codex is still blank</p>
            <p className="text-sm text-muted-foreground">No mage has written in it yet. Yours could be the first spell here.</p>
          </div>
        )}
      </Panel>
    </Page>
  );
}
