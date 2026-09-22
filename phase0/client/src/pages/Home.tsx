import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { ElementIcon } from "@/components/game/element-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { mapSpellToCardProps } from "@/lib/adapters";
import { Wand2, Sparkles, Share2, MailCheck, ArrowRight, MessageSquareMore } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const featured = trpc.spells.featured.useQuery();
  const requestLink = trpc.auth.requestMagicLink.useMutation();
  const accountStatus = trpc.auth.accountStatus.useQuery({ email }, { enabled: false });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/create");
    }
  }, [isAuthenticated, user, navigate]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const params = new URLSearchParams();
    params.set("email", email);

    try {
      const res = await accountStatus.refetch();
      if (res.data?.hasPassword) {
        navigate(`/signin?${params.toString()}`);
        return;
      }
      const result = await requestLink.mutateAsync({ email });
      if (result.devUrl) {
        setDevUrl(result.devUrl);
        toast.success("Magic link generated", { description: "Dev mode: use the link below." });
      } else {
        toast.success("Check your inbox", { description: "Your magic sign-in link is on its way." });
      }
      setEmail("");
    } catch (error: any) {
      toast.error(error?.message ?? "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-serif text-lg font-semibold tracking-[0.22em] text-primary uppercase">
            Arcanis
          </span>
          <nav className="flex items-center gap-2">
            <Link to="/reviews" className="inline-block">
              <Button size="sm" variant="ghost">
                <MessageSquareMore />
                Reviews
              </Button>
            </Link>
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/create")}>
                <Wand2 />
                Create Spell
              </Button>
            ) : (
              <Link to="/signin">
                <Button size="sm" variant="outline">Sign in</Button>
              </Link>
            )}
            {isAuthenticated && (
              <Button size="sm" variant="ghost" onClick={() => navigate("/library")}>
                My Spellbook
              </Button>
            )}
          </nav>
        </div>
      </header>

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
                The Magic Tower awaits
              </p>
              <h1 className="text-4xl sm:text-6xl font-serif font-semibold leading-tight">
                Create spells.
                <br />
                <span className="text-primary">Battle with them.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-muted-foreground text-sm sm:text-base">
                Describe a spell in your own words. The Tower forges its stats, lore, and
                artwork — then you share it with the world. Five free Sparks on signup.
              </p>

              <div className="mt-8 flex items-center justify-center gap-3">
                <a href="#signup" className="inline-block">
                  <Button size="lg">
                    <Sparkles />
                    Create Your First Spell — Free
                  </Button>
                </a>
                <a href="#featured" className="hidden sm:inline-block">
                  <Button size="lg" variant="outline">See Examples</Button>
                </a>
              </div>

              <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4 text-left">
                {[
                  { icon: Wand2, title: "Describe", text: "Name it, choose its element, write its story." },
                  { icon: Sparkles, title: "Forge", text: "The Tower generates stats, lore, and art." },
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
          <Panel title="Claim your Sparks" gold className="mx-auto max-w-lg">
            {devUrl ? (
              <div className="space-y-3 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15">
                  <MailCheck className="size-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Dev mode.</span> No email is sent —
                  open your magic link to continue:
                </p>
                <a href={devUrl} className="inline-block">
                  <Button>Open magic link</Button>
                </a>
                <p className="text-[11px] text-muted-foreground break-all">{devUrl}</p>
              </div>
            ) : (
              <form onSubmit={handleContinue} className="space-y-3">
                <Label htmlFor="home-email">Email address</Label>
                <div className="flex gap-2">
                  <Input
                    id="home-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" disabled={requestLink.isPending}>
                    {requestLink.isPending ? <Spinner /> : <ArrowRight />}
                    Continue
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  New here? We'll email a sign-in link and you'll set a password on first login.
                  Returning mage? Head to the{" "}
                  <Link to="/signin" className="underline text-primary">
                    sign-in page
                  </Link>
                  .
                </p>
              </form>
            )}
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
                The Tower is still forging its first legends. Be the first to create one.
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