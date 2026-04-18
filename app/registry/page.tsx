"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";

interface RegistryItem {
  instanceId: string;
  url: string;
  rarity: "GENESIS" | "CLONE" | "COMMON" | "DEAD_LINK";
  dateAcquired: string;
  owner: { username: string };
  card: {
    baseAttack: number;
    baseHealth: number;
    factions: string[];
    createdAt: string;
  };
}

type FilterRarity = "ALL" | "GENESIS" | "CLONE" | "COMMON" | "DEAD_LINK";
type ViewMode = "grid" | "list";

const RARITY_COLORS = {
  GENESIS: "text-yellow-400 border-yellow-900/50 bg-yellow-950/20",
  CLONE: "text-purple-400 border-purple-900/50 bg-purple-950/20",
  COMMON: "text-cyan-400 border-cyan-900/50 bg-cyan-950/20",
  DEAD_LINK: "text-red-400 border-red-900/50 bg-red-950/20",
};

const RARITY_ICONS = {
  GENESIS: "◈",
  CLONE: "⌬",
  COMMON: "◇",
  DEAD_LINK: "✕",
};

export default function RegistryPage() {
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [rarity, setRarity] = useState<FilterRarity>("ALL");
  const [selectedCard, setSelectedCard] = useState<RegistryItem | null>(null);

  const [domainSearch, setDomainSearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");

  // Debounce via refs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedDomain, setDebouncedDomain] = useState("");
  const [debouncedOwner, setDebouncedOwner] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedDomain(domainSearch);
      setDebouncedOwner(ownerSearch);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [domainSearch, ownerSearch]);

  const fetchRegistry = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedDomain) params.set("q", debouncedDomain);
    if (debouncedOwner) params.set("owner", debouncedOwner);
    if (rarity !== "ALL") params.set("rarity", rarity);

    fetch(`/api/registry?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [debouncedDomain, debouncedOwner, rarity]);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  const rarityCounts: Record<FilterRarity, number> = {
    ALL: total,
    GENESIS: items.filter((i) => i.rarity === "GENESIS").length,
    CLONE: items.filter((i) => i.rarity === "CLONE").length,
    COMMON: items.filter((i) => i.rarity === "COMMON").length,
    DEAD_LINK: items.filter((i) => i.rarity === "DEAD_LINK").length,
  };

  function toCardInstance(item: RegistryItem) {
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

  return (
    <div className="min-h-screen matrix-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-cyan-400 text-xl">◈</span>
            <h1 className="text-xl font-bold tracking-widest uppercase">Global Card Registry</h1>
          </div>
          <p className="text-gray-600 text-xs ml-8">
            // All minted cards across the network — search by domain or owner
          </p>
        </div>

        {/* Search + filters row */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Domain search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">🔍</span>
            <input
              type="text"
              value={domainSearch}
              onChange={(e) => setDomainSearch(e.target.value)}
              placeholder="Search domain..."
              className="bg-black/50 border border-gray-800 rounded pl-8 pr-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700 transition-colors placeholder-gray-700 w-52"
            />
          </div>

          {/* Owner search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">◈</span>
            <input
              type="text"
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              placeholder="Search owner..."
              className="bg-black/50 border border-gray-800 rounded pl-8 pr-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-700 transition-colors placeholder-gray-700 w-44"
            />
          </div>

          {/* Rarity filters */}
          <div className="flex gap-2 flex-wrap">
            {(["ALL", "GENESIS", "CLONE", "COMMON", "DEAD_LINK"] as FilterRarity[]).map((r) => (
              <button
                key={r}
                onClick={() => setRarity(r)}
                className={`text-xs px-3 py-1.5 rounded border transition-all ${
                  rarity === r
                    ? r === "ALL"
                      ? "border-gray-600 text-gray-200 bg-gray-800"
                      : RARITY_COLORS[r as keyof typeof RARITY_COLORS]
                    : "border-gray-800 text-gray-600 hover:text-gray-400"
                }`}
              >
                {r} ({rarityCounts[r]})
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-2">
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

        {/* Results count */}
        {!loading && (
          <div className="text-gray-600 text-xs mb-4 font-mono">
            // {items.length} card{items.length !== 1 ? "s" : ""} found
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-3xl mb-3 animate-spin inline-block">⟳</div>
            <div className="text-xs">Querying network registry...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-lg">
            <div className="text-gray-700 text-4xl mb-3">◈</div>
            <p className="text-gray-500 text-sm">No cards found in the registry.</p>
            <p className="text-gray-700 text-xs mt-1">
              Try different search terms or check back after players mint some cards.
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="flex flex-wrap gap-4">
            {items.map((item) => (
              <div key={item.instanceId} className="flex flex-col items-center gap-1.5">
                <Card
                  card={toCardInstance(item)}
                  size="md"
                  selected={selectedCard?.instanceId === item.instanceId}
                  onClick={() => setSelectedCard(
                    selectedCard?.instanceId === item.instanceId ? null : item
                  )}
                />
                {/* Owner badge — matches card width (w-40) */}
                <div className="w-40 flex items-center gap-1.5 px-2 py-1 rounded bg-gray-900/80 border border-gray-800">
                  <span className="text-cyan-500 text-[10px] shrink-0">◈</span>
                  <span className="text-cyan-300 font-mono text-[10px] truncate">{item.owner.username}</span>
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
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">Rarity</th>
                  <th className="px-4 py-3 text-center">⚔</th>
                  <th className="px-4 py-3 text-center">♥</th>
                  <th className="px-4 py-3 text-left">Factions</th>
                  <th className="px-4 py-3 text-left">Minted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {items.map((item) => (
                  <tr
                    key={item.instanceId}
                    className={`hover:bg-gray-900/40 transition-colors cursor-pointer ${
                      selectedCard?.instanceId === item.instanceId ? "bg-gray-900/60" : ""
                    }`}
                    onClick={() => setSelectedCard(
                      selectedCard?.instanceId === item.instanceId ? null : item
                    )}
                  >
                    <td className="px-4 py-2 text-cyan-400 font-mono">{item.url}</td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-1">
                        <span className="text-cyan-600 text-[10px]">◈</span>
                        <span className="text-cyan-300 font-mono">{item.owner.username}</span>
                      </span>
                    </td>
                    <td className={`px-4 py-2 font-bold ${RARITY_COLORS[item.rarity]?.split(" ")[0] ?? "text-gray-400"}`}>
                      <span className="flex items-center gap-1">
                        <span>{RARITY_ICONS[item.rarity]}</span>
                        <span>{item.rarity}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-red-400 font-bold">{item.card.baseAttack}</td>
                    <td className="px-4 py-2 text-center text-green-400 font-bold">{item.card.baseHealth}</td>
                    <td className="px-4 py-2 text-gray-500">{item.card.factions.join(", ")}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(item.dateAcquired).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail side panel */}
        {selectedCard && (
          <div className="fixed inset-y-0 right-0 w-72 bg-gray-950/98 border-l border-gray-800 p-4 shadow-2xl z-40 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest text-gray-500">Card Details</span>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-gray-600 hover:text-gray-300 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <Card card={toCardInstance(selectedCard)} size="md" />
            </div>

            <div className="space-y-3 text-xs">
              {/* Owner highlight */}
              <div className="border border-cyan-900/40 bg-cyan-950/20 rounded-lg p-3">
                <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Owner</div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-base">◈</span>
                  <span className="text-cyan-300 font-bold font-mono text-sm">{selectedCard.owner.username}</span>
                </div>
              </div>

              {/* Rarity */}
              <div className="border-t border-gray-800 pt-3">
                <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Rarity</div>
                <div className={`font-bold ${RARITY_COLORS[selectedCard.rarity]?.split(" ")[0]}`}>
                  {RARITY_ICONS[selectedCard.rarity]} {selectedCard.rarity}
                </div>
              </div>

              {/* Instance ID */}
              <div className="border-t border-gray-800 pt-3">
                <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Instance ID</div>
                <div className="text-gray-500 font-mono break-all text-[10px]">{selectedCard.instanceId}</div>
              </div>

              {/* Date minted */}
              <div className="border-t border-gray-800 pt-3">
                <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Date Minted</div>
                <div className="text-gray-400">
                  {new Date(selectedCard.dateAcquired).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </div>
              </div>

              {/* Connection Cost */}
              <div className="border-t border-gray-800 pt-3">
                <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Connection Cost</div>
                <div className="text-yellow-400 font-bold text-lg">
                  ⚡ {Math.max(1, Math.round((selectedCard.card.baseAttack + selectedCard.card.baseHealth) / 3))}
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-gray-800 pt-3 flex gap-6">
                <div>
                  <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Attack</div>
                  <div className="text-red-400 font-bold text-lg">⚔ {selectedCard.card.baseAttack}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1 uppercase tracking-widest text-[10px]">Health</div>
                  <div className="text-green-400 font-bold text-lg">♥ {selectedCard.card.baseHealth}</div>
                </div>
              </div>

              {/* Factions */}
              {selectedCard.card.factions.length > 0 && (
                <div className="border-t border-gray-800 pt-3">
                  <div className="text-gray-600 mb-2 uppercase tracking-widest text-[10px]">Factions</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedCard.card.factions.map((f) => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-400 bg-gray-900/50">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
