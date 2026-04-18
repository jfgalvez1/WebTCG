"use client";

import { CardInstance } from "@/store/gameStore";

const RARITY_STYLES = {
  GENESIS: "border-yellow-400 shadow-yellow-400/60 bg-gradient-to-b from-yellow-950/80 to-gray-950",
  CLONE: "border-purple-500 shadow-purple-500/40 bg-gradient-to-b from-purple-950/80 to-gray-950",
  COMMON: "border-cyan-700 shadow-cyan-700/30 bg-gradient-to-b from-cyan-950/60 to-gray-950",
  DEAD_LINK: "border-red-900 shadow-red-900/20 bg-gradient-to-b from-red-950/60 to-gray-950",
};

const RARITY_LABELS = {
  GENESIS: "◈ GENESIS 1-OF-1",
  CLONE: "⌬ CLONE",
  COMMON: "◇ COMMON",
  DEAD_LINK: "✕ DEAD LINK",
};

const FACTION_COLORS: Record<string, string> = {
  "E-Commerce": "bg-green-900 text-green-300 border-green-700",
  Media: "bg-blue-900 text-blue-300 border-blue-700",
  Tech: "bg-cyan-900 text-cyan-300 border-cyan-700",
  Social: "bg-pink-900 text-pink-300 border-pink-700",
  Gaming: "bg-purple-900 text-purple-300 border-purple-700",
  Finance: "bg-yellow-900 text-yellow-300 border-yellow-700",
  Education: "bg-indigo-900 text-indigo-300 border-indigo-700",
  Government: "bg-orange-900 text-orange-300 border-orange-700",
  Neutral: "bg-gray-800 text-gray-400 border-gray-600",
};

interface CardProps {
  card: CardInstance & { currentHealth?: number; isTapped?: boolean };
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
  connectionCost?: number;
  showCost?: boolean;
}

export default function Card({
  card,
  size = "md",
  selected,
  onClick,
  dimmed,
  connectionCost,
  showCost,
}: CardProps) {
  const rarityStyle = RARITY_STYLES[card.rarity];
  const rarityLabel = RARITY_LABELS[card.rarity];
  const hp = card.currentHealth ?? card.baseHealth;

  const sizeClasses = {
    sm: "w-28 h-40 text-xs",
    md: "w-40 h-56 text-sm",
    lg: "w-48 h-64 text-sm",
  };

  const attackPenalty = card.rarity === "CLONE" ? -1 : 0;
  const healthPenalty = card.rarity === "CLONE" ? -1 : 0;
  const displayAttack = card.baseAttack + attackPenalty;
  const displayHealth = hp + healthPenalty;

  return (
    <div
      onClick={onClick}
      className={`
        relative flex flex-col rounded-lg border-2 shadow-lg cursor-pointer
        transition-all duration-200 select-none font-mono overflow-hidden
        ${sizeClasses[size]}
        ${rarityStyle}
        ${selected ? "ring-2 ring-white scale-105 z-10" : ""}
        ${dimmed ? "opacity-40 grayscale" : "hover:scale-105 hover:z-10"}
        ${card.isTapped ? "rotate-6 opacity-70" : ""}
      `}
    >
      {/* Header */}
      <div className="px-2 pt-1.5 pb-1">
        <div className="text-[9px] text-gray-500 uppercase tracking-widest truncate">
          {rarityLabel}
        </div>
        <div className="text-white font-bold truncate leading-tight" style={{ fontSize: size === "sm" ? "9px" : "11px" }}>
          {card.url}
        </div>
      </div>

      {/* Art area */}
      <div className="flex-1 mx-2 rounded border border-current/20 flex items-center justify-center bg-black/40 relative overflow-hidden">
        <div className="text-center opacity-60">
          <div className="text-2xl">{getFactionIcon(card.factions[0])}</div>
          <div className="text-[9px] text-gray-600 mt-1">{card.factions[0]}</div>
        </div>
        {/* Scan line overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent bg-[length:100%_4px] pointer-events-none" />
      </div>

      {/* Faction tags */}
      <div className="flex flex-wrap gap-0.5 px-1.5 py-1">
        {card.factions.slice(0, 2).map((f) => (
          <span
            key={f}
            className={`border rounded px-1 leading-tight ${FACTION_COLORS[f] || FACTION_COLORS["Neutral"]}`}
            style={{ fontSize: "8px" }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between px-2 pb-1.5">
        <div className="flex items-center gap-0.5">
          <span className="text-red-400" style={{ fontSize: "9px" }}>⚔</span>
          <span className="text-white font-bold" style={{ fontSize: size === "sm" ? "10px" : "13px" }}>{displayAttack}</span>
        </div>
        {showCost && connectionCost !== undefined && (
          <div className="text-yellow-400 font-bold" style={{ fontSize: "9px" }}>
            ⚡{connectionCost}
          </div>
        )}
        <div className="flex items-center gap-0.5">
          <span className="text-green-400" style={{ fontSize: "9px" }}>♥</span>
          <span className={`font-bold ${displayHealth <= 2 ? "text-red-400" : "text-white"}`} style={{ fontSize: size === "sm" ? "10px" : "13px" }}>
            {displayHealth}
          </span>
        </div>
      </div>

      {/* Genesis shimmer */}
      {card.rarity === "GENESIS" && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-pulse pointer-events-none" />
      )}

      {/* Tapped overlay */}
      {card.isTapped && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="text-gray-400 text-xs rotate-[-6deg]">TAPPED</span>
        </div>
      )}
    </div>
  );
}

export function CardBack({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-28 h-40",
    md: "w-40 h-56",
    lg: "w-48 h-64",
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-lg border-2 border-cyan-900 bg-gradient-to-b from-gray-900 to-gray-950
        flex items-center justify-center relative overflow-hidden shadow-lg
      `}
    >
      <div className="absolute inset-2 border border-cyan-900/50 rounded" />
      <div className="text-center">
        <div className="text-cyan-700 text-3xl">⟨/⟩</div>
        <div className="text-cyan-900 text-xs font-mono mt-1 tracking-widest">WEB TCG</div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/30 to-transparent pointer-events-none" />
    </div>
  );
}

function getFactionIcon(faction: string): string {
  const icons: Record<string, string> = {
    "E-Commerce": "🛒",
    Media: "📺",
    Tech: "💻",
    Social: "🔗",
    Gaming: "🎮",
    Finance: "💹",
    Education: "🎓",
    Government: "🏛️",
    Neutral: "🌐",
  };
  return icons[faction] || "🌐";
}
