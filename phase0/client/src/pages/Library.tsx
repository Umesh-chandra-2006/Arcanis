import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Page } from "@/components/layout/page";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { SparkDots } from "@/components/SparkDots";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mapSpellToCardProps } from "@/lib/adapters";
import { Wand2, BookOpen, LogOut } from "lucide-react";

export default function Library() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const mySpells = trpc.spells.mySpells.useQuery(undefined, { enabled: isAuthenticated });
  const sparkBalance = trpc.spells.sparkBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    // Wait for the session check; a reload must not bounce a signed-in player.
    if (!isLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div>

      <Page title="Spellbook" subtitle="Every spell you have forged.">
        <Panel
          title="My Spellbook"
          gold
          action={
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="size-3.5" />
              {mySpells.data?.length ?? 0} spells
            </span>
          }
        >
          {mySpells.isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : mySpells.data && mySpells.data.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-5">
              {mySpells.data.map((spell) =>
                spell.researching ? (
                  // Research: dimmed, no countdown, no time, no lock language (Master Doc 6.3).
                  <div key={spell.id} className="relative">
                    <div className="opacity-50 saturate-50">
                      <SpellCardWrapper spell={mapSpellToCardProps(spell)} />
                    </div>
                    <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-primary/40 bg-background/90 px-3 py-0.5 text-[11px] uppercase tracking-[0.2em] text-primary">
                      Researching
                    </span>
                  </div>
                ) : (
                  <SpellCardWrapper key={spell.id} spell={mapSpellToCardProps(spell)} />
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-14 text-center">
              <BookOpen className="size-10 text-muted-foreground/50" />
              <div>
                <p className="font-serif text-lg font-semibold">Your spellbook is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Forge your first spell. It costs 1 of your {sparkBalance.data?.balance ?? 5} Spark.
                </p>
              </div>
              <Link to="/create">
                <Button size="lg">
                  <Wand2 /> Create Your First Spell
                </Button>
              </Link>
            </div>
          )}
        </Panel>
      </Page>
    </div>
  );
}