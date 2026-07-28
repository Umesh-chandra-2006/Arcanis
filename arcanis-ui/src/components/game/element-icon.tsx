import {
  Flame,
  Droplets,
  Wind,
  Mountain,
  Zap,
  Eclipse,
  Sparkles,
  Sun,
  Moon,
  Leaf,
  Snowflake,
  Shuffle,
  Crosshair,
  Target,
  BatteryCharging,
  Infinity as InfinityIcon,
  Radio,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CastType, Element } from "@/lib/game"

const ELEMENT_ICONS: Record<Element, LucideIcon> = {
  fire: Flame,
  water: Droplets,
  wind: Wind,
  earth: Mountain,
  lightning: Zap,
  void: Eclipse,
  arcane: Sparkles,
  light: Sun,
  shadow: Moon,
  nature: Leaf,
  frost: Snowflake,
  chaos: Shuffle,
}

const ELEMENT_TINTS: Record<Element, string> = {
  fire: "text-ember",
  water: "text-frost",
  wind: "text-muted-foreground",
  earth: "text-verdant",
  lightning: "text-primary",
  void: "text-accent",
  arcane: "text-accent",
  light: "text-primary",
  shadow: "text-muted-foreground",
  nature: "text-verdant",
  frost: "text-frost",
  chaos: "text-destructive",
}

export function ElementIcon({
  element,
  size = 16,
  tinted = true,
  className,
}: {
  element: Element
  size?: number
  tinted?: boolean
  className?: string
}) {
  const Icon = ELEMENT_ICONS[element]
  return (
    <Icon
      size={size}
      aria-label={`${element} element`}
      className={cn(tinted && ELEMENT_TINTS[element], className)}
    />
  )
}

const CAST_ICONS: Record<CastType, LucideIcon> = {
  instant: Crosshair,
  trap: Target,
  charged: BatteryCharging,
  continuous: InfinityIcon,
  channeled: Radio,
}

export function CastTypeIcon({
  castType,
  size = 14,
  className,
}: {
  castType: CastType
  size?: number
  className?: string
}) {
  const Icon = CAST_ICONS[castType]
  return <Icon size={size} aria-label={`${castType} cast`} className={cn("text-muted-foreground", className)} />
}
