import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page frame from the arcanis-ui dashboard: serif title, one-line subtitle, max width. */
export function Page({
  title,
  subtitle,
  action,
  children,
  className,
  width = "wide",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  width?: "wide" | "narrow";
}) {
  return (
    <div className={cn("mx-auto flex flex-col gap-5 p-4 md:p-6 lg:p-8", width === "wide" ? "max-w-6xl" : "max-w-3xl", className)}>
      {title && (
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-3xl font-semibold text-balance">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </div>
  );
}
