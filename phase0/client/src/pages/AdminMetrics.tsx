import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { toast } from "sonner";

const pct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);

function formatMetric(key: string, value: number | null): string {
  if (value === null) return "-";
  if (key === "k_factor") return value.toFixed(2);
  if (key === "cost_per_creation") return `$${value.toFixed(4)}`;
  return pct(value);
}

/** Admin dashboard: Gate 1a metrics (Phase Plan v2.2 Section 5), spend breaker, daily counts. */
export default function AdminMetrics() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [days, setDays] = useState(28);
  const gate = trpc.analytics.gateMetrics.useQuery({ days }, { enabled: isAdmin });
  const daily = trpc.analytics.dailyMetrics.useQuery(undefined, { enabled: isAdmin });
  const overview = trpc.analytics.overview.useQuery(undefined, { enabled: isAdmin });
  const breaker = trpc.admin.breakerStatus.useQuery(undefined, { enabled: isAdmin, refetchInterval: 60_000 });
  const fakeDoor = trpc.spark.fakeDoorStats.useQuery(undefined, { enabled: isAdmin });
  const reset = trpc.admin.breakerReset.useMutation();
  const setLimits = trpc.admin.breakerSetLimits.useMutation();
  const [creationLimit, setCreationLimit] = useState("");

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-serif text-2xl font-semibold">Restricted</h1>
        <Link to="/"><Button variant="outline"><ArrowLeft /> Home</Button></Link>
      </div>
    );
  }

  const b = breaker.data;
  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-5xl space-y-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-2xl text-primary">Gate 1a dashboard</h1>
          <div className="flex items-center gap-2">
            {[7, 28, 90].map((d) => (
              <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d}d</Button>
            ))}
            <Link to="/admin/moderation"><Button size="sm" variant="ghost">Moderation</Button></Link>
          </div>
        </div>

        <Panel title="Gate 1a" gold>
          {gate.isLoading ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="py-2">Metric</th><th>Value</th><th>Target</th><th>Detail</th><th /></tr>
                </thead>
                <tbody>
                  {gate.data?.metrics.map((m) => (
                    <tr key={m.key} className="border-t border-border/40">
                      <td className="py-2 pr-3">{m.label}</td>
                      <td className="pr-3 font-semibold">{formatMetric(m.key, m.value)}</td>
                      <td className="pr-3 text-muted-foreground">{m.target}</td>
                      <td className="pr-3 text-xs text-muted-foreground">{m.detail}</td>
                      <td>
                        {m.pass === null ? <CircleDashed className="size-4 text-muted-foreground" /> : m.pass ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-destructive" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {gate.data && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Day-1 return {pct(gate.data.extra.day1_return as number | null)} · creations per active player{" "}
                  {gate.data.extra.creations_per_active_user === null ? "-" : Number(gate.data.extra.creations_per_active_user).toFixed(2)} · fake-door intent at zero Spark{" "}
                  {pct(gate.data.extra.fake_door_intent_at_zero_spark as number | null)} ({gate.data.extra.players_reached_zero_spark} players reached zero)
                </p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Fake door (Spark packs)">
          {!fakeDoor.data ? <Spinner /> : (
            <p className="text-sm">
              Pack clicks:{" "}
              {fakeDoor.data.intents.length
                ? fakeDoor.data.intents.map((i) => `${i.pack} ${i.clicks}`).join(" · ")
                : "none yet"}
              {" · "}waitlist {fakeDoor.data.waitlist}
              <span className="block text-xs text-muted-foreground">Clicks overstate real purchases: read as an upper bound on H3.</span>
            </p>
          )}
        </Panel>

        <Panel title="Spend breaker (today, UTC)">
          {!b ? <Spinner /> : (
            <div className="space-y-3 text-sm">
              <p>
                Status: <span className={b.open ? "text-emerald-500" : "text-destructive"}>{b.open ? "open" : `refusing (${b.reason})`}</span>
                {" · "}creations {b.creations} of {b.creationLimit}
                {" · "}real spend ${b.realSpendUsd.toFixed(4)} of ${b.spendLimitUsd}
                {" · "}shadow spend ${b.shadowSpendUsd.toFixed(4)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={reset.isPending} onClick={async () => { await reset.mutateAsync(); breaker.refetch(); toast.success("Trip cleared"); }}>
                  Clear trip
                </Button>
                <Input className="w-32" inputMode="numeric" placeholder="Creation limit" value={creationLimit} onChange={(e) => setCreationLimit(e.target.value.replace(/\D/g, ""))} />
                <Button size="sm" variant="outline" disabled={!creationLimit || setLimits.isPending} onClick={async () => { await setLimits.mutateAsync({ creationLimit: Number(creationLimit) }); breaker.refetch(); toast.success("Limit set for today"); }}>
                  Set today's limit
                </Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Last 7 days">
          {daily.isLoading ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="py-2">Day</th><th>Signups</th><th>Created</th><th>Shared</th><th>Previews</th><th>Preview CTA</th></tr>
                </thead>
                <tbody>
                  {daily.data?.map((d) => (
                    <tr key={d.date} className="border-t border-border/40">
                      <td className="py-2">{d.date}</td><td>{d.newSignups}</td><td>{d.spellsCreated}</td><td>{d.spellsShared}</td><td>{d.sharePageViews}</td><td>{d.sharePageCtaClicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {overview.data && (
          <Panel title="Top spells and Spark">
            <ul className="space-y-1 text-sm">
              {overview.data.topSpells.map((s) => (
                <li key={s.id}><Link to={`/spell/${s.id}`} className="text-primary underline">{s.name}</Link> ({s.element}) · {s.shareCount} views</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Spark spent {overview.data.sparkStats.consumed} · outstanding {overview.data.sparkStats.remaining}
            </p>
          </Panel>
        )}
      </main>
    </div>
  );
}
