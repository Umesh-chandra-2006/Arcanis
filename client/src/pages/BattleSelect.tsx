import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Swords, Compass } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TERRAINS } from "@shared/constants";
import { Panel } from "@/components/game/panel";
import { ElementIcon } from "@/components/game/element-icon";

const TERRAIN_ELEMENTS: Record<string, string> = {
  "Volcanic Wastes": "fire",
  "Frozen Tundra": "frost",
  "Verdant Grove": "nature",
  "Starlit Void": "arcane",
  "Crystalline Cavern": "light",
  "Tempest Peak": "lightning",
};

const TERRAIN_BONUSES: Record<string, string> = {
  "Volcanic Wastes": "+15% Fire/Chaos DMG, -10% MP cost",
  "Frozen Tundra": "+15% Frost/Water DMG, -10% MP cost",
  "Verdant Grove": "+15% Nature/Earth DMG, -10% MP cost",
  "Starlit Void": "+15% Arcane/Void DMG, -10% MP cost",
  "Crystalline Cavern": "+15% Light/Shadow DMG, -10% MP cost",
  "Tempest Peak": "+15% Lightning/Wind DMG, -10% MP cost",
};

export default function BattleSelect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const createBattleMutation = trpc.game.createBotBattle.useMutation({
    onSuccess: (battle) => {
      toast.success("Entering the arena...");
      navigate(`/battle/${battle.battleId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create battle");
    },
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

  const handleStartBattle = (terrain: string) => {
    createBattleMutation.mutate({ terrain });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-semibold tracking-wide flex items-center gap-3">
            <Swords className="text-primary" size={28} />
            Open Brawl
          </h1>
          <p className="text-sm text-muted-foreground">Select a terrain for your trial by combat.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TERRAINS.map((terrain) => {
            const element = TERRAIN_ELEMENTS[terrain] || "arcane";
            const bonusText = TERRAIN_BONUSES[terrain] || "+15% Damage Bonus";

            return (
              <Panel key={terrain} gold className="hover:border-primary/60 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md border border-primary/30 bg-secondary/80">
                      <ElementIcon element={element} size={24} />
                    </span>
                    <div>
                      <h3 className="font-serif text-lg font-semibold">{terrain}</h3>
                      <p className="text-xs text-primary font-mono">{bonusText}</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 py-2 border-t border-border">
                    <p className="flex items-center gap-2">
                      <Compass size={12} className="text-primary" />
                      Domain of elemental attunement
                    </p>
                    <p>• Tactical 30-second turn timers</p>
                    <p>• Interactive spell minigames</p>
                  </div>

                  <Button
                    onClick={() => handleStartBattle(terrain)}
                    disabled={createBattleMutation.isPending}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  >
                    {createBattleMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Commencing...
                      </>
                    ) : (
                      "Engage Opponent"
                    )}
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>

        {/* Ranked Matchmaking Chamber - Phase 3 Animus Ranked scope (dormant) */}
        {false && (
          <Panel title="Matchmaking Chamber">
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
              <p className="text-sm text-muted-foreground max-w-md">
                Ranked PvP Matchmaking across all circles is currently under ward protection.
              </p>
              <Button variant="outline" disabled className="border-border text-muted-foreground">
                Ranked Matchmaking (Unsealing Soon)
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
