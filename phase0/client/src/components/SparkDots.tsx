import { SPARK } from "@shared/constants";

/** Spark balance chip. Dots up to the rollover cap; the number is the truth. */
export function SparkDots({ balance }: { balance: number }) {
  const dots = Math.max(SPARK.signupGrant, Math.min(balance, SPARK.rolloverCap));
  return (
    <span className="inline-flex items-center gap-1" title={`${balance} Spark`}>
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={`size-2 rounded-full ${i < balance ? "bg-primary shadow-[0_0_6px_rgba(201,162,75,0.6)]" : "bg-border"}`}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">{balance} Spark</span>
    </span>
  );
}
