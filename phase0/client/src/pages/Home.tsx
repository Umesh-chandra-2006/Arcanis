import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readDraft, saveDraft } from "@/lib/draft";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SignInForm } from "@/components/SignInForm";
import { useAuth } from "@/contexts/AuthContext";
import { mapSpellToCardProps } from "@/lib/adapters";
import { SPARK } from "@shared/constants";
import { Wand2, Sparkles, Share2, Castle } from "lucide-react";

export default function Home() {
  const [params] = useSearchParams();
  const track = trpc.analytics.track.useMutation();
  const captureReferral = trpc.referrals.capture.useMutation();

  useEffect(() => {
    track.mutate({ eventType: "landing_view", metadata: { referrer: document.referrer.slice(0, 200) || undefined, path: "/" } }, { onError: () => {} });
    // An invite link lands here with ?ref=; remember it for the signup.
    const ref = params.get("ref");
    if (ref) captureReferral.mutate({ code: ref }, { onError: () => {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The landing page is the same for everyone (founder, 2026-10-15); a signed-in mage's home is the Sanctum.
  // It never waits for the session check: if the API is slow to wake, a visitor still sees the page,
  // as signed out, and the welcome panel replaces the sign-in form once the check answers.
  return <Landing />;
}

function Landing() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const featured = trpc.spells.baseSpells.useQuery(undefined, { staleTime: 10 * 60_000 });
  const examples = (featured.data ?? []).filter((s) => s.tier === "Mega").slice(0, 6);
  const codex = trpc.spells.codex.useQuery({ sort: "top", limit: 6 }, { staleTime: 60_000 });
  const fresh = (codex.data ?? []).map((e) => e.spell);
  const track = trpc.analytics.track.useMutation();
  // What the visitor types is kept as they type it, so following any sign-in link keeps it too.
  const [draftName, setDraftName] = useState(() => readDraft()?.name ?? "");
  const [draftText, setDraftText] = useState(() => readDraft()?.description ?? "");
  const [drafted, setDrafted] = useState<string | null>(() => readDraft()?.name || null);
  useEffect(() => {
    saveDraft({ name: draftName, description: draftText });
  }, [draftName, draftText]);

  // Try before signup: the design stays in this browser until the visitor has signed in and presses Create.
  const keepDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draftName.trim();
    const description = draftText.trim();
    if (!name || !description) return;
    saveDraft({ name, description });
    setDrafted(name);
    // A signed-in mage goes straight to the Lab, where the design waits.
    if (isAuthenticated) {
      navigate("/create");
      return;
    }
    track.mutate({ eventType: "landing_draft_started", metadata: {} }, { onError: () => {} });
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,75,0.10),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <p className="mb-4 text-[11px] uppercase tracking-[0.35em] text-primary/80">Describe it. Forge it. Share it.</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-6xl">
              Create spells.
              <br />
              <span className="text-primary">Share them.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
              Describe a spell in your own words. Arcanis forges its stats and lore, and gives it a page to share. {SPARK.signupGrant} free Spark on
              signup.
            </p>
            <form onSubmit={keepDraft} className="arc-panel arc-panel-gold mx-auto mt-8 max-w-xl space-y-3 p-4 text-left">
              <p className="font-serif text-base font-semibold">Start now: what is your first spell?</p>
              <Input placeholder="Its name, for example Ember Lance" value={draftName} maxLength={64} onChange={(e) => setDraftName(e.target.value)} aria-label="Spell name" />
              <Textarea
                placeholder="Describe it in your own words. What does it look like? What does it do?"
                value={draftText}
                maxLength={1000}
                onChange={(e) => setDraftText(e.target.value)}
                className="min-h-20"
                aria-label="Spell description"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a href="#featured" className="text-xs text-muted-foreground hover:text-primary">
                  See examples first
                </a>
                <Button type="submit" size="lg" disabled={!draftName.trim() || !draftText.trim()}>
                  <Sparkles /> Forge it, free
                </Button>
              </div>
            </form>
            <div className="mx-auto mt-10 grid max-w-lg grid-cols-1 gap-4 text-left sm:grid-cols-3">
              {[
                { icon: Wand2, title: "Describe", text: "Name it, choose its element, write its story." },
                { icon: Sparkles, title: "Forge", text: "Stats and lore, balanced and checked." },
                { icon: Share2, title: "Share", text: "A public page for every spell you create." },
              ].map((step) => (
                <div key={step.title} className="arc-panel p-3.5">
                  <step.icon className="size-4 text-primary" />
                  <p className="mt-2 font-serif text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section id="signup" className="mx-auto max-w-lg px-4 py-10">
        {isAuthenticated && user ? (
          <Panel title={user.nameChosen ? `Welcome back, ${user.username}` : "Welcome back, mage"} gold>
            <p className="mb-4 text-sm text-muted-foreground">Your sanctum awaits, and the Lab is ready for your next spell.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/sanctum">
                <Button>
                  <Castle /> Enter your Sanctum
                </Button>
              </Link>
              <Link to="/create">
                <Button variant="outline">
                  <Wand2 /> Research a spell
                </Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <Panel title={drafted ? `One step left to forge ${drafted}` : "Claim your free Spark"} gold>
            {drafted && (
              <p className="mb-3 text-sm text-muted-foreground">
                Your design is kept on this device. Sign in and it will be waiting in the Lab, with {SPARK.signupGrant} free Spark to forge it.
              </p>
            )}
            <SignInForm />
          </Panel>
        )}
      </section>

      {fresh.length >= 3 && (
        <section className="mx-auto max-w-5xl px-4 py-10">
          <Panel
            title="Honoured in the Codex"
            action={
              <Link to="/codex" className="text-xs text-primary hover:underline">
                Open the Codex
              </Link>
            }
          >
            <div className="flex flex-wrap justify-center gap-5">
              {fresh.map((spell) => (
                <SpellCardWrapper key={spell.id} spell={mapSpellToCardProps(spell)} size="sm" />
              ))}
            </div>
          </Panel>
        </section>
      )}

      <section id="featured" className="mx-auto max-w-5xl px-4 py-10">
        <Panel title="Spells of legend" gold>
          {featured.isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : examples.length ? (
            <div className="flex flex-wrap justify-center gap-5">
              {examples.map((spell) => (
                <SpellCardWrapper key={spell.id} spell={mapSpellToCardProps(spell)} size="sm" />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No legends yet. Be the first to forge one.</p>
          )}
        </Panel>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <p className="font-serif text-sm uppercase tracking-[0.3em] text-primary">Arcanis</p>
        <p className="mt-2">Create. Share. Prove the magic is real.</p>
      </footer>
    </div>
  );
}
