import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { elementAccent } from "@/lib/adapters";
import { BarChart3, TrendingUp, ArrowLeft } from "lucide-react";

export default function AdminMetrics() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const daily = trpc.analytics.dailyMetrics.useQuery();
  const weekly = trpc.analytics.weeklyMetrics.useQuery();

  if (daily.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">Loading metrics…</p>
      </div>
    );
  }

  if (daily.data === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-serif text-2xl font-semibold">Restricted</h1>
        <p className="text-sm text-muted-foreground">You do not have access to these metrics.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft /> Home
        </Button>
      </div>
    );
  }

  const rows = daily.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-serif text-lg font-semibold tracking-[0.22em] text-primary uppercase">
            Arcanis
          </span>
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Admin Metrics
          </span>
        </div>
      </header>

      <main className="container space-y-8 py-10">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <h1 className="font-serif text-2xl font-semibold">Share Metrics</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Panel title="K-Factor (viral)" gold>
            <p className="font-mono text-3xl font-bold text-primary">
              {weekly.data?.kFactor.toFixed(3) ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              shares per user × share-page → signup conversion
            </p>
          </Panel>
          <Panel title="Creation → Share">
            <p className="font-mono text-3xl font-bold">
              {weekly.data ? `${Math.round((weekly.data.creationToShareRate ?? 0) * 100)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              of created spells get shared
            </p>
          </Panel>
          <Panel title="Signup → First Creation">
            <p className="font-mono text-3xl font-bold">
              {weekly.data ? `${Math.round((weekly.data.signupToFirstCreationRate ?? 0) * 100)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              of accounts that forge at least one spell
            </p>
          </Panel>
        </div>

        <Panel
          title="Daily Metrics"
          action={
            weekly.data && (
              <span className="text-xs text-muted-foreground">
                Sparks consumed: {weekly.data.sparkStats.consumed} · remaining:{" "}
                {weekly.data.sparkStats.remaining}
              </span>
            )
          }
        >
          {daily.isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Signups</th>
                    <th className="py-2 pr-4">Spells</th>
                    <th className="py-2 pr-4">Shared</th>
                    <th className="py-2 pr-4">Share Views</th>
                    <th className="py-2 pr-4">CTA Clicks</th>
                    <th className="py-2">Link Req → Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.date} className="border-t border-border/60">
                      <td className="py-2 pr-4 font-mono text-xs">{row.date}</td>
                      <td className="py-2 pr-4">{row.newSignups}</td>
                      <td className="py-2 pr-4">{row.spellsCreated}</td>
                      <td className="py-2 pr-4">{row.spellsShared}</td>
                      <td className="py-2 pr-4">{row.sharePageViews}</td>
                      <td className="py-2 pr-4">{row.sharePageCtaClicks}</td>
                      <td className="py-2 font-mono text-xs">
                        {row.magicLinksRequested > 0
                          ? `${row.magicLinksVerified}/${row.magicLinksRequested}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Top Shared Spells" action={<TrendingUp className="size-4 text-primary" />}>
          {weekly.data?.topSpells.length ? (
            <ul className="space-y-2">
              {weekly.data.topSpells.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: elementAccent(s.element) }}
                    />
                    <button
                      className="font-serif text-sm font-semibold hover:text-primary"
                      onClick={() => navigate(`/spell/${s.id}`)}
                    >
                      {s.name}
                    </button>
                  </div>
                  <Badge variant="outline">{s.shareCount} shares</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No spells shared yet.
            </p>
          )}
        </Panel>
      </main>
    </div>
  );
}