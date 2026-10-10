import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { elementArtDataUri } from "@shared/element-art";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Action = "approve" | "remove" | "strike" | "ban" | "restore";

/** Minimal moderation queue (Build Plan 13): flagged items and player reports. */
export default function AdminModeration() {
  const { user, isLoading } = useAuth();
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const isAdmin = user?.role === "admin";
  const queue = trpc.moderation.queue.useQuery({ status, limit: 100 }, { enabled: isAdmin });
  const resolve = trpc.moderation.resolve.useMutation();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-serif text-2xl">Restricted</h1>
        <Link to="/"><Button variant="outline"><ArrowLeft /> Home</Button></Link>
      </div>
    );
  }

  const act = async (eventId: string, action: Action) => {
    try {
      await resolve.mutateAsync({ eventId, action });
      toast.success(`Done: ${action}`);
      queue.refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed");
    }
  };

  return (
    <div>
      <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl text-primary">Moderation queue</h1>
          <div className="flex gap-2">
            <Button size="sm" variant={status === "open" ? "default" : "outline"} onClick={() => setStatus("open")}>Open</Button>
            <Button size="sm" variant={status === "resolved" ? "default" : "outline"} onClick={() => setStatus("resolved")}>Resolved</Button>
            <Link to="/admin/metrics"><Button size="sm" variant="ghost">Metrics</Button></Link>
          </div>
        </div>
        {queue.isLoading ? (
          <Spinner />
        ) : !queue.data?.length ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          queue.data.map((e) => (
            <Panel key={e.id}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{e.surface}</Badge>
                <Badge variant={e.verdict === "reject" ? "destructive" : "outline"}>{e.verdict}</Badge>
                {e.reason && <Badge variant="outline">{e.reason}</Badge>}
                {e.layer2cResult && <Badge variant="outline">2c: {e.layer2cResult}</Badge>}
                {e.resolution && <Badge>{e.resolution}</Badge>}
                <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
              {e.spell && (
                <div className="mt-3 flex gap-3">
                  <img src={e.spell.cardImageUrl || e.spell.imageUrl || elementArtDataUri(e.spell.element, 80, 80)} alt="" className="size-20 rounded object-cover" />
                  <div className="text-sm">
                    <Link to={`/spell/${e.targetId}`} className="font-serif text-primary underline">{e.spell.name}</Link>
                    {!e.spell.isPublic && <span className="ml-2 text-destructive">(taken down)</span>}
                    <p className="text-muted-foreground">{e.spell.flavorText}</p>
                  </div>
                </div>
              )}
              {e.review && <p className="mt-3 text-sm">Review ({e.review.status}): {e.review.comment}</p>}
              {e.excerpt && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{e.excerpt}</p>}
              {status === "open" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => act(e.id, "approve")}>Approve</Button>
                  {e.targetType && <Button size="sm" variant="outline" onClick={() => act(e.id, "remove")}>Take down</Button>}
                  <Button size="sm" variant="outline" onClick={() => act(e.id, "strike")}>Take down + strike</Button>
                  <Button size="sm" variant="destructive" onClick={() => act(e.id, "ban")}>Ban</Button>
                </div>
              )}
              {status === "resolved" && e.targetType && (
                <div className="mt-3">
                  <Button size="sm" variant="ghost" onClick={() => act(e.id, "restore")}>Restore</Button>
                </div>
              )}
            </Panel>
          ))
        )}
      </main>
    </div>
  );
}
