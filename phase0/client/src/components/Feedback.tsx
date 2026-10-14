import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Star, Send } from "lucide-react";
import { FEEDBACK_KINDS, FEEDBACK_MAX_LENGTH, type FeedbackKind } from "@shared/constants";

const KIND_LABELS: Record<FeedbackKind, string> = { idea: "An idea", problem: "Something broke", praise: "Something I liked", other: "Something else" };

/** The feedback form, used on the feedback page and in the prompt after a first spell. */
export function FeedbackForm({ source, onDone, compact = false }: { source: "page" | "first_spell"; onDone?: () => void; compact?: boolean }) {
  const utils = trpc.useUtils();
  const submit = trpc.feedback.submit.useMutation();
  const [kind, setKind] = useState<FeedbackKind>(source === "first_spell" ? "other" : "idea");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !rating) {
      toast.error("Write a few words or choose a rating");
      return;
    }
    try {
      await submit.mutateAsync({ kind, rating, message: message.trim(), source });
      toast.success("Thank you. Every word is read.");
      setMessage("");
      setRating(null);
      utils.feedback.given.invalidate();
      onDone?.();
    } catch (error: any) {
      toast.error(error?.message ?? "That did not send. Try again.");
    }
  };

  return (
    <form onSubmit={send} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{source === "first_spell" ? "How was forging your first spell?" : "How is Arcanis so far?"}</Label>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => setRating(rating === n ? null : n)}>
              <Star className={cn("size-6 transition-colors", rating && n <= rating ? "fill-primary text-primary" : "text-muted-foreground/50 hover:text-primary")} />
            </button>
          ))}
        </div>
      </div>
      {!compact && (
        <div className="space-y-1.5">
          <Label>What is it about?</Label>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  kind === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                )}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`feedback-${source}`}>{source === "first_spell" ? "Anything that surprised you, confused you, or that you wish it did?" : "Tell us"}</Label>
        <Textarea
          id={`feedback-${source}`}
          value={message}
          maxLength={FEEDBACK_MAX_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write as much or as little as you like."
          className="min-h-24"
        />
      </div>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? <Spinner /> : <Send />}
        Send feedback
      </Button>
    </form>
  );
}

/** Offered once, after a player's first spell (v7.7). */
export function FirstSpellFeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Your first spell is written</DialogTitle>
          <DialogDescription>Arcanis is young and shaped by its first mages. A minute of your thoughts helps it grow.</DialogDescription>
        </DialogHeader>
        <FeedbackForm source="first_spell" compact onDone={() => onOpenChange(false)} />
        <button type="button" className="text-xs text-muted-foreground underline hover:text-primary" onClick={() => onOpenChange(false)}>
          Not now
        </button>
      </DialogContent>
    </Dialog>
  );
}
