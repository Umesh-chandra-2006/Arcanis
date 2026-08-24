import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { SparkDots } from "@/components/SparkDots";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mapSpellToCardProps } from "@/lib/adapters";
import { Wand2, BookOpen } from "lucide-react";

export default function Library() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const mySpells = trpc.spells.mySpells.useQuery(undefined, { enabled: isAuthenticated });
  const sparkBalance = trpc.spells.sparkBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="font-serif text-lg font-semibold tracking-[0.22em] text-primary uppercase"
          >
            Arcanis
          </button>
          <nav className="flex items-center gap-2">
            <SparkDots balance={sparkBalance.data?.balance ?? 5} />
            <Button size="sm" onClick={() => navigate("/create")}>
              <Wand2 /> Create Spell
            </Button>
          </nav>
        </div>
      </header>

      <main className="container py-10">
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
              {mySpells.data.map((spell) => (
                <SpellCardWrapper key={spell.id} spell={mapSpellToCardProps(spell)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-14 text-center">
              <BookOpen className="size-10 text-muted-foreground/50" />
              <div>
                <p className="font-serif text-lg font-semibold">Your spellbook is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Forge your first spell — it costs 1 of your {sparkBalance.data?.balance ?? 5} Sparks.
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
      </main>
    </div>
  );
}