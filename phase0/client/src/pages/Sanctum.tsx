import { Link, Navigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Panel } from "@/components/game/panel";
import { Page } from "@/components/layout/page";
import { SpellCardWrapper } from "@/components/SpellCard";
import { ResearchTile } from "@/components/Research";
import { CodexVotes } from "@/components/Codex";
import { ForgeQueuePanel } from "@/components/ForgeQueue";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { hasUndeliveredDraft } from "@/lib/draft";
import { mapSpellToCardProps } from "@/lib/adapters";
import { SPARK } from "@shared/constants";
import { Wand2, Share2, BookOpen, ScrollText, ChevronUp, CheckCircle2, Circle } from "lucide-react";

/** /sanctum: signed-in mages only. Everyone else goes to the landing page. */
export default function Sanctum() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return <Navigate to="/" replace />;
  // A visitor who wrote a spell on the landing page and then signed in goes straight to the Lab, where it waits.
  if (hasUndeliveredDraft()) return <Navigate to="/create" replace />;
  return <MageHome name={user.nameChosen ? user.username : null} />;
}

/**
 * The Sanctum: a signed-in mage's home. It does not repeat the Spellbook (which
 * holds the spells): it shows standing, the next steps, what is under research,
 * and what is rising in the Codex (founder, 2026-10-15).
 */
function MageHome({ name }: { name: string | null }) {
  const { user } = useAuth();
  const mySpells = trpc.spells.mySpells.useQuery();
  const spark = trpc.spells.sparkBalance.useQuery();
  const standing = trpc.spells.standing.useQuery();
  const feedback = trpc.feedback.given.useQuery(undefined, { staleTime: Infinity });
  const rising = trpc.spells.codex.useQuery({ sort: "top", limit: 4 }, { staleTime: 60_000 });
  const researching = (mySpells.data ?? []).filter((s) => s.researching);
  const s = standing.data;

  const path = [
    { done: !!user?.nameChosen, label: "Choose your mage name", hint: "Open your profile at the bottom of the sidebar.", to: null },
    { done: (s?.created ?? 0) > 0, label: "Research your first spell", hint: "Describe it in the Lab.", to: "/create" },
    { done: (s?.inCodex ?? 0) > 0, label: "Inscribe a spell in the Codex", hint: "Open a spell in your Spellbook.", to: "/library" },
    { done: (s?.shareOpens ?? 0) > 0, label: "Have another mage open your spell's page", hint: "Share its link anywhere.", to: "/library" },
    { done: !!feedback.data?.given, label: "Tell the makers what you think", hint: "A minute on the feedback page.", to: "/feedback" },
  ];
  const pathDone = path.every((p) => p.done);

  return (
    <Page title={name ? `Welcome back, ${name}` : "Welcome, mage"} subtitle="Your sanctum. Your spells live in the Spellbook; here is where you stand.">
      <Panel gold>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-xl font-semibold">What will you research next?</p>
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
              <Wand2 /> Research a spell
            </Button>
          </Link>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: BookOpen, label: "Spells written", value: s?.created },
          { icon: ScrollText, label: "In the Codex", value: s?.inCodex },
          { icon: ChevronUp, label: "Honours received", value: s?.upvotes },
          { icon: Share2, label: "Page opens", value: s?.shareOpens },
        ].map((tile) => (
          <div key={tile.label} className="arc-panel p-4">
            <tile.icon className="size-4 text-primary" />
            <p className="mt-2 font-serif text-2xl font-semibold tabular-nums">{tile.value ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{tile.label}</p>
          </div>
        ))}
      </div>

      {!pathDone && (
        <Panel title="The path of the initiate">
          <ol className="space-y-2.5">
            {path.map((step) => (
              <li key={step.label} className="flex items-start gap-3">
                {step.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />}
                <div className="min-w-0">
                  {step.to && !step.done ? (
                    <Link to={step.to} className="text-sm hover:text-primary hover:underline">
                      {step.label}
                    </Link>
                  ) : (
                    <p className={step.done ? "text-sm text-muted-foreground line-through" : "text-sm"}>{step.label}</p>
                  )}
                  {!step.done && <p className="text-xs text-muted-foreground">{step.hint}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <div className="empty:hidden">
        <ForgeQueuePanel />
      </div>

      {researching.length > 0 && (
        <Panel title="Under research">
          <p className="mb-3 text-sm text-muted-foreground">These designs are being studied. Each is granted to you when its research is complete.</p>
          <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
            {researching.map((spell) => (
              <ResearchTile key={spell.id} name={spell.name} element={spell.element} size="sm" />
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Rising in the Codex"
        action={
          <Link to="/codex" className="text-xs text-primary hover:underline">
            Open the Codex
          </Link>
        }
      >
        {rising.isLoading ? (
          <Spinner />
        ) : rising.data?.length ? (
          <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
            {rising.data.map((entry) => (
              <div key={entry.spell.id} className="flex flex-col items-center gap-2">
                <SpellCardWrapper spell={mapSpellToCardProps(entry.spell)} size="sm" />
                <CodexVotes key={`${entry.spell.id}:${entry.up}:${entry.down}:${entry.myVote}`} spellId={entry.spell.id} ownerId={entry.spell.ownerId} up={entry.up} down={entry.down} myVote={entry.myVote} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ScrollText className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No spell has been inscribed yet. Yours could be the first the realm remembers.</p>
          </div>
        )}
      </Panel>
    </Page>
  );
}
