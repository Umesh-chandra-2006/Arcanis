import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Panel } from "@/components/game/panel";
import { Stars } from "@/components/reviews/stars";
import { Wand2, LogOut } from "lucide-react";
import { elementAccent } from "@/lib/adapters";

function ReviewThumb({ imageUrl, element, name }: { imageUrl: string; element: string; name: string }) {
  const accent = elementAccent(element);
  const src =
    imageUrl.trim().length > 0
      ? imageUrl
      : `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="96"><rect width="80" height="96" fill="#0f0d18"/><circle cx="40" cy="46" r="30" fill="${accent}" opacity="0.7"/></svg>`
        )}`;
  return (
    <img
      src={src}
      alt={name}
      className="aspect-[5/7] w-16 shrink-0 rounded-md object-cover border border-border/40"
    />
  );
}

export default function ReviewsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const latest = trpc.reviews.latest.useQuery();
  const trackEvent = trpc.analytics.track.useMutation();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent
        .mutateAsync({ eventType: "reviews_page_viewed", metadata: {} })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <Link
            to="/"
            className="font-serif text-lg font-semibold tracking-[0.22em] text-primary uppercase"
          >
            Arcanis
          </Link>
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button size="sm" onClick={() => navigate("/create")}>
                  <Wand2 /> Create Spell
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate("/library")}>
                  My Spellbook
                </Button>
                <Button size="sm" variant="ghost" onClick={handleLogout}>
                  <LogOut /> Sign out
                </Button>
              </>
            ) : (
              <a href="/#signup" className="inline-block">
                <Button size="sm" variant="outline">
                  Sign in
                </Button>
              </a>
            )}
          </nav>
        </div>
      </header>

      <main className="container py-10">
        <Panel
          title="Tome of Reviews"
          gold
          action={<span className="text-xs text-muted-foreground">Latest first</span>}
        >
          {latest.isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : latest.data && latest.data.length > 0 ? (
            <div className="space-y-4">
              {latest.data.map((review) => (
                <div
                  key={review.id}
                  className="arc-panel flex gap-4 p-4"
                >
                  <Link to={`/spell/${review.spell.id}`} className="shrink-0">
                    <ReviewThumb
                      imageUrl={review.spell.imageUrl}
                      element={review.spell.element}
                      name={review.spell.name}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/spell/${review.spell.id}`}
                        className="font-serif text-base font-semibold hover:text-primary"
                      >
                        {review.spell.name}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {review.author.username}
                        </span>
                        <Stars value={review.rating} size={13} />
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {review.spell.element}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {review.spell.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                      {review.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-14 text-center text-sm text-muted-foreground">
              No reviews yet. Leave the first one on a spell's page.
            </p>
          )}
        </Panel>
      </main>
    </div>
  );
}