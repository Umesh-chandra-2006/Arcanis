import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, FlaskConical } from "lucide-react";
import { ALL_ELEMENTS } from "@shared/constants";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Panel } from "@/components/game/panel";
import { XpBar } from "@/components/game/bars";
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
      toast.success("Spell forged! Research initiated...");
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
        <Loader2 className="animate-spin text-primary h-8 w-8" />
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

  const now = Date.now();
  const researchingSpells = userSpells.filter((s: any) => {
    if (s.researchStatus !== "researching") return false;
    const startTime = s.researchStartedAt
      ? new Date(s.researchStartedAt).getTime()
      : s.createdAt
      ? new Date(s.createdAt).getTime()
      : now;
    return now - startTime < 5000;
  });
  const completedSpells = userSpells.filter(
    (s: any) => !researchingSpells.some((r: any) => r.id === s.id)
  );

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
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-semibold tracking-wide flex items-center gap-3">
            <FlaskConical className="text-primary" size={28} />
            The Lab
          </h1>
          <p className="text-sm text-muted-foreground">Forge AI-crafted spells tailored to your magical affinity.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Spell Creation Form */}
          <Panel gold title="Forge Spell" className="lg:col-span-1">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="spell-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Spell Name
                </Label>
                <Input
                  id="spell-name"
                  value={spellName}
                  onChange={(e) => setSpellName(e.target.value)}
                  placeholder="e.g., Inferno Lash"
                  className="bg-background/80 border-border text-foreground focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="element" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Elemental Affinity
                </Label>
                <Select value={element} onValueChange={setElement}>
                  <SelectTrigger id="element" className="bg-background/80 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {ALL_ELEMENTS.map((el) => (
                      <SelectItem key={el} value={el} className="capitalize">
                        {el}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Spell Concept
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the incantation, effect, and visual manifestation..."
                  rows={4}
                  className="bg-background/80 border-border text-foreground focus:ring-primary resize-none"
                />
              </div>

              <Button
                onClick={handleCreateSpell}
                disabled={isCreating}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-medium"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Channelling LLM...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Forge Spell
                  </>
                )}
              </Button>

              <div className="pt-3 border-t border-border">
                <XpBar label="Weekly Spell Capacity" current={usedSlots} next={limitSlots} />
                <p className="text-[11px] text-muted-foreground mt-1.5 text-right">
                  {usedSlots} / {limitSlots} slots utilized
                </p>
              </div>
            </div>
          </Panel>

          {/* Research Queue & Library */}
          <div className="lg:col-span-2 space-y-6">
            <ResearchQueue items={researchItems} />

            <Panel title="Personal Spellbook" action={<span className="text-xs text-muted-foreground">{completedSpells.length} Spells</span>}>
              {completedSpells.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {completedSpells.map((spell: any) => (
                    <SpellCard key={spell.id} spell={mapSpellToCardProps(spell)} size="sm" />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Your forged spells will appear here once ready. Channel a spell to begin.
                </p>
              )}
            </Panel>
          </div>
        </div>

        {/* Platform Spells Grid */}
        <Panel title="Tower Archives" action={<span className="text-xs text-muted-foreground">36 Base Spells</span>}>
          {platformSpells && platformSpells.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {platformSpells.map((spell: any) => (
                <SpellCard key={spell.id} spell={mapSpellToCardProps(spell)} size="sm" />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-primary h-6 w-6" />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
