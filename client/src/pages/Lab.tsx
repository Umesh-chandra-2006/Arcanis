import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { ALL_ELEMENTS } from "@shared/constants";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SpellCard } from "@/components/SpellCard";
import { ResearchQueue } from "@/components/ResearchQueue";
import { mapSpellToCardProps } from "@/lib/adapters";
export default function Lab() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [spellName, setSpellName] = useState("");
  const [element, setElement] = useState("Fire");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: library, refetch: refetchLibrary } = trpc.lab.getLibrary.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: (query: any) => {
      const hasResearching = query?.state?.data?.userSpells?.some((s: any) => s.researchStatus === "researching");
      return hasResearching ? 2000 : false;
    },
  });

  const { data: weeklyStatus, refetch: refetchWeekly } = trpc.lab.getWeeklyStatus.useQuery(undefined, {
    enabled: !!user,
  });

  const userSpells = library?.userSpells || [];
  const platformSpells = library?.platformSpells || [];

  const createSpellMutation = trpc.lab.createSpell.useMutation({
    onSuccess: () => {
      toast.success("Spell created! Research started...");
      setSpellName("");
      setDescription("");
      setIsCreating(false);
      refetchLibrary();
      refetchWeekly();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create spell");
      setIsCreating(false);
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const handleCreateSpell = () => {
    if (!spellName.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsCreating(true);
    createSpellMutation.mutate({
      name: spellName,
      element: element as any,
      description,
    });
  };

  const researchingSpells = userSpells.filter((s: any) => s.researchStatus === "researching");
  const completedSpells = userSpells.filter((s: any) => s.researchStatus === "ready");

  const researchItems = researchingSpells.map((s: any) => ({
    spellId: s.id,
    spellName: s.name,
    startTime: s.researchStartedAt ? new Date(s.researchStartedAt).getTime() : Date.now(),
    durationMs: s.researchComplexityScore ? s.researchComplexityScore * 1000 : 5000,
  }));

  const usedSlots = weeklyStatus?.used ?? 0;
  const limitSlots = weeklyStatus?.limit ?? 3;

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8">The Lab</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Spell Creation Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Create Spell</CardTitle>
              <CardDescription>Design your next spell</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="spell-name">Spell Name</Label>
                <Input
                  id="spell-name"
                  value={spellName}
                  onChange={(e) => setSpellName(e.target.value)}
                  placeholder="e.g., Inferno Blast"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="element">Element</Label>
                <Select value={element} onValueChange={setElement}>
                  <SelectTrigger id="element">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ELEMENTS.map((el) => (
                      <SelectItem key={el} value={el}>
                        {el}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your spell concept..."
                  rows={4}
                />
              </div>

              <Button
                onClick={handleCreateSpell}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Spell"
                )}
              </Button>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Weekly Slots</p>
                <Progress value={usedSlots} max={limitSlots} />
                <p className="text-xs text-muted-foreground mt-1">
                  {usedSlots} / {limitSlots} used
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Research Queue & Stats */}
          <div className="lg:col-span-2 space-y-6">
            <ResearchQueue items={researchItems} />

            <Card>
              <CardHeader>
                <CardTitle>Spell Library</CardTitle>
                <CardDescription>{completedSpells.length} custom spell(s) owned</CardDescription>
              </CardHeader>
              <CardContent>
                {completedSpells.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedSpells.map((spell: any) => (
                      <SpellCard key={spell.id} spell={mapSpellToCardProps(spell)} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Your completed spells will appear here. Build one to begin.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Platform Spells Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Spells</CardTitle>
            <CardDescription>36 base spells available to all players</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platformSpells && platformSpells.length > 0 ? (
                platformSpells.map((spell: any) => (
                  <SpellCard key={spell.id} spell={mapSpellToCardProps(spell)} />
                ))
              ) : (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Loading platform spells...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
