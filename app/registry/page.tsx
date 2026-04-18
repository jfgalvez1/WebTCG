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
    rawMetadata: {
      monthlyVisits?: number;
      ageInYears?: number;
      source?: string;
    } | null;
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

  function formatVisits(n: number): string {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
  }

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

        {/* Card modal */}
        {selectedCard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCard(null)}
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
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 text-gray-600 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>

              {/* Big card — click to open the site */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <a
                  href={`https://${selectedCard.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block"
                  title={`Visit ${selectedCard.url}`}
                >
                  <Card card={toCardInstance(selectedCard)} size="xl" />
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
                    <span className="text-cyan-300 font-bold text-sm">{selectedCard.owner.username}</span>
                  </div>
                </div>

                {/* Website stats */}
                {selectedCard.card.rawMetadata && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedCard.card.rawMetadata.monthlyVisits !== undefined && (
                      <div className="border border-gray-800 bg-gray-900/60 rounded-lg px-3 py-2.5">
                        <div className="text-gray-500 uppercase tracking-widest text-[9px] mb-1">Monthly Visits</div>
                        <div className="text-white font-bold text-lg leading-none">
                          {formatVisits(selectedCard.card.rawMetadata.monthlyVisits)}
                        </div>
                        <div className="text-gray-600 text-[9px] mt-0.5">visits / mo</div>
                      </div>
                    )}
                    {selectedCard.card.rawMetadata.ageInYears !== undefined && (
                      <div className="border border-gray-800 bg-gray-900/60 rounded-lg px-3 py-2.5">
                        <div className="text-gray-500 uppercase tracking-widest text-[9px] mb-1">Domain Age</div>
                        <div className="text-white font-bold text-lg leading-none">
                          {selectedCard.card.rawMetadata.ageInYears}
                        </div>
                        <div className="text-gray-600 text-[9px] mt-0.5">years online</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rarity */}
                <div>
                  <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Rarity</div>
                  <div className={`font-bold text-sm ${RARITY_COLORS[selectedCard.rarity]?.split(" ")[0]}`}>
                    {RARITY_ICONS[selectedCard.rarity]} {selectedCard.rarity}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-6">
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Attack</div>
                    <div className="text-red-400 font-bold text-2xl">⚔ {selectedCard.card.baseAttack}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Health</div>
                    <div className="text-green-400 font-bold text-2xl">♥ {selectedCard.card.baseHealth}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Cost</div>
                    <div className="text-yellow-400 font-bold text-2xl">
                      ⚡{Math.max(1, Math.round((selectedCard.card.baseAttack + selectedCard.card.baseHealth) / 3))}
                    </div>
                  </div>
                </div>

                {/* Factions */}
                {selectedCard.card.factions.length > 0 && (
                  <div>
                    <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-2">Factions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCard.card.factions.map((f) => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-400 bg-gray-900/60">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date minted */}
                <div>
                  <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Minted</div>
                  <div className="text-gray-400">
                    {new Date(selectedCard.dateAcquired).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </div>
                </div>

                {/* Instance ID */}
                <div>
                  <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">Instance ID</div>
                  <div className="text-gray-600 break-all text-[10px]">{selectedCard.instanceId}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
