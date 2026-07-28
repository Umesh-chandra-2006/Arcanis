import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Minigames } from "@/components/Minigames";
import { SpellCard } from "@/components/SpellCard";
import { mapSpellToCardProps } from "@/lib/adapters";
import { useSocketBattle } from "@/hooks/useSocketBattle";

export default function Battle() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { battleId } = useParams();
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [selectedSpellIndex, setSelectedSpellIndex] = useState<number | null>(null);
  const [showMinigame, setShowMinigame] = useState(false);
  const [minigameType, setMinigameType] = useState<string | null>(null);

  const { data: initialBattleState, isLoading: isInitialLoading } = trpc.game.getBattleState.useQuery(
    { battleId: battleId || "" },
    { enabled: !!battleId && !!user }
  );

  const { battleState: socketState } = useSocketBattle(battleId || "", user?.id);

  const battleState = socketState || initialBattleState;

  const { data: deck } = trpc.lab.getDeck.useQuery(undefined, { enabled: !!user });

  const castSpellMutation = trpc.game.castSpell.useMutation({
    onSuccess: () => {
      setShowMinigame(false);
      setSelectedSpellIndex(null);
      toast.success("Spell cast successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cast spell");
    },
  });

  const endTurnMutation = trpc.game.endTurn.useMutation({
    onSuccess: () => {
      setTurnTimeLeft(30);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to end turn");
    },
  });

  const forfeitMutation = trpc.game.forfeit.useMutation({
    onSuccess: () => {
      toast.success("Battle forfeited.");
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to forfeit");
    },
  });

  useEffect(() => {
    if (!battleState || battleState.status !== "active") return;

    // Reset turn timer when turn flips
    setTurnTimeLeft(30);

    const interval = setInterval(() => {
      setTurnTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [battleState?.activePlayer, battleState?.status]);

  if (authLoading || isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user || !battleState) {
    navigate("/battle-select");
    return null;
  }

  const isPlayerTurn =
    (battleState.activePlayer === 1 && battleState.player1Id === user.id) ||
    (battleState.activePlayer === 2 && battleState.player2Id === user.id);

  const opponent = battleState.player1Id === user.id ? battleState.player2 : battleState.player1;

  const handleCastSpell = (spellIndex: number, accuracy: number) => {
    if (!deck || !deck[spellIndex]) return;

    castSpellMutation.mutate({
      battleId: battleId || "",
      spellId: deck[spellIndex].id,
      minigameAccuracy: accuracy,
    });
  };

  const handleEndTurn = () => {
    endTurnMutation.mutate({ battleId: battleId || "" });
  };

  const handleForfeit = () => {
    forfeitMutation.mutate({ battleId: battleId || "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">{battleState.terrain}</h1>
          <p className="text-muted-foreground">
            {battleState.status === "active" ? "Battle Active" : `Battle Finished — Winner: ${battleState.winner === user.id ? "You" : "Opponent"}`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className={isPlayerTurn && battleState.player1Id === user.id ? "text-primary" : ""}>
                {battleState.player1?.username || "Player 1"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">HP</span>
                  <span className="text-sm">{battleState.player1Hp}/100</span>
                </div>
                <Progress value={battleState.player1Hp} max={100} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">MP</span>
                  <span className="text-sm">{battleState.player1Mp}/100</span>
                </div>
                <Progress value={battleState.player1Mp} max={100} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Turn Timer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold text-center">{turnTimeLeft}s</div>
              <Progress value={turnTimeLeft} max={30} />
              <p className="text-sm text-center text-muted-foreground">
                {isPlayerTurn ? "Your Turn" : "Opponent's Turn"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={isPlayerTurn && battleState.player2Id === user.id ? "text-primary" : ""}>
                {opponent?.username || "Opponent"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">HP</span>
                  <span className="text-sm">{battleState.player2Hp}/100</span>
                </div>
                <Progress value={battleState.player2Hp} max={100} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">MP</span>
                  <span className="text-sm">{battleState.player2Mp}/100</span>
                </div>
                <Progress value={battleState.player2Mp} max={100} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Spells</CardTitle>
            <CardDescription>Click a card to view details or cast it</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {deck && deck.length > 0 ? (
                deck.map((spell: any, idx: number) => (
                  <SpellCard
                    key={spell.id}
                    spell={mapSpellToCardProps(spell)}
                    onCast={() => {
                      if (!isPlayerTurn) {
                        toast.error("Not your turn");
                        return;
                      }
                      setSelectedSpellIndex(idx);
                      setMinigameType(spell.element);
                      setShowMinigame(true);
                    }}
                  />
                ))
              ) : (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  No spells in deck. Customize your deck in the library.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Battle Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {battleState.battleLog && battleState.battleLog.length > 0 ? (
                battleState.battleLog.map((entry: any, idx: number) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    [{new Date(entry.timestamp).toLocaleTimeString()}] {entry.action}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground">Battle started...</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mt-8 justify-center">
          <Button
            onClick={handleEndTurn}
            disabled={!isPlayerTurn || endTurnMutation.isPending || battleState.status !== "active"}
            size="lg"
          >
            {endTurnMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ending Turn...
              </>
            ) : (
              "End Turn"
            )}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={handleForfeit}
            disabled={forfeitMutation.isPending || battleState.status !== "active"}
          >
            {forfeitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Forfeiting...
              </>
            ) : (
              "Forfeit"
            )}
          </Button>
        </div>
      </div>

      {showMinigame && minigameType && (
        <Minigames
          type={minigameType}
          onComplete={(accuracy: number) => {
            if (selectedSpellIndex !== null) {
              handleCastSpell(selectedSpellIndex, accuracy);
            }
          }}
          onCancel={() => setShowMinigame(false)}
        />
      )}
    </div>
  );
}
