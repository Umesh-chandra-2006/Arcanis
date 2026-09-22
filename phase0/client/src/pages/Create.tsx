import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { SpellCardWrapper } from "@/components/SpellCard";
import { ElementIcon } from "@/components/game/element-icon";
import { SparkDots } from "@/components/SparkDots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { mapSpellToCardProps, type SpellCardProps } from "@/lib/adapters";
import type { Phase0Spell } from "@/lib/adapters";
import {
  Wand2,
  Copy,
  Twitter,
  MessageCircle,
  Sparkles,
  Loader2,
  BookOpen,
  LogOut,
} from "lucide-react";
import { PHASE0_ELEMENTS, PHASE0_CATEGORIES } from "@shared/constants";

const ELEMENTS = PHASE0_ELEMENTS;
const CATEGORIES = PHASE0_CATEGORIES;

const FORGE_STEPS = [
  "The Tower weighs your words…",
  "Forging flavor and lore…",
  "Calling the elemental flame…",
  "Sealing the card…",
];

export default function Create() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [element, setElement] = useState<string>("Fire");
  const [category, setCategory] = useState<string>("Attack");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<"form" | "forging" | "done">("form");
  const [stepIndex, setStepIndex] = useState(0);
  const [created, setCreated] = useState<Phase0Spell | null>(null);
  const [copied, setCopied] = useState(false);

  const sparkBalance = trpc.spells.sparkBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createSpell = trpc.spells.create.useMutation();
  const trackEvent = trpc.analytics.track.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (phase !== "forging") return;
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, FORGE_STEPS.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, [phase]);

  const balance = sparkBalance.data?.balance ?? 5;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error("Give your spell a name and a description");
      return;
    }
    if (balance < 1) {
      toast.error("You're out of Sparks");
      return;
    }

    setPhase("forging");
    setStepIndex(0);

    try {
      const result = await createSpell.mutateAsync({
        name: name.trim(),
        element: element as "Fire" | "Water" | "Earth" | "Wind",
        category: category as "Attack" | "Defense" | "Regen" | "Debuff",
        castType: "Instant",
        description: description.trim(),
      });

      if (result.success && result.spell) {
        setCreated(result.spell);
        await Promise.all([
          utils.spells.sparkBalance.invalidate(),
          utils.spells.mySpells.invalidate(),
        ]);
        setPhase("done");
      } else {
        setPhase("form");
        toast.error(result.error ?? "The Tower could not forge your spell");
      }
    } catch (error: any) {
      setPhase("form");
      toast.error(error?.message ?? "The Tower is busy. Please try again.");
    }
  };

  const shareUrl = useMemo(
    () =>
      created
        ? `${(import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim() || window.location.origin}/spell/${created.id}`
        : "",
    [created]
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackEvent
      .mutateAsync({ eventType: "share_link_copied", metadata: { spellId: created?.id } })
      .catch(() => {});
  };

  const tweet = () => {
    trackEvent
      .mutateAsync({ eventType: "spell_shared", metadata: { spellId: created?.id, channel: "twitter" } })
      .catch(() => {});
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I forged "${created?.name}" on Arcanis. The Tower made it real.`)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const discordCopy = async () => {
    const markdown = `**${created?.name}** — forged on Arcanis\n${shareUrl}`;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="font-serif text-lg font-semibold tracking-[0.22em] text-primary uppercase"
          >
            Arcanis
          </button>
          <nav className="flex items-center gap-2">
            <SparkDots balance={balance} />
            <Button size="sm" variant="ghost" onClick={() => navigate("/library")}>
              <BookOpen />
              Spellbook
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut />
              Sign out
            </Button>
          </nav>
        </div>
      </header>

      <main className="container py-10">
        <AnimatePresence mode="wait">
          {phase === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Panel title="Create Your Spell" gold className="mx-auto max-w-2xl">
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="spell-name">Spell Name</Label>
                    <Input
                      id="spell-name"
                      placeholder="Ember Lance"
                      value={name}
                      maxLength={64}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Element</Label>
                      <Select value={element} onValueChange={setElement}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ELEMENTS.map((el: string) => (
                            <SelectItem key={el} value={el}>
                              <span className="flex items-center gap-2">
                                <ElementIcon element={el} size={14} />
                                {el}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat: string) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cast Type</Label>
                      <Select value="Instant" disabled>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Instant">Instant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spell-desc">Describe your spell</Label>
                    <Textarea
                      id="spell-desc"
                      placeholder="A bolt of concentrated fire that erupts from the caster's palm and sears whatever it touches…"
                      value={description}
                      maxLength={1000}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-28"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      Costs 1 Spark
                    </span>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={createSpell.isPending || balance < 1}
                    >
                      <Wand2 />
                      Create Spell
                    </Button>
                  </div>
                </form>
              </Panel>
            </motion.div>
          )}

          {phase === "forging" && (
            <motion.div
              key="forging"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center"
            >
              <div className="relative flex size-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
                <div className="relative flex size-20 items-center justify-center rounded-full border border-primary/40 bg-card">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              </div>
              <div>
                <h2 className="font-serif text-2xl font-semibold">The Tower is forging…</h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stepIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-2 text-sm text-muted-foreground"
                  >
                    {FORGE_STEPS[stepIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {phase === "done" && created && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-2xl"
            >
              <div className="mb-6 text-center">
                <h2 className="font-serif text-2xl font-semibold text-primary">
                  ✨ Your spell is ready!
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Forged from 1 Spark. {balance - 1} remaining.
                </p>
              </div>

              <div className="flex justify-center">
                <SpellCardWrapper spell={mapSpellToCardProps(created) as SpellCardProps} size="lg" />
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={copyLink}>
                  <Copy /> {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button variant="outline" onClick={tweet}>
                  <Twitter /> Tweet
                </Button>
                <Button variant="outline" onClick={discordCopy}>
                  <MessageCircle /> {copied ? "Copied!" : "Discord"}
                </Button>
              </div>

              <div className="mt-8 flex justify-center gap-3">
                <Button
                  onClick={() => {
                    setPhase("form");
                    setName("");
                    setDescription("");
                    setCreated(null);
                  }}
                >
                  <Wand2 /> Create Another Spell
                </Button>
                <Button variant="ghost" onClick={() => navigate("/library")}>
                  View Spellbook
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}