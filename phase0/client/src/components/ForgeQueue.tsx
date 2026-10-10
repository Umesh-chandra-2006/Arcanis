import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { Button } from "@/components/ui/button";
import { Hourglass } from "lucide-react";
import { toast } from "sonner";

const POLL_MS = 60_000;

function useForgeQueue() {
  const { isAuthenticated } = useAuth();
  return trpc.spells.forgeQueue.useQuery(undefined, {
    enabled: isAuthenticated,
    // Only poll while something is waiting at the forge.
    refetchInterval: (query) => (query.state.data?.waiting.length ? POLL_MS : false),
  });
}

/**
 * Announces spells the Arcanum granted after the forge reopened (Master Doc
 * 25, v7.5). Mounted once in the app shell; each outcome is shown once.
 */
export function ForgeQueueWatcher() {
  const queue = useForgeQueue();
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const ack = trpc.spells.ackForgeQueue.useMutation();
  const announced = useRef(new Set<string>());

  useEffect(() => {
    const fresh = (queue.data?.finished ?? []).filter((entry) => !announced.current.has(entry.id));
    if (!fresh.length) return;
    for (const entry of fresh) {
      announced.current.add(entry.id);
      if (entry.forged) {
        toast.success(`The Arcanum acknowledges ${entry.name}`, {
          description: "The spell is granted to you. It waits in your Spellbook.",
          duration: 12_000,
          action: { label: "Open", onClick: () => navigate("/library") },
        });
      } else {
        toast.error(`${entry.name} was not granted`, { description: entry.message ?? undefined, duration: 12_000 });
      }
    }
    void Promise.all([utils.spells.mySpells.invalidate(), utils.spells.sparkBalance.invalidate()]);
    ack.mutate({ ids: fresh.map((entry) => entry.id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.data]);

  return null;
}

/** The player's designs waiting at the forge, with the option to withdraw one. */
export function ForgeQueuePanel() {
  const queue = useForgeQueue();
  const utils = trpc.useUtils();
  const withdraw = trpc.spells.withdrawQueued.useMutation();
  const waiting = queue.data?.waiting ?? [];
  if (!waiting.length) return null;

  return (
    <Panel title="Before the Arcanum">
      <p className="text-xs text-muted-foreground">
        The forge is cooling. These designs rest before the Arcanum, the will that presides over all magic. When the fires return it will weigh
        each one and grant it to you, and you will be told here. Each costs its Spark only then.
      </p>
      <ul className="mt-3 space-y-2">
        {waiting.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Hourglass className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{entry.name}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {entry.element} {entry.category}
              </span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={withdraw.isPending}
              onClick={async () => {
                await withdraw.mutateAsync({ id: entry.id }).catch(() => {});
                await utils.spells.forgeQueue.invalidate();
              }}
            >
              Withdraw
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
