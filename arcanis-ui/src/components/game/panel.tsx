import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Stat/info panel — the enchanted-parchment framed container used app-wide. */
export function Panel({
  title,
  action,
  children,
  gold = false,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  gold?: boolean
  className?: string
}) {
  return (
    <section className={cn("arc-panel", gold && "arc-panel-gold arc-glow-gold", className)}>
      {title && (
        <header className="flex items-center justify-between px-4 pt-3.5">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </h2>
          {action}
        </header>
      )}
      {title && <div className="arc-rule mx-4 mt-2.5" />}
      <div className="p-4">{children}</div>
    </section>
  )
}
