import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flag } from "lucide-react";
import { toast } from "sonner";

const REASONS = [
  ["offensive", "Offensive"],
  ["sexual", "Sexual content"],
  ["hateful", "Hateful"],
  ["violent_or_graphic", "Graphic violence"],
  ["real_person", "Targets a real person"],
  ["spam", "Spam"],
  ["other", "Something else"],
] as const;

type Reason = (typeof REASONS)[number][0];

/** Report a public spell or review to the moderation queue (Build Plan 13). */
export function ReportButton({ targetType, targetId, compact = false }: { targetType: "spell" | "review"; targetId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("offensive");
  const [note, setNote] = useState("");
  const report = trpc.moderation.report.useMutation();

  const send = async () => {
    try {
      await report.mutateAsync({ targetType, targetId, reason, note: note.trim() || undefined });
      toast.success("Thanks. A moderator will take a look.");
      setOpen(false);
      setNote("");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not send the report");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
          aria-label={`Report this ${targetType}`}
        >
          <Flag className="size-3" />
          {!compact && "Report"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Report this {targetType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {REASONS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="report-reason" checked={reason === value} onChange={() => setReason(value)} />
              {label}
            </label>
          ))}
          <textarea
            className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm"
            rows={2}
            maxLength={300}
            placeholder="Anything we should know? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button className="w-full" onClick={send} disabled={report.isPending}>
            Send report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
