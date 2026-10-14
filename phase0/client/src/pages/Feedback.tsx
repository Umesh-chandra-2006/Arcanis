import { trpc } from "@/lib/trpc";
import { Page } from "@/components/layout/page";
import { Panel } from "@/components/game/panel";
import { FeedbackForm } from "@/components/Feedback";
import { SignInForm } from "@/components/SignInForm";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";

/** Feedback from players (v7.7). Signed in only, so a note can be followed up and the form cannot be flooded. */
export default function Feedback() {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <Page title="Feedback" subtitle="Arcanis is shaped by its first mages. Tell us what works, what breaks, and what you wish it did.">
      <Panel title={isAuthenticated ? "Send word to the makers" : "Sign in to send feedback"} gold className="mx-auto max-w-2xl">
        {isLoading ? <Spinner /> : isAuthenticated ? <FeedbackForm source="page" /> : <SignInForm redirectTo="/feedback" />}
      </Panel>
    </Page>
  );
}

/** Admin: the latest feedback, newest first. */
export function AdminFeedback() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const list = trpc.feedback.list.useQuery(undefined, { enabled: isAdmin });
  if (!isAdmin) return <Page title="Feedback">Admins only.</Page>;
  const rows = list.data ?? [];
  return (
    <Page title="Player feedback" subtitle={`${rows.length} most recent notes.`}>
      <Panel>
        {list.isLoading ? (
          <Spinner />
        ) : rows.length ? (
          <ul className="divide-y divide-border">
            {rows.map((f) => (
              <li key={f.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-foreground">{f.username ?? `user ${f.userId}`}</span>
                  <span>{f.email}</span>
                  <span className="rounded-full border border-border px-2 py-0.5">{f.kind}</span>
                  <span>{f.source === "first_spell" ? "after first spell" : "feedback page"}</span>
                  {f.rating && (
                    <span className="flex items-center gap-0.5 text-primary">
                      {f.rating} <Star className="size-3 fill-primary" />
                    </span>
                  )}
                  <span className="ml-auto">{new Date(f.createdAt).toLocaleString()}</span>
                </div>
                {f.message && <p className="whitespace-pre-wrap text-sm">{f.message}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No feedback yet.</p>
        )}
      </Panel>
    </Page>
  );
}
