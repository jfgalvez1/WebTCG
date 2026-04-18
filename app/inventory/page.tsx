"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import { CardInstance } from "@/store/gameStore";

interface InventoryItem {
  instanceId: string;
  url: string;
  rarity: "GENESIS" | "CLONE" | "COMMON" | "DEAD_LINK";
  dateAcquired: string;
  card: {
    baseAttack: number;
    baseHealth: number;
    factions: string[];
  };
}

type ViewMode = "grid" | "list";
type FilterRarity = "ALL" | "GENESIS" | "CLONE" | "COMMON" | "DEAD_LINK";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ownerUsername, setOwnerUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterRarity>("ALL");
  const [search, setSearch] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
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

  function selectCard(item: InventoryItem) {
    const card = toCardInstance(item);
    if (selectedCard?.instanceId === item.instanceId) {
      setSelectedCard(null);
      setSelectedItem(null);
    } else {
      setSelectedCard(card);
      setSelectedItem(item);
    }
  }

  const RARITY_COLORS = {
    GENESIS: "text-yellow-400 border-yellow-900/50 bg-yellow-950/20",
    CLONE: "text-purple-400 border-purple-900/50 bg-purple-950/20",
    COMMON: "text-cyan-400 border-cyan-900/50 bg-cyan-950/20",
    DEAD_LINK: "text-red-400 border-red-900/50 bg-red-950/20",
  };

  const counts = {
    ALL: inventory.length,
    GENESIS: inventory.filter((c) => c.rarity === "GENESIS").length,
    CLONE: inventory.filter((c) => c.rarity === "CLONE").length,
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
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by domain..."
            className="bg-black/50 border border-gray-800 rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700 transition-colors placeholder-gray-700 w-48"
          />

          <div className="flex gap-2 flex-wrap">
            {(["ALL", "GENESIS", "CLONE", "COMMON", "DEAD_LINK"] as FilterRarity[]).map((r) => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`text-xs px-3 py-1.5 rounded border transition-all ${
                  filter === r
                    ? r === "ALL"
                      ? "border-gray-600 text-gray-200 bg-gray-800"
                      : `${RARITY_COLORS[r as keyof typeof RARITY_COLORS]}`
                    : "border-gray-800 text-gray-600 hover:text-gray-400"
                }`}
              >
                {r} ({counts[r]})
              </button>
            ))}
          </div>
        </div>

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
              <Card
                key={item.instanceId}
                card={toCardInstance(item)}
                size="md"
                selected={selectedCard?.instanceId === item.instanceId}
                onClick={() => selectCard(item)}
              />
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
                    className="hover:bg-gray-900/40 transition-colors cursor-pointer"
                    onClick={() => selectCard(item)}
                  >
                    <td className="px-4 py-2 text-cyan-400 font-mono">{item.url}</td>
                    <td className={`px-4 py-2 font-bold ${RARITY_COLORS[item.rarity]?.split(" ")[0] ?? "text-gray-400"}`}>
                      {item.rarity}
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

        {/* Side panel for selected card */}
        {selectedCard && selectedItem && (
          <div className="fixed inset-y-0 right-0 w-72 bg-gray-950/98 border-l border-gray-800 p-4 shadow-2xl z-40 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest text-gray-500">Card Details</span>
              <button
                onClick={() => { setSelectedCard(null); setSelectedItem(null); }}
                className="text-gray-600 hover:text-gray-300 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <Card card={selectedCard} size="md" />
            </div>
            <div className="space-y-3 text-xs">
              {/* Owner */}
              <div className="border border-cyan-900/40 bg-cyan-950/20 rounded-lg p-3">
                <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Owner</div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-lg">◈</span>
                  <span className="text-cyan-300 font-bold font-mono">{ownerUsername}</span>
                </div>
              </div>

              {/* Instance ID */}
              <div className="border-t border-gray-800 pt-3">
                <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Instance ID</div>
                <div className="text-gray-500 font-mono break-all text-[10px]">{selectedItem.instanceId}</div>
              </div>

              {/* Date acquired */}
              <div className="border-t border-gray-800 pt-3">
                <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Date Acquired</div>
                <div className="text-gray-400">
                  {new Date(selectedItem.dateAcquired).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </div>
              </div>

              {/* Connection Cost */}
              <div className="border-t border-gray-800 pt-3">
                <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Connection Cost</div>
                <div className="text-yellow-400 font-bold text-lg">
                  ⚡ {Math.max(1, Math.round((selectedCard.baseAttack + selectedCard.baseHealth) / 3))}
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-gray-800 pt-3 flex gap-4">
                <div>
                  <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Attack</div>
                  <div className="text-red-400 font-bold text-lg">⚔ {selectedCard.baseAttack}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Health</div>
                  <div className="text-green-400 font-bold text-lg">♥ {selectedCard.baseHealth}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
