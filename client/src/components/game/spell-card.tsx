import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ElementIcon, CastTypeIcon } from "./element-icon";
import { Swords, Shield, Sparkles, Skull } from "lucide-react";

export interface SpellCardData {
  id: string;
  name: string;
  flavor?: string;
  element: string;
  tier: number | string;
  primaryCategory?: string;
  castType?: string;
  artAccent?: string;
  art?: string;
}

const CategoryIcons: Record<string, any> = {
  Attack: Swords,
  Defensive: Shield,
  Utility: Sparkles,
  Summon: Skull,
};

export function SpellCard({
  spell,
  size = "md",
  onClick,
  className,
}: {
  spell: SpellCardData;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}) {
  const accent = spell.artAccent || "#6d5aa8";
  const sizeClasses = {
    sm: "w-36 text-xs",
    md: "w-48 text-sm",
    lg: "w-64 text-base",
  }[size];

  const tierStr = String(spell.tier || "Basic").toLowerCase();
  const CategoryIcon = CategoryIcons[spell.primaryCategory || "Attack"] || Swords;

  // Tier-Keyed CSS Border Treatments (Code-rendered CSS, not image art)
  const getTierStyle = () => {
    switch (tierStr) {
      case "mega":
      case "5":
        return {
          border: `2px solid color-mix(in oklab, ${accent} 85%, #ffd700)`,
          boxShadow: `0 0 15px color-mix(in oklab, ${accent} 40%, transparent), inset 0 0 12px color-mix(in oklab, ${accent} 30%, transparent)`,
        };
      case "advanced":
      case "3":
        return {
          border: `2px solid color-mix(in oklab, ${accent} 70%, #ffffff)`,
          boxShadow: `0 0 8px color-mix(in oklab, ${accent} 25%, transparent)`,
        };
      case "freestyle":
        return {
          border: `2px dashed color-mix(in oklab, ${accent} 90%, #00ffff)`,
          boxShadow: `0 0 12px color-mix(in oklab, ${accent} 35%, transparent)`,
        };
      case "basic":
      case "1":
      default:
        return {
          border: `1px solid color-mix(in oklab, ${accent} 50%, #26262f)`,
          boxShadow: `0 4px 12px rgba(0,0,0,0.5)`,
        };
    }
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col aspect-[5/7] shrink-0 overflow-hidden rounded-md text-left bg-card",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        sizeClasses,
        className
      )}
      style={getTierStyle()}
      aria-label={`Spell: ${spell.name}`}
    >
      {/* Upper 55% Height: Pure AI Illustration Container */}
      <div className="relative w-full h-[58%] overflow-hidden bg-black/60 shrink-0">
        <img
          src={spell.art || "/placeholder.svg"}
          alt={spell.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Top-Right Corner Overlay: Rendered Element Icon */}
        <span
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border bg-background/80 backdrop-blur-md shadow-md"
          style={{ borderColor: `color-mix(in oklab, ${accent} 60%, transparent)` }}
        >
          <ElementIcon element={spell.element} size={14} />
        </span>

        {/* Classification Icons Row (Category + Cast Type + Element) */}
        <div className="absolute left-2 bottom-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] text-foreground">
          <CategoryIcon size={11} className="text-primary" />
          <span className="text-muted-foreground">•</span>
          <CastTypeIcon castType={spell.castType || "Instant"} size={11} />
        </div>
      </div>

      {/* Lower Section: Real HTML/CSS Text Overlay Panel (Name + Lore Line) */}
      <div className="flex-1 flex flex-col justify-between p-3 bg-gradient-to-b from-card/90 via-card to-background border-t border-white/5">
        <div>
          <h3 className="font-serif text-sm sm:text-base font-semibold leading-tight text-foreground line-clamp-1">
            {spell.name}
          </h3>
          {spell.flavor && (
            <p className="mt-1 line-clamp-2 text-[10px] sm:text-[11px] italic leading-snug text-muted-foreground/90 font-serif">
              "{spell.flavor}"
            </p>
          )}
        </div>
      </div>

      {/* Tier Frame Graphic Accent Overlay for Advanced/Mega */}
      <TierFrame tier={spell.tier} accent={accent} />
    </motion.button>
  );
}

function TierFrame({ tier, accent }: { tier: number | string; accent: string }) {
  const tierStr = String(tier || "Basic").toLowerCase();
  const line = `color-mix(in oklab, ${accent} 80%, #e8e4da)`;

  if (tierStr === "basic" || tierStr === "1") return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
    >
      {(tierStr === "advanced" || tierStr === "3") && (
        <g stroke={line} strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke">
          <path d="M2 8 L2 2 L8 2" />
          <path d="M92 2 L98 2 L98 8" />
          <path d="M98 132 L98 138 L92 138" />
          <path d="M8 138 L2 138 L2 132" />
        </g>
      )}
      {(tierStr === "mega" || tierStr === "5") && (
        <g stroke={line} strokeWidth="1.2" fill="none">
          <path d="M2 16 L2 2 L14 2" />
          <path d="M86 2 L98 2 L98 16" />
          <path d="M98 124 L98 138 L86 138" />
          <path d="M14 138 L2 138 L2 124" />
          <circle cx="50" cy="4" r="2" fill={line} />
        </g>
      )}
    </svg>
  );
}
