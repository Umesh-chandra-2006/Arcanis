"use client"

import { Medal } from "lucide-react"
import { Panel } from "@/components/game/panel"
import { VitalBar, XpBar, AffinityBar } from "@/components/game/bars"
import { SpellCard } from "@/components/game/spell-card"
import { CHARACTER, ELEMENTS, RECENT_BATTLES, FRIEND_ACTIVITY, SPELLS } from "@/lib/game"
import { cn } from "@/lib/utils"

export function DashboardPage() {
  const c = CHARACTER

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-semibold text-balance">Dashboard</h1>
        <p className="text-sm text-muted-foreground">The state of your craft, at a glance.</p>
      </header>

      {/* Character summary */}
      <Panel gold className="overflow-hidden">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <img
            src={c.avatar || "/placeholder.svg"}
            alt={`${c.name} portrait`}
            className="h-28 w-28 shrink-0 rounded-md border border-primary/30 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-serif text-2xl font-semibold">{c.name}</h2>
              <span className="text-sm italic text-muted-foreground">{c.title}</span>
            </div>
            {/* Circle: number/name only. The cap is never rendered as "X / 10". */}
            <p className="mt-0.5 text-sm text-primary">
              Sixth Circle <span className="text-muted-foreground">— {c.circleName}</span>
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <VitalBar kind="hp" current={c.hp.current} max={c.hp.max} />
              <VitalBar kind="mp" current={c.mp.current} max={c.mp.max} />
            </div>

            {/* Will surfaces ONLY as a short qualitative sentence. No number,
                no bar, no label explaining what it is. */}
            <p className="mt-4 text-sm italic leading-relaxed text-muted-foreground">{c.willState}</p>
          </div>

          {/* Animus rank badge */}
          <div className="flex shrink-0 flex-col items-center gap-1.5 rounded-md border border-border bg-background px-5 py-4">
            <Medal size={22} className="text-primary" aria-hidden="true" />
            <span className="font-serif text-lg font-semibold">{c.animusRank}</span>
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Division {c.animusDivision}
            </span>
          </div>
        </div>
      </Panel>

      {/* XP tracks — three distinct tracks */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Panel title="Circle XP">
          <XpBar label="Toward the Seventh" current={c.circleXp.current} next={c.circleXp.next} />
        </Panel>
        <Panel title="Spell XP">
          <XpBar label="Craft mastery" current={c.spellXp.current} next={c.spellXp.next} />
        </Panel>
        <Panel title="Elemental XP">
          <XpBar label="Attunement depth" current={c.elementalXp.current} next={c.elementalXp.next} />
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Elemental affinities — 12 elements, compact grid */}
        <Panel title="Elemental Affinity" className="lg:col-span-3">
          <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {ELEMENTS.map((el) => (
              <AffinityBar key={el} element={el} value={c.affinities[el]} />
            ))}
          </div>
        </Panel>

        {/* Recent battles */}
        <Panel title="Recent Battles" className="lg:col-span-2">
          <ul className="flex flex-col divide-y divide-border">
            {RECENT_BATTLES.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "w-16 shrink-0 text-xs font-medium",
                    b.result === "Victory" && "text-primary",
                    b.result === "Defeat" && "text-destructive",
                    b.result === "Draw" && "text-muted-foreground",
                  )}
                >
                  {b.result}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    vs {b.opponent} <span className="text-muted-foreground">· {b.mode}</span>
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{b.detail}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{b.ago}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Active deck preview — spell cards are the core visual unit */}
        <Panel title="Active Deck" className="lg:col-span-3">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {SPELLS.map((spell) => (
              <SpellCard key={spell.id} spell={spell} size="sm" />
            ))}
          </div>
        </Panel>

        {/* Friend activity */}
        <Panel title="Friend Activity" className="lg:col-span-2">
          <ul className="flex flex-col divide-y divide-border">
            {FRIEND_ACTIVITY.map((f) => (
              <li key={f.id} className="flex items-baseline gap-2 py-2.5 first:pt-0 last:pb-0">
                <p className="min-w-0 flex-1 text-sm leading-relaxed">
                  <span className="font-medium">{f.name}</span>{" "}
                  <span className="text-muted-foreground">{f.action}</span>
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{f.ago}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
