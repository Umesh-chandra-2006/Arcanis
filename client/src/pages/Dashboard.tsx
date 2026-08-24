import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Medal, Swords, FlaskConical } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Panel } from "@/components/game/panel";
import { VitalBar, XpBar, AffinityBar } from "@/components/game/bars";
import { SpellCard } from "@/components/SpellCard";
import { mapSpellToCardProps } from "@/lib/adapters";
import { ElementIcon } from "@/components/game/element-icon";
import { ALL_ELEMENTS } from "@shared/constants";

const AVATAR_ELEMENT_MAP: Record<string, string> = {
  ashen: "Arcane",
  emberveil: "Fire",
  tidecaller: "Water",
  galeborn: "Wind",
  stonewarden: "Earth",
  voidwalker: "Void",
  dawnbringer: "Light",
  chaosborn: "Chaos",
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: recentBattles } = trpc.game.getRecentBattles.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: deck } = trpc.lab.getDeck.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  // Derive qualitative Will state based on user's stats
  const willStateText = "Your thoughts feel clear tonight. The ley lines whisper of untamed potential.";

  // Mock elemental affinities (0-100) mapped to the 12 elements
  const userAffinities: Record<string, number> = {
    fire: user.avatar === "emberveil" ? 85 : 45,
    water: user.avatar === "tidecaller" ? 85 : 30,
    wind: user.avatar === "galeborn" ? 85 : 40,
    earth: user.avatar === "stonewarden" ? 85 : 50,
    lightning: user.avatar === "chaosborn" ? 80 : 35,
    void: user.avatar === "voidwalker" ? 90 : 25,
    arcane: 65,
    light: user.avatar === "dawnbringer" ? 85 : 30,
    shadow: user.avatar === "ashen" ? 80 : 40,
    nature: 40,
    frost: 35,
    chaos: user.avatar === "chaosborn" ? 85 : 20,
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8 bg-background min-h-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-wide">Dashboard</h1>
          <p className="text-sm text-muted-foreground">The state of your craft, at a glance.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate("/battle-select")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <Swords size={16} />
            Enter Arena
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/lab")}
            className="border-primary/40 hover:bg-primary/10 gap-2"
          >
            <FlaskConical size={16} />
            The Lab
          </Button>
        </div>
      </header>

      {/* Character Summary */}
      <Panel gold className="overflow-hidden">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="h-28 w-28 shrink-0 rounded-md border border-primary/40 bg-secondary/60 flex flex-col items-center justify-center gap-2 shadow-inner">
            <ElementIcon element={AVATAR_ELEMENT_MAP[user.avatar] || "Arcane"} size={44} />
            <span className="text-[10px] font-medium tracking-wider uppercase text-primary/80">{user.avatar}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-serif text-2xl font-semibold">{user.username}</h2>
              <span className="text-sm italic text-muted-foreground">({user.email})</span>
            </div>
            <p className="mt-0.5 text-sm text-primary">
              Practitioner of Arcanis
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <VitalBar kind="hp" current={user.hp || 100} max={100} />
              <VitalBar kind="mp" current={user.mp || 100} max={100} />
            </div>

            {/* Will is displayed ONLY as qualitative text, per design specification */}
            <p className="mt-4 text-sm italic leading-relaxed text-muted-foreground">
              "{willStateText}"
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5 rounded-md border border-border bg-background/60 px-5 py-4">
            <Medal size={22} className="text-primary" />
            <span className="font-serif text-lg font-semibold capitalize">{user.role || "Mage"}</span>
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Active Attunement
            </span>
          </div>
        </div>
      </Panel>

      {/* Phase 2 Progression UI hidden in Phase 1 per Scope Boundary spec */}
      {false && (
        <>
          <div className="grid gap-5 sm:grid-cols-3">
            <Panel title="Circle XP">
              <XpBar label="Toward Next Circle" current={3400} next={5000} />
            </Panel>
            <Panel title="Spell XP">
              <XpBar label="Craft Mastery" current={1250} next={2000} />
            </Panel>
            <Panel title="Elemental XP">
              <XpBar label="Attunement Depth" current={890} next={1500} />
            </Panel>
          </div>

          <Panel title="Elemental Affinity">
            <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {ALL_ELEMENTS.map((el) => (
                <AffinityBar key={el} element={el} value={userAffinities[el.toLowerCase()] ?? 30} />
              ))}
            </div>
          </Panel>
        </>
      )}

      {/* Recent Battles */}
      <Panel title="Recent Battles">
        {!recentBattles || recentBattles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No battles recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recentBattles.map((b) => {
              const isVictory = b.winnerId === user.id;
              return (
                <li key={b.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={`w-16 shrink-0 text-xs font-medium ${
                      isVictory ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {isVictory ? "Victory" : "Defeat"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.terrain}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {b.turnsPlayed} turns played
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Active Deck Preview */}
      <Panel title="Active Deck">
        {deck && deck.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {deck.map((spell: any) => (
              <SpellCard key={spell.id} spell={mapSpellToCardProps(spell)} size="sm" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No spells in active deck. Visit The Lab to forge new spells.
          </p>
        )}
      </Panel>
    </div>
  );
}
