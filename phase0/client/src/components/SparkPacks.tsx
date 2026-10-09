import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SPARK, SPARK_PACKS, type SparkPackId } from "@shared/constants";
import { Sparkles, Check } from "lucide-react";

/**
 * Fake door (Phase Plan 5): Spark packs shown "coming soon". A click records
 * intent and offers a waitlist; no Spark is ever granted for clicking.
 */
export function SparkPacksDialog({
  open,
  onOpenChange,
  source,
  balance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: "zero_spark" | "chip";
  balance: number;
}) {
  const [picked, setPicked] = useState<SparkPackId | null>(null);
  const intent = trpc.spark.packIntent.useMutation();
  const join = trpc.spark.joinWaitlist.useMutation();
  const onWaitlist = trpc.spark.onWaitlist.useQuery(undefined, { enabled: open });
  const joined = join.isSuccess || onWaitlist.data?.joined;

  const pick = (pack: SparkPackId) => {
    setPicked(pack);
    intent.mutate({ pack, source }, { onError: () => {} });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">{balance === 0 ? "You're out of Spark" : "Spark"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {balance === 0
            ? `Your free Spark refills every Monday (${SPARK.weeklyAllowance} a week). Spark packs are coming soon.`
            : `You have ${balance} Spark. Each spell costs ${SPARK.creationCost}. Spark packs are coming soon.`}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SPARK_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => pick(pack.id)}
              className={`arc-panel flex flex-col items-center gap-1 rounded-md p-3 text-center transition ${picked === pack.id ? "border-primary ring-1 ring-primary" : "hover:border-primary/60"}`}
            >
              <Sparkles className="size-4 text-primary" />
              <span className="font-serif text-lg">{pack.spark}</span>
              <span className="text-[11px] text-muted-foreground">Spark</span>
              <span className="text-xs">{pack.price}</span>
              <span className="mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">Coming soon</span>
            </button>
          ))}
        </div>
        {picked && (
          <div className="space-y-2 rounded-md border border-border p-3 text-sm">
            <p>Packs aren't on sale yet. Want an email when they are?</p>
            {joined ? (
              <p className="flex items-center gap-1.5 text-primary">
                <Check className="size-4" /> You're on the list.
              </p>
            ) : (
              <Button size="sm" className="w-full" disabled={join.isPending} onClick={() => join.mutate({ pack: picked })}>
                Tell me when packs launch
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
