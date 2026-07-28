"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Element } from "@/lib/game"
import { ElementIcon } from "./element-icon"

/**
 * Shared bar components. Note: there is deliberately NO Will bar component —
 * Will is a hidden stat and only ever surfaces as qualitative text.
 */

const slowEase = { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const }

/** HP / MP vital bar used in battle and summary panels. */
export function VitalBar({
  kind,
  current,
  max,
  showNumbers = true,
  className,
}: {
  kind: "hp" | "mp"
  current: number
  max: number
  showNumbers?: boolean
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const color = kind === "hp" ? "var(--color-hp)" : "var(--color-mp)"
  const label = kind === "hp" ? "HP" : "MP"

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        {showNumbers && (
          <span className="font-mono text-xs text-muted-foreground">
            {current} / {max}
          </span>
        )}
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-sm border border-border bg-background"
        role="meter"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <motion.div
          className="h-full rounded-sm"
          style={{
            background: `linear-gradient(to right, color-mix(in oklab, ${color} 70%, black), ${color})`,
            boxShadow: `0 0 8px color-mix(in oklab, ${color} 60%, transparent)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={slowEase}
        />
      </div>
    </div>
  )
}

/** XP track bar (Circle XP / Spell XP / Elemental XP). */
export function XpBar({
  label,
  current,
  next,
  className,
}: {
  label: string
  current: number
  next: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (current / next) * 100))
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {current.toLocaleString()} / {next.toLocaleString()}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-background"
        role="meter"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={next}
        aria-label={label}
      >
        <motion.div
          className="h-full rounded-full bg-primary/80"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={slowEase}
        />
      </div>
    </div>
  )
}

/** Elemental affinity bar — compact, used in the 12-element grid. */
export function AffinityBar({
  element,
  value,
  className,
}: {
  element: Element
  value: number // 0–100
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex w-5 justify-center">
        <ElementIcon element={element} size={13} />
      </span>
      <span className="w-16 text-[11px] capitalize text-muted-foreground">{element}</span>
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-background"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${element} affinity`}
      >
        <motion.div
          className="h-full rounded-full bg-foreground/50"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={slowEase}
        />
      </div>
      <span className="w-7 text-right font-mono text-[10px] text-muted-foreground">{value}</span>
    </div>
  )
}
