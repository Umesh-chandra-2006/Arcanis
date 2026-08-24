import { useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Panel } from "@/components/game/panel";
import { SpellCard } from "@/components/game/spell-card";
import { mapSpellToCardProps, elementAccent } from "@/lib/adapters";
import { Sparkles, Wand2 } from "lucide-react";

export default function ShareSpell() {
  const { spellId = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const spellQuery = trpc.spells.getSpellPublic.useQuery({ spellId });
  const recordOpen = trpc.spells.recordShareOpen.useMutation();
  const trackEvent = trpc.analytics.track.useMutation();
  const recordedRef = useRef(false);

  useEffect(() => {
    if (spellQuery.data && !recordedRef.current) {
      recordedRef.current = true;
      recordOpen.mutate({ spellId }, { onError: () => {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellQuery.data]);

  const handleCta = () => {
    trackEvent
      .mutateAsync({
        eventType: "share_page_cta_clicked",
        metadata: { spellId },
      })
      .catch(() => {});
    if (isAuthenticated) {
      navigate("/create");
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  };

  if (spellQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  const spell = spellQuery.data;

  if (!spell) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-serif text-2xl font-semibold">The Tower cannot find this spell</h1>
        <p className="text-sm text-muted-foreground">
          It may have been lost to the void. Create your own instead.
        </p>
        <Link to="/">
          <Button>
            <Wand2 /> Create a Spell
          </Button>
        </Link>
      </div>
    );
  }

  const card = mapSpellToCardProps(spell);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <Link
            to="/"
            className="font-serif text-lg font-semibold tracking-[0.22em] text-primary uppercase"
          >
            Arcanis
          </Link>
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            A spell forged by the Tower
          </span>
        </div>
      </header>

      <main className="container py-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8">
          <SpellCard spell={card} size="lg" />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="capitalize">
              {spell.element} element
            </Badge>
            <Badge variant="outline" className="capitalize">
              {spell.category}
            </Badge>
            <Badge variant="outline">{spell.castType}</Badge>
            <Badge variant="outline" className="border-primary/40 text-primary">
              {spell.tier}
            </Badge>
          </div>

          <Panel className="w-full max-w-xl" gold>
            <p className="text-center font-serif text-sm italic leading-relaxed text-foreground/90">
              "{spell.flavorText}"
            </p>
          </Panel>

          <div className="w-full max-w-xl">
            <Button size="lg" className="w-full" onClick={handleCta}>
              <Sparkles />
              Create Your Own Spell
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Describe a spell. The Tower forges stats, lore, and artwork. 5 free Sparks on signup.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}