import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  size = 14,
  onChange,
  className,
}: {
  value: number;
  size?: number;
  onChange?: (next: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star
            key={n}
            size={size}
            className={cn(
              onChange && "cursor-pointer transition-colors hover:text-primary",
              n <= Math.round(value) ? "text-primary" : "text-muted-foreground/30"
            )}
            fill={n <= Math.round(value) ? "currentColor" : "transparent"}
          />
        );
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}>
            {star}
          </button>
        ) : (
          star
        );
      })}
    </div>
  );
}