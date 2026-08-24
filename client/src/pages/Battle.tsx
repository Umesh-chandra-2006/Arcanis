import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Swords, Flag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Minigames } from "@/components/Minigames";
import { SpellCard } from "@/components/SpellCard";
import { mapSpellToCardProps } from "@/lib/adapters";
import { useSocketBattle } from "@/hooks/useSocketBattle";
import { Panel } from "@/components/game/panel";
import { VitalBar, XpBar } from "@/components/game/bars";

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
    if (!authLoading && !isInitialLoading && (!user || !battleState)) {
      navigate("/battle-select");
    }
  }, [authLoading, isInitialLoading, user, battleState, navigate]);

  useEffect(() => {
    if (!battleState || battleState.status !== "active") return;

    setTurnTimeLeft(30);

    const interval = setInterval(() => {
      setTurnTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [battleState?.activePlayer, battleState?.status]);

  if (authLoading || isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  if (!user || !battleState) {
    return null;
  }

  const isPlayerTurn =
    (battleState.activePlayer === 1 && battleState.player1Id === user.id) ||
    (battleState.activePlayer === 2 && battleState.player2Id === user.id);

  const opponent = battleState.player1Id === user.id ? battleState.player2 : battleState.player1;
  const isPlayer1 = battleState.player1Id === user.id;

  const playerHp = isPlayer1 ? battleState.player1Hp : battleState.player2Hp;
  const playerMp = isPlayer1 ? battleState.player1Mp : battleState.player2Mp;

  const opponentHp = isPlayer1 ? battleState.player2Hp : battleState.player1Hp;
  const opponentMp = isPlayer1 ? battleState.player2Mp : battleState.player1Mp;

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
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-balance">{battleState.terrain}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {battleState.status === "active" ? (
              <span className="text-primary font-medium">Battle Active — Turn {battleState.currentTurn}</span>
            ) : (
              `Battle Concluded — Winner: ${battleState.winner === user.id ? "You" : "Opponent"}`
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Player Panel */}
          <Panel gold={isPlayerTurn} title={user.username || "You"}>
            <div className="space-y-4">
              <VitalBar kind="hp" current={playerHp} max={100} />
              <VitalBar kind="mp" current={playerMp} max={100} />
              <div className="text-xs text-muted-foreground italic text-center pt-1 border-t border-border">
                {isPlayerTurn ? "Your turn to cast" : "Waiting for opponent"}
              </div>
            </div>
          </Panel>

          {/* Turn Timer */}
          <Panel title="Turn Clock" className="flex flex-col items-center justify-center text-center">
            <div className="space-y-3 py-2 w-full">
              <div className="font-serif text-4xl font-bold text-primary">{turnTimeLeft}s</div>
              <XpBar label="Turn Window" current={turnTimeLeft} next={30} />
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {isPlayerTurn ? "Your Turn" : "Opponent's Turn"}
              </p>
            </div>
          </Panel>

          {/* Opponent Panel */}
          <Panel gold={!isPlayerTurn && battleState.status === "active"} title={opponent?.username || "Opponent"}>
            <div className="space-y-4">
              <VitalBar kind="hp" current={opponentHp} max={100} />
              <VitalBar kind="mp" current={opponentMp} max={100} />
              <div className="text-xs text-muted-foreground italic text-center pt-1 border-t border-border">
                {!isPlayerTurn ? "Channeling..." : "Awaiting action"}
              </div>
            </div>
          </Panel>
        </div>

        {/* Deck Preview & Casting */}
        <Panel title="Active Spell Deck" action={<span className="text-xs text-muted-foreground">Select a spell to cast</span>}>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {deck && deck.length > 0 ? (
              deck.map((spell: any, idx: number) => (
                <SpellCard
                  key={spell.id}
                  spell={mapSpellToCardProps(spell)}
                  size="sm"
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
              <p className="text-muted-foreground col-span-full text-center py-8 text-sm">
                No spells in active deck. Visit The Lab to add spells to your deck.
              </p>
            )}
          </div>
        </Panel>

        {/* Battle Chronicle / Log */}
        <Panel title="Battle Chronicle">
          <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-xs custom-scrollbar">
            {battleState.battleLog && battleState.battleLog.length > 0 ? (
              battleState.battleLog.map((entry: any, idx: number) => (
                <div key={idx} className="p-2 rounded bg-secondary/40 border border-border/50 text-muted-foreground">
                  <span className="text-primary font-semibold">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{" "}
                  {entry.action}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4 italic font-sans">The chronicle begins as incantations are spoken...</p>
            )}
          </div>
        </Panel>

        {/* Battle Controls */}
        <div className="flex gap-4 justify-center pt-2">
          <Button
            onClick={handleEndTurn}
            disabled={!isPlayerTurn || endTurnMutation.isPending || battleState.status !== "active"}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 gap-2 font-medium"
          >
            {endTurnMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Passing Turn...
              </>
            ) : (
              <>
                <Swords size={16} />
                Pass Turn
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleForfeit}
            disabled={forfeitMutation.isPending || battleState.status !== "active"}
            className="px-6 gap-2"
          >
            {forfeitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Forfeiting...
              </>
            ) : (
              <>
                <Flag size={16} />
                Yield Match
              </>
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
