import { SPARK_SIGNUP_GRANT } from "@shared/constants";

export function SparkDots({ balance }: { balance: number }) {
  const total = SPARK_SIGNUP_GRANT;
  return (
    <span className="inline-flex items-center gap-1" title={`${balance} Sparks remaining`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`size-2 rounded-full ${i < balance ? "bg-primary shadow-[0_0_6px_rgba(201,162,75,0.6)]" : "bg-border"}`}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        {balance}/{total} Sparks
      </span>
    </span>
  );
}
