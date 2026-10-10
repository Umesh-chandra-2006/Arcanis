import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Page } from "@/components/layout/page";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/game/panel";
import { SpellCard } from "@/components/game/spell-card";
import { Stars } from "@/components/reviews/stars";
import { mapSpellToCardProps, elementAccent } from "@/lib/adapters";
import { Sparkles, Wand2, Star, LogOut } from "lucide-react";
import { toast } from "sonner";
import { SPARK } from "@shared/constants";
import { PotentialNote, SpellStats } from "@/components/SpellCard";
import { ReportButton } from "@/components/ReportButton";
import { useNameGate } from "@/components/NameDialog";

function ReviewsSection({ spellId }: { spellId: string }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const reviewsQuery = trpc.reviews.forSpell.useQuery({ spellId });
  const submit = trpc.reviews.submit.useMutation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { gate, dialog: nameDialog } = useNameGate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast.error("Pick a star rating first");
      return;
    }
    // Reviews show the author's name, so a mage name is needed first.
    gate(() => void postReview());
  };

  const postReview = async () => {
    try {
      await submit.mutateAsync({ spellId, rating, comment });
      toast.success("Review posted");
      setRating(0);
      setComment("");
      reviewsQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not post your review");
    }
  };

  const data = reviewsQuery.data;

  return (
    <section className="w-full max-w-xl mt-10">
      <Panel
        title="Reviews"
        gold
        action={
          data && data.summary.count > 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="size-3.5 text-primary" fill="currentColor" />
              {data.summary.average?.toFixed(1)} · {data.summary.count}{" "}
              {data.summary.count === 1 ? "review" : "reviews"}
            </span>
          ) : undefined
        }
      >
        {reviewsQuery.isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner className="size-5" />
          </div>
        ) : data && data.reviews.length > 0 ? (
          <div className="space-y-4">
            {data.reviews.map((review) => (
              <div key={review.id} className="border-b border-border/40 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{review.authorUsername}</span>
                  <Stars value={review.rating} size={13} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{review.comment}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  <ReportButton targetType="review" targetId={review.id} compact />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to review this spell.
          </p>
        )}

        <div className="mt-6 border-t border-border/40 pt-5">
          {nameDialog}
          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Your rating</span>
                <Stars value={rating} size={20} onChange={setRating} />
              </div>
              <Textarea
                placeholder="What did you think of this spell?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={submit.isPending}>
                  {submit.isPending ? <Spinner className="size-3.5" /> : <Star />}
                  Post review
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/signin" className="text-primary underline">
                Sign in
              </Link>{" "}
              to leave a review.
            </p>
          )}
        </div>
      </Panel>
    </section>
  );
}

export default function ShareSpell() {
  const { spellId = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const spellQuery = trpc.spells.getSpellPublic.useQuery({ spellId });
  const recordOpen = trpc.spells.recordShareOpen.useMutation();
  const trackEvent = trpc.analytics.track.useMutation();
  const recordedRef = useRef(false);
  const [params] = useSearchParams();
  const captureReferral = trpc.referrals.capture.useMutation();

  // A visitor from a shared link: remember the sharer's code for a later signup.
  useEffect(() => {
    const ref = params.get("ref");
    if (ref && !isAuthenticated) captureReferral.mutate({ code: ref }, { onError: () => {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (spellQuery.data && !recordedRef.current) {
      recordedRef.current = true;
      recordOpen.mutate({ spellId, referrer: document.referrer.slice(0, 200) || undefined }, { onError: () => {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellQuery.data]);

  const handleCta = () => {
    trackEvent
      .mutateAsync({
        eventType: "preview_cta_clicked",
        metadata: { spellId },
      })
      .catch(() => {});
    if (isAuthenticated) {
      navigate("/create");
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  };

  if (spellQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  const spell = spellQuery.data;

  if (!spell) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-serif text-2xl font-semibold">This spell can't be found</h1>
        <p className="text-sm text-muted-foreground">
          It may have been lost to the void. Create your own instead.
        </p>
        <Link to="/">
          <Button>
            <Wand2 /> Create a Spell
          </Button>
        </Link>
      </div>
    );
  }

  const card = mapSpellToCardProps(spell);

  return (
    <div>

      <Page width="narrow">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8">
          <SpellCard spell={card} size="lg" />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="capitalize">
              {spell.element} element
            </Badge>
            <Badge variant="outline" className="capitalize">
              {spell.category}
            </Badge>
            <Badge variant="outline">{spell.castType}</Badge>
            <Badge variant="outline" className="border-primary/40 text-primary">
              {spell.tier}
            </Badge>
          </div>

          <Panel className="w-full max-w-xl" gold>
            <div className="space-y-4">
              <p className="text-center font-serif text-lg italic leading-relaxed text-primary/90">"{spell.loreLine}"</p>
              <PotentialNote tier={spell.tier} potential={spell.potentialTier} />
              <p className="text-sm leading-relaxed text-foreground/90">{spell.flavorText}</p>
              <SpellStats spell={card} />
              <div className="flex justify-end">
                <ReportButton targetType="spell" targetId={spell.id} />
              </div>
            </div>
          </Panel>

          <div className="w-full max-w-xl">
            <Button size="lg" className="w-full" onClick={handleCta}>
              <Sparkles />
              Create Your Own Spell
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Describe a spell. Arcanis forges its stats and lore. {SPARK.signupGrant} free Spark on signup.
            </p>
          </div>

          <ReviewsSection spellId={spell.id} />
        </div>
      </Page>
    </div>
  );
}