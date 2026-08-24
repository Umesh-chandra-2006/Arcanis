import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Panel } from "@/components/game/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpellCard } from "@/components/SpellCard";
import { mapSpellToCardProps } from "@/lib/adapters";
import { ALL_ELEMENTS, SPELL_TIERS } from "@shared/constants";
import { BookOpen, Sparkles, Search, Loader2, FlaskConical, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Spells() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"personal" | "platform">("personal");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedElement, setSelectedElement] = useState<string>("All");
  const [selectedTier, setSelectedTier] = useState<string>("All");

  const { data: library, isLoading } = trpc.lab.getLibrary.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const userSpells = library?.userSpells || [];
  const platformSpells = library?.platformSpells || [];

  const sourceSpells = activeTab === "personal" ? userSpells : platformSpells;

  // Filter spells by search, element, and tier
  const filteredSpells = sourceSpells.filter((spell: any) => {
    const matchesSearch =
      searchQuery === "" ||
      spell.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (spell.flavorText && spell.flavorText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (spell.loreLine && spell.loreLine.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesElement =
      selectedElement === "All" || spell.element.toLowerCase() === selectedElement.toLowerCase();

    const matchesTier =
      selectedTier === "All" || spell.tier.toLowerCase() === selectedTier.toLowerCase();

    return matchesSearch && matchesElement && matchesTier;
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-primary" />
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-wide">Spell Grimoire</h1>
            <p className="text-xs text-muted-foreground">
              Browse your forged spellbook ({userSpells.length} Spells) or explore the 36 Base Tower Spells ({platformSpells.length} Archives)
            </p>
          </div>
        </div>

        <Button
          onClick={() => navigate("/lab")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-xs font-medium"
        >
          <FlaskConical size={15} />
          Forge New Spell
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-medium transition-colors ${
            activeTab === "personal"
              ? "border-primary text-primary bg-primary/10"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles size={14} />
          Personal Spellbook ({userSpells.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("platform")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-medium transition-colors ${
            activeTab === "platform"
              ? "border-primary text-primary bg-primary/10"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Landmark size={14} />
          Tower Archives (36 Base Spells) ({platformSpells.length})
        </button>
      </div>

      {/* Filter Toolbar */}
      <Panel title={activeTab === "personal" ? "Filter Personal Grimoire" : "Filter Tower Archives"}>
        <div className="grid gap-4 sm:grid-cols-3 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spells by name or lore..."
              className="pl-9 bg-background/80 border-border text-xs focus:border-primary"
            />
          </div>

          {/* Element Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="spells-element-select" className="text-xs text-muted-foreground shrink-0 font-medium">Element:</label>
            <select
              id="spells-element-select"
              aria-label="Filter by Element"
              value={selectedElement}
              onChange={(e) => setSelectedElement(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary capitalize"
            >
              <option value="All">All Elements</option>
              {ALL_ELEMENTS.map((el) => (
                <option key={el} value={el}>
                  {el}
                </option>
              ))}
            </select>
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="spells-tier-select" className="text-xs text-muted-foreground shrink-0 font-medium">Tier:</label>
            <select
              id="spells-tier-select"
              aria-label="Filter by Tier"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="All">All Tiers</option>
              {SPELL_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* Spell Grid */}
      <Panel title={activeTab === "personal" ? "Personal Spells" : "Tower Base Platform Spells (36)"}>
        {filteredSpells.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
            {filteredSpells.map((spell: any) => (
              <div key={spell.id} className="flex justify-center">
                <SpellCard spell={mapSpellToCardProps(spell)} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground max-w-sm">
              {sourceSpells.length === 0
                ? "No spells found in this grimoire collection."
                : "No spells match your active filter criteria."}
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
