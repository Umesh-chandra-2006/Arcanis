import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BookOpen, ChevronDown, ChevronUp, EyeOff, ScrollText } from "lucide-react";

/** Up and down votes under a spell in the Codex. Signed-out visitors see the counts and are asked to sign in. */
export function CodexVotes({ spellId, ownerId, up, down, myVote }: { spellId: string; ownerId: number; up: number; down: number; myVote: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [state, setState] = useState({ up, down, myVote });
  const vote = trpc.spells.vote.useMutation();
  const own = !!user && user.id === ownerId;

  const cast = async (value: 1 | -1) => {
    if (!user) {
      toast.message("Sign in to vote", { action: { label: "Sign in", onClick: () => (window.location.href = "/signin") } });
      return;
    }
    if (own) return;
    const next = state.myVote === value ? 0 : value;
    const before = state;
    // Optimistic: the counts move at once and are corrected by the server's answer.
    setState({
      up: state.up - (state.myVote === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
      down: state.down - (state.myVote === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
      myVote: next,
    });
    try {
      setState(await vote.mutateAsync({ spellId, value: next as 1 | -1 | 0 }));
      utils.spells.codex.invalidate();
    } catch (error: any) {
      setState(before);
      toast.error(error?.message ?? "That vote did not count. Try again.");
    }
  };

  const base = "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors disabled:opacity-60";
  return (
    <div className="flex items-center justify-center gap-2" title={own ? "Your own spell: others vote on it" : undefined}>
      <button
        type="button"
        aria-label="Vote up"
        aria-pressed={state.myVote === 1}
        disabled={own || vote.isPending}
        onClick={() => cast(1)}
        className={cn(base, state.myVote === 1 ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary")}
      >
        <ChevronUp className="size-3.5" />
        {state.up}
      </button>
      <button
        type="button"
        aria-label="Vote down"
        aria-pressed={state.myVote === -1}
        disabled={own || vote.isPending}
        onClick={() => cast(-1)}
        className={cn(base, state.myVote === -1 ? "border-destructive/70 bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive")}
      >
        <ChevronDown className="size-3.5" />
        {state.down}
      </button>
    </div>
  );
}

/**
 * Asked right after a spell is made (v7.7): nothing goes into the Codex unless
 * its creator says so. A spell still in research appears when it is granted.
 */
export function CodexAsk({ spellId, researching, onAnswered }: { spellId: string; researching: boolean; onAnswered?: (shared: boolean) => void }) {
  const utils = trpc.useUtils();
  const share = trpc.spells.setCodexShared.useMutation();
  const [answer, setAnswer] = useState<"shared" | "kept" | null>(null);

  const decide = async (shared: boolean) => {
    try {
      await share.mutateAsync({ spellId, shared, from: "lab" });
      setAnswer(shared ? "shared" : "kept");
      onAnswered?.(shared);
      utils.spells.mySpells.invalidate();
      utils.spells.codex.invalidate();
    } catch (error: any) {
      toast.error(error?.message ?? "The Codex could not be reached. Try again.");
    }
  };

  if (answer) {
    return (
      <div className="arc-panel mx-auto max-w-xl p-4 text-center text-sm text-muted-foreground">
        {answer === "shared" ? (
          <>
            <ScrollText className="mx-auto mb-1.5 size-5 text-primary" />
            {researching ? "When the research is complete, its name will be inscribed in the " : "Its name is inscribed in the "}
            <Link to="/codex" className="text-primary hover:underline">
              Codex
            </Link>
            , for every mage to behold.
          </>
        ) : (
          <>
            <EyeOff className="mx-auto mb-1.5 size-5 text-muted-foreground" />
            It stays yours alone. You can inscribe it in the Codex later from your Spellbook.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="arc-panel arc-panel-gold mx-auto max-w-xl p-5 text-center">
      <BookOpen className="mx-auto size-6 text-primary" />
      <p className="mt-2 font-serif text-lg font-semibold">Shall the might of this spell be known throughout the realm?</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Inscribe it in the Codex, where every mage may behold it and judge its worth. Or keep it hidden, known to you alone.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button onClick={() => decide(true)} disabled={share.isPending}>
          <ScrollText /> Inscribe it in the Codex
        </Button>
        <Button variant="ghost" onClick={() => decide(false)} disabled={share.isPending}>
          Keep it hidden
        </Button>
      </div>
    </div>
  );
}

/** The owner's switch in the spell detail view. */
export function CodexToggle({ spellId, inCodex }: { spellId: string; inCodex: boolean }) {
  const utils = trpc.useUtils();
  const share = trpc.spells.setCodexShared.useMutation();
  const [shown, setShown] = useState(inCodex);
  const toggle = async () => {
    try {
      const result = await share.mutateAsync({ spellId, shared: !shown, from: "spellbook" });
      setShown(result.inCodex);
      toast.success(result.inCodex ? "Inscribed in the Codex" : "Withdrawn from the Codex");
      utils.spells.mySpells.invalidate();
      utils.spells.codex.invalidate();
    } catch (error: any) {
      toast.error(error?.message ?? "The Codex could not be reached. Try again.");
    }
  };
  return (
    <Button variant="outline" className="w-full" onClick={toggle} disabled={share.isPending}>
      {shown ? <EyeOff /> : <ScrollText />}
      {shown ? "Withdraw from the Codex" : "Inscribe in the Codex"}
    </Button>
  );
}
