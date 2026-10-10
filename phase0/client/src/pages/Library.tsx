import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Page } from "@/components/layout/page";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { ElementIcon } from "@/components/game/element-icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mapSpellToCardProps, type Phase0Spell } from "@/lib/adapters";
import { ELEMENTS, TIERS } from "@shared/taxonomy";
import { Wand2, BookOpen } from "lucide-react";

type Source = "all" | "mine" | "base";
const TIER_ORDER = Object.fromEntries(TIERS.map((t, i) => [t, i]));
const ELEMENT_ORDER = Object.fromEntries(ELEMENTS.map((e, i) => [e, i]));

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, React.ReactNode]> }) {
  return (
    <label className="flex min-w-32 flex-1 flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground sm:flex-none">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, node]) => (
            <SelectItem key={v} value={v}>
              {node}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function SpellGrid({ spells }: { spells: Phase0Spell[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
      {spells.map((spell) =>
        spell.researching ? (
          // Research: dimmed, no countdown, no time, no lock language (Master Doc 6.3).
          <div key={spell.id} className="relative">
            <div className="opacity-50 saturate-50">
              <SpellCardWrapper spell={mapSpellToCardProps(spell)} />
            </div>
            <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-primary/40 bg-background/90 px-3 py-0.5 text-[11px] uppercase tracking-[0.2em] text-primary">
              Researching
            </span>
          </div>
        ) : (
          <SpellCardWrapper key={spell.id} spell={mapSpellToCardProps(spell)} />
        )
      )}
    </div>
  );
}

export default function Library() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const mySpells = trpc.spells.mySpells.useQuery(undefined, { enabled: isAuthenticated });
  const baseSpells = trpc.spells.baseSpells.useQuery(undefined, { staleTime: 10 * 60_000 });
  const [source, setSource] = useState<Source>("all");
  const [element, setElement] = useState("all");
  const [category, setCategory] = useState("all");
  const [tier, setTier] = useState("all");

  useEffect(() => {
    // Wait for the session check; a reload must not bounce a signed-in player.
    if (!isLoading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, isLoading, navigate]);

  const matches = (s: Phase0Spell) =>
    (element === "all" || s.element === element) && (category === "all" || s.category === category) && (tier === "all" || s.tier === tier);
  const mine = useMemo(() => (mySpells.data ?? []).filter(matches), [mySpells.data, element, category, tier]);
  const base = useMemo(
    () =>
      (baseSpells.data ?? [])
        .filter(matches)
        .sort((a, b) => ELEMENT_ORDER[a.element] - ELEMENT_ORDER[b.element] || TIER_ORDER[a.tier] - TIER_ORDER[b.tier]),
    [baseSpells.data, element, category, tier]
  );
  const categories = useMemo(
    () => [...new Set([...(mySpells.data ?? []), ...(baseSpells.data ?? [])].map((s) => s.category))].sort(),
    [mySpells.data, baseSpells.data]
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  const loading = mySpells.isLoading || baseSpells.isLoading;
  const filtered = element !== "all" || category !== "all" || tier !== "all";

  return (
    <Page
      title="Spellbook"
      subtitle="Your own spells, and the base spells every mage begins with."
      action={
        <Link to="/create">
          <Button>
            <Wand2 /> Forge a spell
          </Button>
        </Link>
      }
    >
      <div className="arc-panel flex flex-wrap items-end gap-3 p-4">
        <Filter label="Show" value={source} onChange={(v) => setSource(v as Source)} options={[["all", "All spells"], ["mine", "My spells"], ["base", "Base spells"]]} />
        <Filter
          label="Element"
          value={element}
          onChange={setElement}
          options={[["all", "All elements"], ...ELEMENTS.map((e): [string, React.ReactNode] => [e, <span className="flex items-center gap-2"><ElementIcon element={e} size={14} />{e}</span>])]}
        />
        <Filter label="Category" value={category} onChange={setCategory} options={[["all", "All categories"], ...categories.map((c): [string, React.ReactNode] => [c, c])]} />
        <Filter label="Tier" value={tier} onChange={setTier} options={[["all", "All tiers"], ["Basic", "Basic"], ["Advanced", "Advanced"], ["Mega", "Mega"]]} />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setElement("all");
              setCategory("all");
              setTier("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : (
        <>
          {source !== "base" && (
            <Panel title="My spells" gold action={<span className="text-xs text-muted-foreground">{mine.length}</span>}>
              {mine.length > 0 ? (
                <SpellGrid spells={mine} />
              ) : (mySpells.data ?? []).length > 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">None of your spells match these filters.</p>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <BookOpen className="size-9 text-muted-foreground/50" />
                  <p className="font-serif text-lg font-semibold">You haven't forged a spell yet</p>
                  <p className="text-sm text-muted-foreground">Describe one in your own words. It costs 1 Spark.</p>
                  <Link to="/create">
                    <Button size="lg">
                      <Wand2 /> Create your first spell
                    </Button>
                  </Link>
                </div>
              )}
            </Panel>
          )}

          {source !== "mine" && (
            <Panel title="Base spells" action={<span className="text-xs text-muted-foreground">{base.length}</span>}>
              {base.length > 0 ? (
                <SpellGrid spells={base} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No base spells match these filters.</p>
              )}
            </Panel>
          )}
        </>
      )}
    </Page>
  );
}
