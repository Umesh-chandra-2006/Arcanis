import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TERRAINS } from "@shared/constants";


const TERRAIN_EMOJIS: Record<string, string> = {
  "Volcanic Wastes": "🌋",
  "Frozen Tundra": "❄️",
  "Verdant Grove": "🌲",
  "Starlit Void": "⭐",
  "Crystalline Cavern": "💎",
  "Tempest Peak": "⛈️",
};

const TERRAIN_BONUSES: Record<string, string> = {
  "Volcanic Wastes": "+20% Fire damage",
  "Frozen Tundra": "+20% Frost damage",
  "Verdant Grove": "+20% Nature damage",
  "Starlit Void": "+20% Arcane damage",
  "Crystalline Cavern": "+15% all element damage",
  "Tempest Peak": "+20% Lightning damage",
};

export default function BattleSelect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const createBattleMutation = trpc.game.createBotBattle.useMutation({
    onSuccess: (battle) => {
      toast.success("Battle started!");
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
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const handleStartBattle = (terrain: string) => {
    createBattleMutation.mutate({ terrain });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold mb-2">Open Brawl</h1>
        <p className="text-muted-foreground mb-8">Choose a terrain and battle an opponent</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TERRAINS.map((terrain) => (
            <Card
              key={terrain}
              className="hover:shadow-lg transition-all cursor-pointer overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="text-5xl mb-2">{TERRAIN_EMOJIS[terrain] || "🗺️"}</div>
                <CardTitle>{terrain}</CardTitle>
                <CardDescription>{TERRAIN_BONUSES[terrain]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>• Unique terrain modifiers</p>
                  <p>• Random opponent</p>
                  <p>• 30-second turns</p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleStartBattle(terrain)}
                  disabled={createBattleMutation.isPending}
                >
                  {createBattleMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    "Start Battle"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Matchmaking Queue</CardTitle>
            <CardDescription>Join the queue to battle other players</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Join Matchmaking Queue (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
