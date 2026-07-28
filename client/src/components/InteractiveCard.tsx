import { ReactNode, useRef, useState } from "react";
import { motion } from "framer-motion";

interface InteractiveCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: "purple" | "blue" | "pink" | "amber";
}

const colorMap = {
  purple: {
    border: "border-purple-500/30 hover:border-purple-400/50",
    bg: "bg-gradient-to-br from-purple-500/10 to-purple-500/5",
    glow: "group-hover:shadow-lg group-hover:shadow-purple-500/20",
    icon: "text-purple-400",
  },
  blue: {
    border: "border-blue-500/30 hover:border-blue-400/50",
    bg: "bg-gradient-to-br from-blue-500/10 to-blue-500/5",
    glow: "group-hover:shadow-lg group-hover:shadow-blue-500/20",
    icon: "text-blue-400",
  },
  pink: {
    border: "border-pink-500/30 hover:border-pink-400/50",
    bg: "bg-gradient-to-br from-pink-500/10 to-pink-500/5",
    glow: "group-hover:shadow-lg group-hover:shadow-pink-500/20",
    icon: "text-pink-400",
  },
  amber: {
    border: "border-amber-500/30 hover:border-amber-400/50",
    bg: "bg-gradient-to-br from-amber-500/10 to-amber-500/5",
    glow: "group-hover:shadow-lg group-hover:shadow-amber-500/20",
    icon: "text-amber-400",
  },
};

export function InteractiveCard({ icon, title, description, color }: InteractiveCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const colors = colorMap[color];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ scale: 1.05, y: -10 }}
      className={`group relative overflow-hidden rounded-lg border ${colors.border} ${colors.bg} p-6 backdrop-blur-sm transition-all duration-300 ${colors.glow} cursor-pointer`}
    >
      {/* Animated gradient background on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168, 85, 247, 0.1) 0%, transparent 80%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className={`${colors.icon} mb-4 text-4xl`}
        >
          {icon}
        </motion.div>
        <motion.h4
          initial={{ x: -10, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-xl font-bold mb-2"
        >
          {title}
        </motion.h4>
        <motion.p
          initial={{ x: -10, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-gray-300 text-sm"
        >
          {description}
        </motion.p>
      </div>

      {/* Border glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          border: `1px solid transparent`,
          backgroundImage: `linear-gradient(${colors.border.split(" ")[0]}, ${colors.border.split(" ")[0]})`,
          backgroundClip: "padding-box",
        }}
      />
    </motion.div>
  );
}
