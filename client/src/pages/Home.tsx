import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getLoginUrl } from "@/const";
import { Zap, Users, Trophy, FlaskConical, Swords } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Panel } from "@/components/game/panel";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-50 flex items-center justify-between px-8 py-5 border-b border-border bg-card/80 backdrop-blur-md"
      >
        <div onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/40 font-serif text-base font-bold text-primary bg-background">
            A
          </span>
          <span className="font-serif text-xl font-semibold tracking-[0.2em] text-foreground">ARCANIS</span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="border-primary/40 text-foreground hover:bg-secondary"
          >
            Sign In
          </Button>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            Enter Realm
          </Button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 px-8 py-20 text-center max-w-4xl mx-auto my-auto flex flex-col items-center justify-center"
      >
        <motion.div variants={itemVariants}>
          <h1 className="font-serif text-5xl md:text-7xl font-semibold mb-6 leading-tight text-balance">
            Craft Spells.{" "}
            <span className="text-primary italic">
              Master Magic.
            </span>{" "}
            Dominate Battles.
          </h1>
        </motion.div>

        <motion.div variants={itemVariants} className="arc-rule w-48 my-4" />

        <motion.p variants={itemVariants} className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Enter The Lab to forge AI-generated spells with unique elemental abilities. Duel opponents in real-time turn-based combat with interactive minigames determining your spell's power.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex gap-4 justify-center flex-wrap"
        >
          <Button
            size="lg"
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 font-medium shadow-md gap-2"
          >
            <Swords size={18} />
            Begin Journey
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/auth")}
            className="border-border text-foreground hover:bg-secondary text-base px-8"
          >
            Sign In
          </Button>
        </motion.div>
      </motion.section>

      {/* Features Grid */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 px-8 py-16 max-w-6xl mx-auto w-full"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Panel title="The Lab">
            <div className="flex flex-col gap-2 pt-1">
              <FlaskConical className="text-primary" size={28} />
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                Create unique spells powered by AI. Each spell is generated with custom stats, abilities, and card art.
              </p>
            </div>
          </Panel>
          <Panel title="Spell Library">
            <div className="flex flex-col gap-2 pt-1">
              <Zap className="text-primary" size={28} />
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                Build your collection from 36 platform spells or channel your own custom deck strategies.
              </p>
            </div>
          </Panel>
          <Panel title="Real-Time Battles">
            <div className="flex flex-col gap-2 pt-1">
              <Users className="text-primary" size={28} />
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                Duel opponents in turn-based combat. Each spell cast triggers an interactive minigame determining damage.
              </p>
            </div>
          </Panel>
          <Panel title="Competitive">
            <div className="flex flex-col gap-2 pt-1">
              <Trophy className="text-primary" size={28} />
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                Climb the circles, unlock achievements, and prove your mastery of magic in the open brawl arena.
              </p>
            </div>
          </Panel>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-8 py-6 text-center text-xs text-muted-foreground font-serif">
        <p>ARCANIS © 2026 — Competitive Magic RPG</p>
      </footer>
    </div>
  );
}
