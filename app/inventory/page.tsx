"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import { CardInstance } from "@/store/gameStore";

interface InventoryItem {
  instanceId: string;
  url: string;
  rarity: "GENESIS" | "COMMON" | "DEAD_LINK";
  dateAcquired: string;
  card: {
    baseAttack: number;
    baseHealth: number;
    factions: string[];
    rawMetadata: {
      monthlyVisits?: number;
      ageInYears?: number;
      source?: string;
    } | null;
  };
}

type ViewMode = "grid" | "list";
type FilterRarity = "ALL" | "GENESIS" | "COMMON" | "DEAD_LINK";

const RARITY_COLORS = {
  GENESIS: "text-yellow-400 border-yellow-900/50 bg-yellow-950/20",
  COMMON: "text-cyan-400 border-cyan-900/50 bg-cyan-950/20",
  DEAD_LINK: "text-red-400 border-red-900/50 bg-red-950/20",
};

const RARITY_ICONS = {
  GENESIS: "◈",
  COMMON: "◇",
  DEAD_LINK: "✕",
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ownerUsername, setOwnerUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterRarity>("ALL");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        setInventory(data.inventory ?? []);
        setOwnerUsername(data.user?.username ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = inventory.filter((item) => {
    if (filter !== "ALL" && item.rarity !== filter) return false;
    if (search && !item.url.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toCardInstance(item: InventoryItem): CardInstance {
    return {
      instanceId: item.instanceId,
      url: item.url,
      rarity: item.rarity,
      baseAttack: item.card.baseAttack,
      baseHealth: item.card.baseHealth,
      factions: item.card.factions,
      dateAcquired: item.dateAcquired,
    };
  }

  function formatVisits(n: number): string {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
  }

  function selectItem(item: InventoryItem) {
    setSelectedItem(selectedItem?.instanceId === item.instanceId ? null : item);
  }

  const counts = {
    ALL: inventory.length,
    GENESIS: inventory.filter((c) => c.rarity === "GENESIS").length,
    COMMON: inventory.filter((c) => c.rarity === "COMMON").length,
    DEAD_LINK: inventory.filter((c) => c.rarity === "DEAD_LINK").length,
  };

  return (
    <div className="min-h-screen matrix-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-purple-400 text-xl">⊞</span>
              <h1 className="text-xl font-bold tracking-widest uppercase">Card Inventory</h1>
            </div>
            <p className="text-gray-600 text-xs mt-1 ml-8">
              // {inventory.length} cards in your collection
            </p>
          </div>

          {/* View toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setView("grid")}
              className={`text-xs px-3 py-1.5 rounded border transition-all ${view === "grid" ? "border-cyan-700 text-cyan-300 bg-cyan-900/30" : "border-gray-800 text-gray-600 hover:text-gray-400"}`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={`text-xs px-3 py-1.5 rounded border transition-all ${view === "list" ? "border-cyan-700 text-cyan-300 bg-cyan-900/30" : "border-gray-800 text-gray-600 hover:text-gray-400"}`}
            >
              ☰ List
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by domain..."
              className="bg-black/50 border border-gray-800 rounded pl-8 pr-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700 transition-colors placeholder-gray-700 w-52"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {(["ALL", "GENESIS", "COMMON", "DEAD_LINK"] as FilterRarity[]).map((r) => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`text-xs px-3 py-1.5 rounded border transition-all ${
                  filter === r
                    ? r === "ALL"
                      ? "border-gray-600 text-gray-200 bg-gray-800"
                      : RARITY_COLORS[r as keyof typeof RARITY_COLORS]
                    : "border-gray-800 text-gray-600 hover:text-gray-400"
                }`}
              >
                {r} ({counts[r]})
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <div className="text-gray-600 text-xs mb-4 font-mono">
            // {filtered.length} card{filtered.length !== 1 ? "s" : ""} found
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-3xl mb-3 animate-spin inline-block">⟳</div>
            <div>Loading collection...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-lg">
            <div className="text-gray-700 text-4xl mb-3">⊞</div>
            <p className="text-gray-500">No cards found.</p>
            <p className="text-gray-700 text-xs mt-1">
              {inventory.length === 0 ? "Open a Booster Pack to get started." : "Try a different filter."}
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="flex flex-wrap gap-4">
            {filtered.map((item) => (
              <div key={item.instanceId} className="flex flex-col items-center gap-1.5">
                <Card
                  card={toCardInstance(item)}
                  size="md"
                  selected={selectedItem?.instanceId === item.instanceId}
                  onClick={() => selectItem(item)}
                />
                {/* Owner badge */}
                <div className="w-40 flex items-center gap-1.5 px-2 py-1 rounded bg-gray-900/80 border border-gray-800">
                  <span className="text-cyan-500 text-[10px] shrink-0">◈</span>
                  <span className="text-cyan-300 font-mono text-[10px] truncate">{ownerUsername}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 uppercase tracking-widest border-b border-gray-800 bg-gray-900/50">
                  <th className="px-4 py-3 text-left">Domain</th>
                  <th className="px-4 py-3 text-left">Rarity</th>
                  <th className="px-4 py-3 text-center">⚔</th>
                  <th className="px-4 py-3 text-center">♥</th>
                  <th className="px-4 py-3 text-left">Factions</th>
                  <th className="px-4 py-3 text-left">Acquired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {filtered.map((item) => (
                  <tr
                    key={item.instanceId}
                    className={`hover:bg-gray-900/40 transition-colors cursor-pointer ${
                      selectedItem?.instanceId === item.instanceId ? "bg-gray-900/60" : ""
                    }`}
                    onClick={() => selectItem(item)}
                  >
                    <td className="px-4 py-2 text-cyan-400 font-mono">{item.url}</td>
                    <td className={`px-4 py-2 font-bold`}>
                      <span className={`flex items-center gap-1 ${RARITY_COLORS[item.rarity]?.split(" ")[0] ?? "text-gray-400"}`}>
                        <span>{RARITY_ICONS[item.rarity]}</span>
                        <span>{item.rarity}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-red-400 font-bold">{item.card.baseAttack}</td>
                    <td className="px-4 py-2 text-center text-green-400 font-bold">{item.card.baseHealth}</td>
                    <td className="px-4 py-2 text-gray-500">{item.card.factions.join(", ")}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(item.dateAcquired).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Card modal */}
        {selectedItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal panel */}
            <div
              className="relative z-10 flex flex-col sm:flex-row gap-10 items-center sm:items-start bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl p-10 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 text-gray-600 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>

              {/* Big card — click to open the site */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <a
                  href={`https://${selectedItem.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block"
                  title={`Visit ${selectedItem.url}`}
                >
                  <Card card={toCardInstance(selectedItem)} size="xl" />
                  {/* Hover overlay */}
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
                {/* Owner */}
                <div className="border border-cyan-900/50 bg-cyan-950/20 rounded-lg px-4 py-3">
                  <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Owner</div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-base">◈</span>
                    <span className="text-cyan-300 font-bold text-sm">{ownerUsername}</span>
                  </div>
                </div>

                {/* Website stats */}
                {selectedItem.card.rawMetadata && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedItem.card.rawMetadata.monthlyVisits !== undefined && (
                      <div className="border border-gray-800 bg-gray-900/60 rounded-lg px-3 py-2.5">
                        <div className="text-gray-500 uppercase tracking-widest text-[9px] mb-1">Monthly Visits</div>
                        <div className="text-white font-bold text-lg leading-none">
                          {formatVisits(selectedItem.card.rawMetadata.monthlyVisits)}
                        </div>
                        <div className="text-gray-600 text-[9px] mt-0.5">visits / mo</div>
                      </div>
                    )}
                    {selectedItem.card.rawMetadata.ageInYears !== undefined && (
                      <div className="border border-gray-800 bg-gray-900/60 rounded-lg px-3 py-2.5">
                        <div className="text-gray-500 uppercase tracking-widest text-[9px] mb-1">Domain Age</div>
                        <div className="text-white font-bold text-lg leading-none">
                          {selectedItem.card.rawMetadata.ageInYears}
                        </div>
                        <div className="text-gray-600 text-[9px] mt-0.5">years online</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rarity */}
                <div>
                  <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Rarity</div>
                  <div className={`font-bold text-sm ${RARITY_COLORS[selectedItem.rarity]?.split(" ")[0]}`}>
                    {RARITY_ICONS[selectedItem.rarity]} {selectedItem.rarity}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-6">
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Attack</div>
                    <div className="text-red-400 font-bold text-2xl">⚔ {selectedItem.card.baseAttack}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Health</div>
                    <div className="text-green-400 font-bold text-2xl">♥ {selectedItem.card.baseHealth}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Cost</div>
                    <div className="text-yellow-400 font-bold text-2xl">
                      ⚡{Math.max(1, Math.round((selectedItem.card.baseAttack + selectedItem.card.baseHealth) / 3))}
                    </div>
                  </div>
                </div>

                {/* Factions */}
                {selectedItem.card.factions.length > 0 && (
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-2">Factions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.card.factions.map((f) => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-400 bg-gray-900/60">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date acquired */}
                <div>
                  <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Acquired</div>
                  <div className="text-gray-400">
                    {new Date(selectedItem.dateAcquired).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </div>
                </div>

                {/* Instance ID */}
                <div>
                  <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Instance ID</div>
                  <div className="text-gray-600 break-all text-[10px]">{selectedItem.instanceId}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
