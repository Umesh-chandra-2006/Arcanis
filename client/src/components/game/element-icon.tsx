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

const ELEMENT_ICONS: Record<string, LucideIcon> = {
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

const ELEMENT_TINTS: Record<string, string> = {
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
  element: string
  size?: number
  tinted?: boolean
  className?: string
}) {
  const key = element.toLowerCase()
  const Icon = ELEMENT_ICONS[key]
  if (!Icon) return null
  return (
    <Icon
      size={size}
      aria-label={`${element} element`}
      className={cn(tinted && ELEMENT_TINTS[key], className)}
    />
  )
}

const CAST_ICONS: Record<string, LucideIcon> = {
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
  castType: string
  size?: number
  className?: string
}) {
  const key = castType.toLowerCase()
  const Icon = CAST_ICONS[key]
  if (!Icon) return null
  return <Icon size={size} aria-label={`${castType} cast`} className={cn("text-muted-foreground", className)} />
}
