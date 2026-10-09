import { useState } from "react";
import { SPARK } from "@shared/constants";
import { SparkPacksDialog } from "@/components/SparkPacks";

/** Spark balance chip. Dots up to the rollover cap; the number is the truth. Opens the Spark panel. */
export function SparkDots({ balance }: { balance: number }) {
  const [open, setOpen] = useState(false);
  const dots = Math.max(SPARK.signupGrant, Math.min(balance, SPARK.rolloverCap));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full px-1 hover:bg-primary/5" title={`${balance} Spark`}>
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className={`size-2 rounded-full ${i < balance ? "bg-primary shadow-[0_0_6px_rgba(201,162,75,0.6)]" : "bg-border"}`}
          />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{balance} Spark</span>
      </button>
      <SparkPacksDialog open={open} onOpenChange={setOpen} source="chip" balance={balance} />
    </>
  );
}
