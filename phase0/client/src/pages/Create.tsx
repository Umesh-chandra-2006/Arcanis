import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Page } from "@/components/layout/page";
import { useAuth } from "@/contexts/AuthContext";
import { Panel } from "@/components/game/panel";
import { PotentialNote, SpellCardWrapper, SpellStats } from "@/components/SpellCard";
import { ElementIcon } from "@/components/game/element-icon";
import { SparkDots } from "@/components/SparkDots";
import { SparkPacksDialog } from "@/components/SparkPacks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { mapSpellToCardProps, type SpellCardProps } from "@/lib/adapters";
import { shareUrlFor } from "@/lib/share";
import { useNameGate } from "@/components/NameDialog";
import { ForgeQueuePanel } from "@/components/ForgeQueue";
import { EXAMPLE_PROMPTS } from "@/lib/example-prompts";
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
import { CREATION_ENABLED, type CreationCategory, type Element } from "@shared/taxonomy";

const ELEMENTS = CREATION_ENABLED.elements;
const CATEGORIES = CREATION_ENABLED.categories;

const FORGE_STEPS = [
  "Reading your words…",
  "Forging flavor and lore…",
  "Calling the elemental flame…",
  "Sealing the card…",
];

export default function Create() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
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
  const { gate, dialog: nameDialog } = useNameGate();
  const [zeroOpen, setZeroOpen] = useState(false);
  const [zeroShown, setZeroShown] = useState(false);
  const myCode = trpc.referrals.myCode.useQuery(undefined, { enabled: isAuthenticated, staleTime: Infinity });
  const trackEvent = trpc.analytics.track.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    // Wait for the session check; a reload must not bounce a signed-in player.
    if (!isLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) trackEvent.mutate({ eventType: "lab_opened", metadata: {} }, { onError: () => {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (phase !== "forging") return;
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, FORGE_STEPS.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, [phase]);

  const balance = sparkBalance.data?.balance ?? 5;

  // Fake door: the first time the player is at zero Spark on this visit, show the packs.
  useEffect(() => {
    if (sparkBalance.data?.balance === 0 && !zeroShown && phase === "form") {
      setZeroShown(true);
      setZeroOpen(true);
    }
  }, [sparkBalance.data?.balance, zeroShown, phase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error("Give your spell a name and a description");
      return;
    }
    if (balance < 1) {
      setZeroOpen(true);
      toast.error("You're out of Spark");
      return;
    }

    setPhase("forging");
    setStepIndex(0);

    try {
      const result = await createSpell.mutateAsync({
        name: name.trim(),
        element: element as Element,
        category: category as CreationCategory,
        castType: "Instant",
        description: description.trim(),
      });

      if (result.success && result.spell) {
        setCreated(result.spell);
        await Promise.all([
          utils.spells.sparkBalance.invalidate(),
          utils.spells.mySpells.invalidate(),
          utils.spells.stoneBalance.invalidate(),
        ]);
        setPhase("done");
      } else if (result.code === "queued") {
        // The forge is cooling: the design rests before the Arcanum and is granted later.
        setPhase("form");
        setName("");
        setDescription("");
        await utils.spells.forgeQueue.invalidate();
        toast.message("The forge is cooling", { description: result.error, duration: 9000 });
      } else {
        setPhase("form");
        if (result.code === "no_spark") setZeroOpen(true);
        else toast.error(result.error ?? "The forge could not shape that spell. Please try again.");
      }
    } catch (error: any) {
      setPhase("form");
      toast.error(error?.message ?? "The forge is busy. Please try again.");
    }
  };

  const shareUrl = useMemo(
    () =>
      created
        ? shareUrlFor(created.id, myCode.data?.code)
        : "",
    [created, myCode.data?.code]
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackEvent
      .mutateAsync({ eventType: "share_clicked", metadata: { spellId: created?.id, channel: "copy" } })
      .catch(() => {});
  };

  const tweet = () => {
    trackEvent
      .mutateAsync({ eventType: "share_clicked", metadata: { spellId: created?.id, channel: "twitter" } })
      .catch(() => {});
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I forged "${created?.name}" on Arcanis. Describe yours.`)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const discordCopy = async () => {
    const markdown = `**${created?.name}**, forged on Arcanis\n${shareUrl}`;
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
    <div>

      <SparkPacksDialog open={zeroOpen} onOpenChange={setZeroOpen} source="zero_spark" balance={0} />
      <Page title="Lab" subtitle="Describe a spell. The forge balances it, writes its lore and paints its card.">
        <AnimatePresence mode="wait">
          {phase === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="mx-auto mb-4 max-w-2xl empty:hidden">
                <ForgeQueuePanel />
              </div>
              <Panel title="Create Your Spell" gold className="mx-auto max-w-2xl">
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Not sure where to begin? Start from one of these</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EXAMPLE_PROMPTS.map((example) => (
                        <button
                          key={example.name}
                          type="button"
                          onClick={() => {
                            setName(example.name);
                            setElement(example.element);
                            setCategory(example.category);
                            setDescription(example.description);
                          }}
                          className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          <ElementIcon element={example.element} size={12} />
                          {example.name}
                        </button>
                      ))}
                    </div>
                  </div>

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
                <h2 className="font-serif text-2xl font-semibold">Forging your spell…</h2>
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
                  Your spell is forged
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Forged from 1 Spark. {balance} remaining.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  It yielded 1 Refinement Stone. Open the card to refine the spell.
                </p>
              </div>

              <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 md:flex-row md:items-start">
                <SpellCardWrapper spell={mapSpellToCardProps(created) as SpellCardProps} size="lg" />
                <div className="w-full flex-1 space-y-4">
                  <p className="text-center font-serif text-lg italic leading-relaxed text-primary/90 md:text-left">"{created.loreLine}"</p>
                  <PotentialNote tier={created.tier} potential={created.potentialTier} />
                  <p className="text-sm leading-relaxed text-foreground/90">{created.flavorText}</p>
                  <SpellStats spell={mapSpellToCardProps(created)} />
                </div>
              </div>

              {nameDialog}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={() => gate(copyLink)}>
                  <Copy /> {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button variant="outline" onClick={() => gate(tweet)}>
                  <Twitter /> Tweet
                </Button>
                <Button variant="outline" onClick={() => gate(discordCopy)}>
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
      </Page>
    </div>
  );
}