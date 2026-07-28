import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getLoginUrl } from "@/const";
import { Wand2, Zap, Users, Trophy } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { InteractiveCard } from "@/components/InteractiveCard";
import { motion } from "framer-motion";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      <AnimatedBackground />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-50 flex items-center justify-between px-8 py-6 border-b border-purple-500/20 backdrop-blur-md bg-slate-900/30"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 cursor-pointer"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Wand2 className="h-8 w-8 text-purple-400" />
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            ARCANIS
          </h1>
        </motion.div>
        <div className="flex gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="border-purple-400 text-purple-400 hover:bg-purple-400/10 backdrop-blur-sm"
            >
              Sign In
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/50"
            >
              Get Started
            </Button>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 px-8 py-24 text-center max-w-4xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <h2 className="text-7xl md:text-8xl font-bold mb-6 leading-tight">
            Craft Spells.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-pulse">
              Master Magic.
            </span>{" "}
            Dominate Battles
          </h2>
        </motion.div>

        <motion.p variants={itemVariants} className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Enter The Lab to create AI-generated spells with unique abilities. Duel opponents in real-time turn-based battles with interactive minigames that determine your spell's power.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex gap-4 justify-center flex-wrap"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 shadow-lg shadow-purple-500/50"
            >
              Play Now
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="border-purple-400 text-purple-400 hover:bg-purple-400/10 text-lg px-8 backdrop-blur-sm"
            >
              Learn More
            </Button>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features Grid */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 px-8 py-20 max-w-6xl mx-auto"
      >
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold text-center mb-16"
        >
          Core Features
        </motion.h3>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <InteractiveCard
            icon={<Wand2 />}
            title="The Lab"
            description="Create unique spells powered by AI. Each spell is generated with custom stats, abilities, and stunning card art."
            color="purple"
          />
          <InteractiveCard
            icon={<Zap />}
            title="Spell Library"
            description="Build your collection from 36 platform spells or create your own. Organize decks for different battle strategies."
            color="blue"
          />
          <InteractiveCard
            icon={<Users />}
            title="Real-Time Battles"
            description="Duel opponents in turn-based combat. Each spell cast triggers an interactive minigame to determine damage."
            color="pink"
          />
          <InteractiveCard
            icon={<Trophy />}
            title="Competitive"
            description="Climb the rankings, unlock achievements, and prove your mastery of magic in the arena."
            color="amber"
          />
        </motion.div>
      </motion.section>

      {/* Minigames Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 px-8 py-20 bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-y border-purple-500/20"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-bold mb-8"
          >
            Master 6 Minigame Types
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-xl text-gray-300 mb-12"
          >
            Every spell cast is an interactive challenge. Your skill determines the damage dealt.
          </motion.p>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {["Timing Strike", "Pattern Match", "Rapid Tap", "Hold & Release", "Quick Reaction", "Sequence Input"].map((game, idx) => (
              <motion.div
                key={game}
                variants={itemVariants}
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(168, 85, 247, 0.5)" }}
                className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-lg p-4 backdrop-blur-sm hover:border-purple-400/50 transition-all cursor-pointer"
              >
                <p className="font-semibold">{game}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 px-8 py-24 text-center max-w-4xl mx-auto"
      >
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-6"
        >
          Ready to Enter ARCANIS?
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-xl text-gray-300 mb-8"
        >
          Create your first spell in The Lab and challenge opponents to epic magical duels.
        </motion.p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 shadow-lg shadow-purple-500/50"
          >
            Start Playing Now
          </Button>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-t border-purple-500/20 px-8 py-8 text-center text-gray-400 backdrop-blur-md bg-slate-900/30"
      >
        <p>ARCANIS © 2026 — Competitive Magic RPG</p>
      </motion.footer>
    </div>
  );
}
