"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Spell } from "@/lib/game"
import { ElementIcon } from "./element-icon"

/**
 * The core visual unit of Arcanis, reused in the Lab, collection grid,
 * deck builder, battle UI, and community showcase.
 *
 * Rules honored here:
 * - Full-bleed artwork, dark gradient panel at the bottom with ONLY the
 *   spell name + one-line flavor text. No stats on the card face, ever.
 * - Element icon badge in a corner.
 * - Tier communicated through border frame COMPLEXITY (ornamentation),
 *   never border color. Accent color comes from the artwork's dominant
 *   color (spell.artAccent), not a per-element color map.
 */
export function SpellCard({
  spell,
  size = "md",
  onClick,
  className,
}: {
  spell: Spell
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  className?: string
}) {
  const accent = spell.artAccent
  const sizeClasses = {
    sm: "w-36",
    md: "w-48",
    lg: "w-64",
  }[size]

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative block aspect-[5/7] shrink-0 overflow-hidden rounded-md text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        sizeClasses,
        className,
      )}
      style={{
        // Base frame — accent tint from artwork's dominant color
        border: `1px solid color-mix(in oklab, ${accent} 55%, #26262f)`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.5)`,
      }}
      aria-label={`Spell: ${spell.name}`}
    >
      {/* Artwork, full-bleed */}
      <img
        src={spell.art || "/placeholder.svg"}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />

      {/* Tier ornamentation — complexity scales with tier, color stays accent-tinted */}
      <TierFrame tier={spell.tier} accent={accent} />

      {/* Element badge, top-right corner */}
      <span
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border bg-background/70 backdrop-blur-sm"
        style={{ borderColor: `color-mix(in oklab, ${accent} 50%, transparent)` }}
      >
        <ElementIcon element={spell.element} size={14} />
      </span>

      {/* Bottom gradient panel: name + flavor only. Never stats. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-10">
        <h3 className="font-serif text-base font-semibold leading-tight text-foreground text-balance">
          {spell.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] italic leading-relaxed text-muted-foreground">
          {spell.flavor}
        </p>
      </div>

      {/* Hover glow pulse */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 30px color-mix(in oklab, ${accent} 25%, transparent)` }}
      />
    </motion.button>
  )
}

/**
 * Border frame whose ornamentation grows with tier:
 * T1: plain frame (nothing extra)
 * T2: corner ticks
 * T3: corner ticks + inner hairline
 * T4: L-shaped corner brackets + inner hairline
 * T5: double brackets + inner hairline + midpoint notches
 */
function TierFrame({ tier, accent }: { tier: number; accent: string }) {
  const line = `color-mix(in oklab, ${accent} 70%, #e8e4da)`

  if (tier <= 1) return null

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
    >
      {/* T2+: corner ticks */}
      {tier >= 2 && (
        <g stroke={line} strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke">
          <path d="M2 8 L2 2 L8 2" />
          <path d="M92 2 L98 2 L98 8" />
          <path d="M98 132 L98 138 L92 138" />
          <path d="M8 138 L2 138 L2 132" />
        </g>
      )}
      {/* T3+: inner hairline */}
      {tier >= 3 && (
        <rect x="4" y="4" width="92" height="132" stroke={line} strokeOpacity="0.45" strokeWidth="0.5" fill="none" />
      )}
      {/* T4+: longer L brackets */}
      {tier >= 4 && (
        <g stroke={line} strokeWidth="1.5" fill="none">
          <path d="M2 16 L2 2 L14 2" />
          <path d="M86 2 L98 2 L98 16" />
          <path d="M98 124 L98 138 L86 138" />
          <path d="M14 138 L2 138 L2 124" />
        </g>
      )}
      {/* T5: midpoint notches + second bracket layer */}
      {tier >= 5 && (
        <g stroke={line} strokeWidth="1" fill="none">
          <path d="M44 2 L50 5 L56 2" />
          <path d="M44 138 L50 135 L56 138" />
          <path d="M2 64 L5 70 L2 76" />
          <path d="M98 64 L95 70 L98 76" />
          <path d="M6 20 L6 6 L18 6" strokeOpacity="0.6" />
          <path d="M82 6 L94 6 L94 20" strokeOpacity="0.6" />
          <path d="M94 120 L94 134 L82 134" strokeOpacity="0.6" />
          <path d="M18 134 L6 134 L6 120" strokeOpacity="0.6" />
        </g>
      )}
    </svg>
  )
}
