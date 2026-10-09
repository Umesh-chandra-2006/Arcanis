import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { ElementIcon } from "@/components/game/element-icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SignInForm } from "@/components/SignInForm";
import { useAuth } from "@/contexts/AuthContext";
import { mapSpellToCardProps } from "@/lib/adapters";
import { Wand2, Sparkles, Share2, MessageSquareMore } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const featured = trpc.spells.featured.useQuery();
  const track = trpc.analytics.track.useMutation();

  useEffect(() => {
    track.mutate({ eventType: "landing_view", metadata: { referrer: document.referrer.slice(0, 200) || undefined, path: "/" } }, { onError: () => {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/create");
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,75,0.10),transparent_60%)]" />
          <div className="container relative py-20 sm:py-28 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <p className="text-[11px] uppercase tracking-[0.35em] text-primary/80 mb-4">
                Describe it. Forge it. Share it.
              </p>
              <h1 className="text-4xl sm:text-6xl font-serif font-semibold leading-tight">
                Create spells.
                <br />
                <span className="text-primary">Share them.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-muted-foreground text-sm sm:text-base">
                Describe a spell in your own words. Arcanis forges its stats, lore and
                artwork, and gives it a page to share. Five free Spark on signup.
              </p>

              <div className="mt-8 flex items-center justify-center gap-3">
                <a href="#signup" className="inline-block">
                  <Button size="lg">
                    <Sparkles />
                    Create your first spell, free
                  </Button>
                </a>
                <a href="#featured" className="hidden sm:inline-block">
                  <Button size="lg" variant="outline">See Examples</Button>
                </a>
              </div>

              <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4 text-left">
                {[
                  { icon: Wand2, title: "Describe", text: "Name it, choose its element, write its story." },
                  { icon: Sparkles, title: "Forge", text: "Stats, lore and art, balanced and checked." },
                  { icon: Share2, title: "Share", text: "A public page for every spell you create." },
                ].map((step, i) => (
                  <div key={i} className="arc-panel p-3.5">
                    <step.icon className="size-4 text-primary" />
                    <p className="mt-2 font-serif text-sm font-semibold">{step.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{step.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="signup" className="container py-12">
          <Panel title="Claim your free Spark" gold className="mx-auto max-w-lg">
            <SignInForm />
          </Panel>
        </section>

        <section id="featured" className="container py-12">
          <Panel
            title="Featured Spells"
            gold
            action={<ElementIcon element="arcane" size={16} />}
          >
            {featured.isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner className="size-6" />
              </div>
            ) : featured.data && featured.data.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-5">
                {featured.data.map((spell) => (
                  <Link key={spell.id} to={`/spell/${spell.id}`}>
                    <SpellCardWrapper spell={mapSpellToCardProps(spell)} size="sm" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No legends yet. Be the first to forge one.
              </p>
            )}
          </Panel>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <p className="font-serif text-primary tracking-[0.3em] uppercase text-sm">Arcanis</p>
        <p className="mt-2">Create. Share. Prove the magic is real.</p>
      </footer>
    </div>
  );
}