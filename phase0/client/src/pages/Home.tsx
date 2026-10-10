import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readDraft, saveDraft } from "@/lib/draft";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Panel } from "@/components/game/panel";
import { Page } from "@/components/layout/page";
import { SpellCardWrapper } from "@/components/SpellCard";
import { ResearchTile } from "@/components/Research";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SignInForm } from "@/components/SignInForm";
import { useAuth } from "@/contexts/AuthContext";
import { mapSpellToCardProps } from "@/lib/adapters";
import { SPARK } from "@shared/constants";
import { Wand2, Sparkles, Share2, BookOpen } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
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

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  // A visitor who wrote a spell on the landing page and then signed in goes straight to the Lab, where it waits.
  if (isAuthenticated && user && readDraft()) return <Navigate to="/create" replace />;
  return isAuthenticated && user ? <MageHome name={user.nameChosen ? user.username : null} /> : <Landing />;
}

/** Home for a signed-in mage: what to do next, their latest spells, the base set. */
function MageHome({ name }: { name: string | null }) {
  const mySpells = trpc.spells.mySpells.useQuery();
  const baseSpells = trpc.spells.baseSpells.useQuery(undefined, { staleTime: 10 * 60_000 });
  const spark = trpc.spells.sparkBalance.useQuery();
  const recent = (mySpells.data ?? []).slice(0, 4);
  const sample = (baseSpells.data ?? []).filter((s) => s.tier === "Basic").slice(0, 6);

  return (
    <Page title={name ? `Welcome back, ${name}` : "Welcome, mage"} subtitle="Describe a spell. Arcanis forges the rest.">
      <Panel gold>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-xl font-semibold">What will you forge next?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {spark.data
                ? spark.data.balance > 0
                  ? `You have ${spark.data.balance} Spark. Each spell costs ${SPARK.creationCost}.`
                  : `You're out of Spark. ${SPARK.weeklyAllowance} more arrive every Monday.`
                : " "}
            </p>
          </div>
          <Link to="/create">
            <Button size="lg">
              <Wand2 /> Forge a spell
            </Button>
          </Link>
        </div>
      </Panel>

      <Panel
        title="Your latest spells"
        action={
          <Link to="/library" className="text-xs text-primary hover:underline">
            Open spellbook
          </Link>
        }
      >
        {mySpells.isLoading ? (
          <Spinner />
        ) : recent.length ? (
          <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
            {recent.map((spell) =>
              spell.researching ? (
                <ResearchTile key={spell.id} name={spell.name} element={spell.element} size="sm" />
              ) : (
                <SpellCardWrapper key={spell.id} spell={mapSpellToCardProps(spell)} size="sm" />
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <BookOpen className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nothing yet. Your first spell is one description away.</p>
          </div>
        )}
      </Panel>

      <Panel
        title="Base spells"
        action={
          <Link to="/library" className="text-xs text-primary hover:underline">
            See all 36
          </Link>
        }
      >
        {baseSpells.isLoading ? (
          <Spinner />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {sample.map((spell) => (
              <SpellCardWrapper key={spell.id} spell={mapSpellToCardProps(spell)} size="sm" />
            ))}
          </div>
        )}
      </Panel>
    </Page>
  );
}

function Landing() {
  const featured = trpc.spells.baseSpells.useQuery(undefined, { staleTime: 10 * 60_000 });
  const examples = (featured.data ?? []).filter((s) => s.tier === "Mega").slice(0, 6);
  const recent = trpc.spells.recent.useQuery(undefined, { staleTime: 60_000 });
  const fresh = (recent.data ?? []).slice(0, 6);
  const track = trpc.analytics.track.useMutation();
  const [draftName, setDraftName] = useState("");
  const [draftText, setDraftText] = useState("");
  const [drafted, setDrafted] = useState<string | null>(() => readDraft()?.name ?? null);

  // Try before signup: the design stays in this browser until the visitor has signed in and presses Create.
  const keepDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draftName.trim();
    const description = draftText.trim();
    if (!name || !description) return;
    saveDraft({ name, description });
    setDrafted(name);
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
        <Panel title={drafted ? `One step left to forge ${drafted}` : "Claim your free Spark"} gold>
          {drafted && (
            <p className="mb-3 text-sm text-muted-foreground">
              Your design is kept on this device. Sign in and it will be waiting in the Lab, with {SPARK.signupGrant} free Spark to forge it.
            </p>
          )}
          <SignInForm />
        </Panel>
      </section>

      {fresh.length >= 3 && (
        <section className="mx-auto max-w-5xl px-4 py-10">
          <Panel
            title="Freshly forged by mages"
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
