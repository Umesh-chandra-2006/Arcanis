import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";


export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: recentBattles } = trpc.game.getRecentBattles.useQuery(undefined, {
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
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Player Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl text-center mb-2">
                {user.avatar === "ashen" && "🌑"}
                {user.avatar === "emberveil" && "🔥"}
                {user.avatar === "tidecaller" && "💧"}
                {user.avatar === "galeborn" && "💨"}
                {user.avatar === "stonewarden" && "🪨"}
                {user.avatar === "voidwalker" && "⚫"}
                {user.avatar === "dawnbringer" && "☀️"}
                {user.avatar === "chaosborn" && "🌀"}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-semibold">{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold text-sm">{user.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">HP</span>
                  <span className="text-sm">{user.hp}/100</span>
                </div>
                <Progress value={user.hp} max={100} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">MP</span>
                  <span className="text-sm">{user.mp}/100</span>
                </div>
                <Progress value={user.mp} max={100} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Will Cap</span>
                  <span className="text-sm">{user.willCap}</span>
                </div>
                <Progress value={Math.min(user.willCap, 250)} max={250} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => navigate("/lab")}>
                Go to Lab
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/battle-select")}>
                Start Battle
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Battles</CardTitle>
            <CardDescription>{recentBattles?.length || 0} battles played</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentBattles || recentBattles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No battles yet. Start your first battle!</p>
            ) : (
              <div className="space-y-2">
                {recentBattles.map((battle) => (
                  <div key={battle.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">{battle.terrain}</p>
                      <p className="text-xs text-muted-foreground">
                        {battle.winnerId === user.id ? "✓ Victory" : "✗ Defeat"}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">{battle.turnsPlayed} turns</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
