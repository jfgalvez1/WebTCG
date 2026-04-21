"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Card, { CardBack } from "@/components/Card";
import { CardInstance } from "@/store/gameStore";

interface BoosterCard extends CardInstance {
  instanceId: string;
  rawMetadata?: {
    monthlyVisits?: number;
    ageInYears?: number;
    source?: string;
  };
}

const RARITY_COLORS = {
  GENESIS: "text-yellow-400",
  COMMON: "text-cyan-400",
  DEAD_LINK: "text-red-400",
};
const RARITY_ICONS = { GENESIS: "◈", COMMON: "◇", DEAD_LINK: "✕" };

function formatVisits(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function BoosterPage() {
  const [cards, setCards] = useState<BoosterCard[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BoosterCard | null>(null);

  async function openPack() {
    setError("");
    setLoading(true);
    setCards([]);
    setRevealed([]);
    setOpened(false);

    const res = await fetch("/api/booster", { method: "POST" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to open pack.");
      return;
    }

    const fullCards: BoosterCard[] = data.cards.map((c: Record<string, unknown>) => ({
      instanceId: c.instanceId as string,
      url: c.url as string,
      rarity: "COMMON" as const,
      baseAttack: c.baseAttack as number,
      baseDef: c.baseDef as number,
      baseConnection: c.baseConnection as number,
      factions: c.factions as string[],
      dateAcquired: new Date().toISOString(),
      rawMetadata: c.rawMetadata as BoosterCard["rawMetadata"],
    }));

    setCards(fullCards);
    setRevealed(new Array(fullCards.length).fill(false));
    setOpened(true);

    // Reveal cards one by one with delay
    fullCards.forEach((_, i) => {
      setTimeout(() => {
        setRevealed((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, (i + 1) * 400);
    });
  }

  function revealAll() {
    setRevealed(cards.map(() => true));
  }

  return (
    <div className="min-h-screen matrix-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 text-xl">◈</span>
            <h1 className="text-xl font-bold tracking-widest uppercase">Booster Pack</h1>
          </div>
          <p className="text-gray-600 text-xs mt-1 ml-8">
            // Pull 5 random domain cards from the archive. 100 Standard Coins per pack.
          </p>
        </div>

        {/* Pack display */}
        <div className="border border-cyan-900/40 bg-gray-900/50 rounded-lg p-6 mb-6">
          {!opened && !loading && (
            <div className="text-center py-12">
              {/* Pack graphic */}
              <div className="inline-block border-2 border-cyan-700 bg-gradient-to-b from-cyan-950/80 to-gray-950 rounded-xl p-8 mb-6 shadow-xl shadow-cyan-900/30 relative">
                <div className="text-6xl mb-2">⟨/⟩</div>
                <div className="text-cyan-300 font-bold text-lg tracking-widest">BOOSTER PACK</div>
                <div className="text-cyan-700 text-xs mt-1">5 Random Domain Cards</div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent animate-pulse rounded-xl pointer-events-none" />
              </div>

              <div className="text-gray-500 text-sm mb-6">
                Open a pack to receive 5 random cards from the internet&apos;s domain archive.
              </div>

              <button
                onClick={openPack}
                className="bg-cyan-900/60 hover:bg-cyan-800/60 border border-cyan-600 text-cyan-300 font-bold px-8 py-3 rounded-lg transition-all text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-cyan-900/30 glow-cyan"
              >
                ◈ OPEN PACK — 100 COINS
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="text-cyan-400 text-4xl mb-4 animate-spin inline-block">⟳</div>
              <div className="text-cyan-400 text-sm tracking-widest">SCANNING ARCHIVE...</div>
              <div className="text-gray-600 text-xs mt-2">Fetching domain data from the internet...</div>
            </div>
          )}

          {opened && cards.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                  Pack Contents ({cards.length} cards)
                </h2>
                {revealed.some((r) => !r) && (
                  <button
                    onClick={revealAll}
                    className="text-xs text-cyan-500 hover:text-cyan-400 border border-cyan-900 hover:border-cyan-700 px-3 py-1 rounded transition-all"
                  >
                    Reveal All
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-4 justify-center">
                {cards.map((card, i) => (
                  <div
                    key={card.instanceId || i}
                    className="cursor-pointer"
                    onClick={() => {
                      if (!revealed[i]) {
                        setRevealed((prev) => {
                          const next = [...prev];
                          next[i] = true;
                          return next;
                        });
                      } else {
                        setSelectedCard(card);
                      }
                    }}
                  >
                    {revealed[i] ? (
                      <div className="card-reveal hover:scale-105 transition-transform">
                        <Card card={card} size="md" />
                      </div>
                    ) : (
                      <CardBack size="md" />
                    )}
                  </div>
                ))}
              </div>

              {/* Stats summary after full reveal */}
              {revealed.every((r) => r) && (
                <div className="mt-8 border-t border-gray-800 pt-6">
                  <div className="flex flex-wrap gap-3 justify-center mb-6">
                    {cards.map((card, i) => (
                      <div key={i} className="text-xs border border-gray-800 bg-gray-900/50 rounded px-3 py-2">
                        <div className="text-cyan-400">{card.url}</div>
                        <div className="text-gray-500">
                          ⚔ {card.baseAttack} / 🛡 {card.baseDef} / ⚡ {card.baseConnection}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <button
                      onClick={openPack}
                      className="bg-cyan-900/60 hover:bg-cyan-800/60 border border-cyan-700 text-cyan-300 font-bold px-6 py-2 rounded transition-all text-sm uppercase tracking-widest"
                    >
                      ◈ OPEN ANOTHER PACK
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-400 text-xs border border-red-900/50 bg-red-950/30 px-4 py-3 rounded">
            ✕ {error}
          </div>
        )}

        {/* ── Card detail modal ──────────────────────────────────────────── */}
        {selectedCard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCard(null)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div
              className="relative z-10 flex flex-col sm:flex-row gap-10 items-center sm:items-start bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl p-10 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 text-gray-600 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>

              {/* Card — click to visit site */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <a
                  href={`https://${selectedCard.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block"
                  title={`Visit ${selectedCard.url}`}
                >
                  <Card card={selectedCard} size="xl" />
                  <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center pointer-events-none">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-mono tracking-widest border border-white/40 bg-black/60 px-3 py-1.5 rounded-lg">
                      ↗ VISIT SITE
                    </span>
                  </div>
                </a>
                <span className="text-gray-600 text-[10px] font-mono">click card to visit site</span>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-4 text-xs font-mono min-w-0 flex-1">
                {/* Just acquired badge */}
                <div className="border border-cyan-900/50 bg-cyan-950/20 rounded-lg px-4 py-3">
                  <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-base">◈</span>
                    <span className="text-cyan-300 font-bold text-sm">Just Acquired</span>
                  </div>
                </div>

                {/* Website stats */}
                {selectedCard.rawMetadata && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedCard.rawMetadata.monthlyVisits !== undefined && (
                      <div className="border border-gray-800 bg-gray-900/60 rounded-lg px-3 py-2.5">
                        <div className="text-gray-500 uppercase tracking-widest text-[9px] mb-1">Monthly Visits</div>
                        <div className="text-white font-bold text-lg leading-none">
                          {formatVisits(selectedCard.rawMetadata.monthlyVisits)}
                        </div>
                        <div className="text-gray-600 text-[9px] mt-0.5">visits / mo</div>
                      </div>
                    )}
                    {selectedCard.rawMetadata.ageInYears !== undefined && (
                      <div className="border border-gray-800 bg-gray-900/60 rounded-lg px-3 py-2.5">
                        <div className="text-gray-500 uppercase tracking-widest text-[9px] mb-1">Domain Age</div>
                        <div className="text-white font-bold text-lg leading-none">
                          {selectedCard.rawMetadata.ageInYears}
                        </div>
                        <div className="text-gray-600 text-[9px] mt-0.5">years online</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rarity */}
                <div>
                  <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Rarity</div>
                  <div className={`font-bold text-sm ${RARITY_COLORS[selectedCard.rarity]}`}>
                    {RARITY_ICONS[selectedCard.rarity]} {selectedCard.rarity}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6">
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Attack</div>
                    <div className="text-red-400 font-bold text-2xl">⚔ {selectedCard.baseAttack}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Defense</div>
                    <div className="text-blue-400 font-bold text-2xl">🛡 {selectedCard.baseDef}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">CONN</div>
                    <div className="text-green-400 font-bold text-2xl">⚡{selectedCard.baseConnection}</div>
                  </div>
                </div>

                {/* Factions */}
                {selectedCard.factions.length > 0 && (
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-2">Factions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCard.factions.map((f) => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-400 bg-gray-900/60">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instance ID */}
                <div>
                  <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Instance ID</div>
                  <div className="text-gray-600 break-all text-[10px]">{selectedCard.instanceId}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-xs">
          <InfoBox icon="◇" title="Common Cards" desc="All booster pulls generate Common rarity cards with standard stats." color="cyan" />
          <InfoBox icon="⌬" title="Clone Upgrade" desc="Visit the Registrar to upgrade any Common card to a Clone." color="purple" />
          <InfoBox icon="◈" title="Genesis Path" desc="Be the first to register a domain to claim the Genesis 1-of-1." color="yellow" />
        </div>
      </main>
    </div>
  );
}

function InfoBox({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-900/40 text-cyan-400",
    purple: "border-purple-900/40 text-purple-400",
    yellow: "border-yellow-900/40 text-yellow-400",
  };
  return (
    <div className={`border ${colors[color]} bg-gray-900/30 rounded p-3`}>
      <div className={`text-lg mb-1 ${colors[color].split(" ")[1]}`}>{icon}</div>
      <div className="font-bold text-gray-300 mb-1">{title}</div>
      <div className="text-gray-600">{desc}</div>
    </div>
  );
}
