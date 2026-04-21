"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import { CardInstance } from "@/store/gameStore";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CardData {
  baseAttack: number;
  baseDef: number;
  baseConnection: number;
  factions: string[];
  rawMetadata: {
    monthlyVisits?: number;
    ageInYears?: number;
  } | null;
}

interface ListingItem {
  id: string;
  price: number;
  createdAt: string;
  sellerId: string;
  seller: { id: string; username: string };
  inventory: {
    instanceId: string;
    url: string;
    rarity: "GENESIS" | "COMMON" | "DEAD_LINK";
    dateAcquired: string;
    card: CardData;
  };
}

interface OwnInventoryItem {
  instanceId: string;
  url: string;
  rarity: "GENESIS" | "COMMON" | "DEAD_LINK";
  dateAcquired: string;
  card: CardData;
  listing: { id: string; price: number } | null;
}

type Tab = "browse" | "sell";
type SortKey = "newest" | "price_asc" | "price_desc";

// ─── Constants ──────────────────────────────────────────────────────────────

const RARITY_COLORS = {
  GENESIS: "text-yellow-400 border-yellow-700/50 bg-yellow-950/20",
  COMMON: "text-cyan-400 border-cyan-700/50 bg-cyan-950/20",
  DEAD_LINK: "text-red-400 border-red-700/50 bg-red-950/20",
};

const RARITY_ICONS = {
  GENESIS: "◈",
  COMMON: "◇",
  DEAD_LINK: "✕",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toCardInstance(item: { instanceId: string; url: string; rarity: "GENESIS" | "COMMON" | "DEAD_LINK"; dateAcquired: string; card: CardData }): CardInstance {
  return {
    instanceId: item.instanceId,
    url: item.url,
    rarity: item.rarity,
    baseAttack: item.card.baseAttack,
    baseDef: item.card.baseDef,
    baseConnection: item.card.baseConnection,
    factions: item.card.factions,
    dateAcquired: item.dateAcquired,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("browse");

  // Browse state
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buySuccess, setBuySuccess] = useState("");

  // Sell state
  const [ownInventory, setOwnInventory] = useState<OwnInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const [selectedForSale, setSelectedForSale] = useState<OwnInventoryItem | null>(null);
  const [listPrice, setListPrice] = useState("");
  const [listing, setListing] = useState(false);
  const [listError, setListError] = useState("");
  const [listSuccess, setListSuccess] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  // My user id (to detect own listings)
  const [myId, setMyId] = useState<string | null>(null);

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const fetchListings = useCallback(async () => {
    setListingsLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (rarityFilter) params.set("rarity", rarityFilter);
    params.set("sort", sort);
    const res = await fetch(`/api/marketplace?${params}`);
    const data = await res.json();
    setListings(data.listings ?? []);
    setListingsLoading(false);
  }, [search, rarityFilter, sort]);

  const fetchOwnInventory = useCallback(async () => {
    setInventoryLoading(true);
    const res = await fetch("/api/inventory");
    const data = await res.json();
    setMyId(data.user?.id ?? null);
    setCoins(data.user?.standardCoins ?? null);

    // Merge inventory with listing info
    const invItems: OwnInventoryItem[] = (data.inventory ?? []).map(
      (item: OwnInventoryItem) => item
    );
    setOwnInventory(invItems);
    setInventoryLoading(false);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (tab === "sell") fetchOwnInventory();
  }, [tab, fetchOwnInventory]);

  // ─── Buy action ───────────────────────────────────────────────────────────

  async function handleBuy() {
    if (!selectedListing) return;
    setBuying(true);
    setBuyError("");
    setBuySuccess("");
    const res = await fetch("/api/marketplace/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: selectedListing.id }),
    });
    const data = await res.json();
    setBuying(false);
    if (!res.ok) {
      setBuyError(data.error ?? "Purchase failed");
    } else {
      setBuySuccess(`You now own ${selectedListing.inventory.url}!`);
      setSelectedListing(null);
      fetchListings();
    }
  }

  // ─── List for sale action ─────────────────────────────────────────────────

  async function handleList() {
    if (!selectedForSale) return;
    const price = parseInt(listPrice, 10);
    if (!price || price < 1) {
      setListError("Enter a price of at least 1 coin.");
      return;
    }
    setListing(true);
    setListError("");
    setListSuccess("");
    const res = await fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId: selectedForSale.instanceId, price }),
    });
    const data = await res.json();
    setListing(false);
    if (!res.ok) {
      setListError(data.error ?? "Failed to list card");
    } else {
      setListSuccess(`${selectedForSale.url} listed for ${price} coins!`);
      setSelectedForSale(null);
      setListPrice("");
      fetchOwnInventory();
    }
  }

  // ─── Cancel listing action ────────────────────────────────────────────────

  async function handleCancel(listingId: string) {
    setCancelling(listingId);
    const res = await fetch(`/api/marketplace/${listingId}`, { method: "DELETE" });
    setCancelling(null);
    if (res.ok) {
      fetchOwnInventory();
      fetchListings();
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen matrix-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-emerald-400 text-xl">⟳</span>
          <h1 className="text-xl font-bold tracking-widest uppercase">Marketplace</h1>
        </div>
        <p className="text-gray-600 text-xs mb-6 ml-8 font-mono">
          // trade domain cards with other players
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-800">
          {(["browse", "sell"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setBuyError(""); setBuySuccess(""); setListError(""); setListSuccess(""); }}
              className={`px-5 py-2 text-xs font-mono uppercase tracking-widest border-b-2 transition-all ${
                tab === t
                  ? "border-emerald-500 text-emerald-300"
                  : "border-transparent text-gray-600 hover:text-gray-400"
              }`}
            >
              {t === "browse" ? "⊞ Browse" : "⊕ Sell"}
            </button>
          ))}
        </div>

        {/* ── BROWSE TAB ── */}
        {tab === "browse" && (
          <>
            {/* Success / Error banners */}
            {buySuccess && (
              <div className="mb-4 px-4 py-3 rounded border border-emerald-700 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <span>✓</span> {buySuccess}
                <button onClick={() => setBuySuccess("")} className="ml-auto text-emerald-600 hover:text-emerald-400">✕</button>
              </div>
            )}
            {buyError && (
              <div className="mb-4 px-4 py-3 rounded border border-red-800 bg-red-950/40 text-red-400 text-xs font-mono flex items-center gap-2">
                <span>✕</span> {buyError}
                <button onClick={() => setBuyError("")} className="ml-auto">✕</button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search domain..."
                  className="bg-black/50 border border-gray-800 rounded pl-8 pr-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-700 transition-colors placeholder-gray-700 w-52"
                />
              </div>

              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="bg-black/50 border border-gray-800 rounded px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-emerald-700"
              >
                <option value="">All Rarities</option>
                <option value="GENESIS">GENESIS</option>
                <option value="COMMON">COMMON</option>
                <option value="DEAD_LINK">DEAD_LINK</option>
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-black/50 border border-gray-800 rounded px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-emerald-700"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>

            {/* Count */}
            {!listingsLoading && (
              <div className="text-gray-600 text-xs mb-4 font-mono">
                // {listings.length} listing{listings.length !== 1 ? "s" : ""} available
              </div>
            )}

            {/* Grid */}
            {listingsLoading ? (
              <div className="text-center py-20 text-gray-600">
                <div className="text-3xl mb-3 animate-spin inline-block">⟳</div>
                <div>Loading marketplace...</div>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-gray-800 rounded-lg">
                <div className="text-gray-700 text-4xl mb-3">⟳</div>
                <p className="text-gray-500">No listings found.</p>
                <p className="text-gray-700 text-xs mt-1">Be the first to list a card!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    isMine={l.sellerId === myId}
                    onSelect={() => { setSelectedListing(l); setBuyError(""); setBuySuccess(""); }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SELL TAB ── */}
        {tab === "sell" && (
          <>
            {listSuccess && (
              <div className="mb-4 px-4 py-3 rounded border border-emerald-700 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <span>✓</span> {listSuccess}
                <button onClick={() => setListSuccess("")} className="ml-auto text-emerald-600 hover:text-emerald-400">✕</button>
              </div>
            )}
            {listError && (
              <div className="mb-4 px-4 py-3 rounded border border-red-800 bg-red-950/40 text-red-400 text-xs font-mono flex items-center gap-2">
                <span>✕</span> {listError}
                <button onClick={() => setListError("")} className="ml-auto">✕</button>
              </div>
            )}

            {coins !== null && (
              <div className="mb-5 text-xs font-mono text-gray-500">
                Your balance: <span className="text-yellow-400 font-bold">{coins} ◎</span> standard coins
              </div>
            )}

            {inventoryLoading ? (
              <div className="text-center py-20 text-gray-600">
                <div className="text-3xl mb-3 animate-spin inline-block">⟳</div>
                <div>Loading inventory...</div>
              </div>
            ) : ownInventory.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-gray-800 rounded-lg">
                <div className="text-gray-700 text-4xl mb-3">⊞</div>
                <p className="text-gray-500">No cards in your inventory.</p>
                <p className="text-gray-700 text-xs mt-1">Open a Booster Pack to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {ownInventory.map((item) => (
                  <OwnCard
                    key={item.instanceId}
                    item={item}
                    selected={selectedForSale?.instanceId === item.instanceId}
                    cancelling={cancelling === item.listing?.id}
                    onSelect={() => {
                      if (!item.listing) {
                        setSelectedForSale(
                          selectedForSale?.instanceId === item.instanceId ? null : item
                        );
                        setListError("");
                        setListSuccess("");
                      }
                    }}
                    onCancel={() => item.listing && handleCancel(item.listing.id)}
                  />
                ))}
              </div>
            )}

            {/* Listing panel */}
            {selectedForSale && !selectedForSale.listing && (
              <div className="fixed bottom-0 left-0 right-0 border-t border-emerald-900/50 bg-gray-950/95 backdrop-blur p-4 z-40">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-400 mb-0.5">Listing:</div>
                    <div className="text-emerald-300 font-mono font-bold truncate">{selectedForSale.url}</div>
                    <div className={`text-[10px] mt-0.5 ${RARITY_COLORS[selectedForSale.rarity].split(" ")[0]}`}>
                      {RARITY_ICONS[selectedForSale.rarity]} {selectedForSale.rarity}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600 text-xs">◎</span>
                      <input
                        type="number"
                        min={1}
                        value={listPrice}
                        onChange={(e) => setListPrice(e.target.value)}
                        placeholder="Price in coins"
                        className="bg-black/60 border border-gray-700 focus:border-emerald-700 rounded pl-8 pr-4 py-2 text-sm text-white focus:outline-none w-44 transition-colors"
                      />
                    </div>

                    <button
                      onClick={handleList}
                      disabled={listing}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-mono rounded transition-colors"
                    >
                      {listing ? "Listing..." : "List for Sale"}
                    </button>

                    <button
                      onClick={() => setSelectedForSale(null)}
                      className="text-gray-600 hover:text-white transition-colors text-lg"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Buy Modal ── */}
      {selectedListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { setSelectedListing(null); setBuyError(""); }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative z-10 flex flex-col sm:flex-row gap-8 items-center sm:items-start bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setSelectedListing(null); setBuyError(""); }}
              className="absolute top-4 right-4 text-gray-600 hover:text-white text-xl transition-colors"
            >
              ✕
            </button>

            {/* Card preview */}
            <div className="shrink-0">
              <Card card={toCardInstance(selectedListing.inventory)} size="xl" />
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col gap-4 font-mono text-xs min-w-0">
              <div>
                <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Domain</div>
                <div className="text-cyan-300 font-bold text-sm break-all">{selectedListing.inventory.url}</div>
              </div>

              <div className="flex gap-4">
                <div>
                  <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Rarity</div>
                  <div className={`font-bold ${RARITY_COLORS[selectedListing.inventory.rarity].split(" ")[0]}`}>
                    {RARITY_ICONS[selectedListing.inventory.rarity]} {selectedListing.inventory.rarity}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Seller</div>
                  <div className="text-gray-300">{selectedListing.seller.username}</div>
                </div>
              </div>

              <div className="flex gap-6">
                <div>
                  <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Attack</div>
                  <div className="text-red-400 font-bold text-xl">⚔ {selectedListing.inventory.card.baseAttack}</div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Def</div>
                  <div className="text-blue-400 font-bold text-xl">🛡 {selectedListing.inventory.card.baseDef}</div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Connection</div>
                  <div className="text-green-400 font-bold text-xl">⚡{selectedListing.inventory.card.baseConnection}%</div>
                </div>
              </div>

              {selectedListing.inventory.card.factions.length > 0 && (
                <div>
                  <div className="text-gray-500 uppercase tracking-widest text-[10px] mb-1">Factions</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedListing.inventory.card.factions.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded border border-gray-700 text-gray-400 bg-gray-900/60">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Price + buy */}
              <div className="mt-2 border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 uppercase tracking-widest text-[10px]">Price</span>
                  <span className="text-yellow-400 font-bold text-2xl">◎ {selectedListing.price.toLocaleString()}</span>
                </div>

                {buyError && (
                  <div className="mb-3 px-3 py-2 rounded border border-red-800 bg-red-950/40 text-red-400 text-[10px]">
                    {buyError}
                  </div>
                )}

                {selectedListing.sellerId === myId ? (
                  <div className="text-yellow-600 text-[10px] text-center py-2">
                    This is your own listing.
                  </div>
                ) : (
                  <button
                    onClick={handleBuy}
                    disabled={buying}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-mono font-bold text-sm rounded-lg transition-colors"
                  >
                    {buying ? "Purchasing..." : `Buy for ${selectedListing.price} coins`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ListingCard({
  listing,
  isMine,
  onSelect,
}: {
  listing: ListingItem;
  isMine: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="group relative bg-gray-900/60 border border-gray-800 hover:border-emerald-700/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-900/80 flex flex-col gap-3"
    >
      {isMine && (
        <div className="absolute top-2 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-400 border border-cyan-800/50">
          YOUR LISTING
        </div>
      )}

      {/* Card */}
      <div className="flex justify-center">
        <Card card={toCardInstance(listing.inventory)} size="sm" />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1">
        <div className="text-cyan-300 font-mono text-xs truncate">{listing.inventory.url}</div>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold ${RARITY_COLORS[listing.inventory.rarity].split(" ")[0]}`}>
            {RARITY_ICONS[listing.inventory.rarity]} {listing.inventory.rarity}
          </span>
          <span className="text-gray-600 text-[10px]">by {listing.seller.username}</span>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between border-t border-gray-800 pt-2">
        <span className="text-yellow-400 font-bold text-base">◎ {listing.price.toLocaleString()}</span>
        <span className="text-[10px] font-mono text-emerald-500 group-hover:text-emerald-400 transition-colors">
          BUY →
        </span>
      </div>
    </div>
  );
}

function OwnCard({
  item,
  selected,
  cancelling,
  onSelect,
  onCancel,
}: {
  item: OwnInventoryItem;
  selected: boolean;
  cancelling: boolean;
  onSelect: () => void;
  onCancel: () => void;
}) {
  const isListed = !!item.listing;

  return (
    <div
      onClick={!isListed ? onSelect : undefined}
      className={`relative bg-gray-900/60 border rounded-xl p-4 flex flex-col gap-3 transition-all ${
        isListed
          ? "border-yellow-800/50 opacity-80 cursor-default"
          : selected
          ? "border-emerald-600 bg-emerald-950/20 cursor-pointer"
          : "border-gray-800 hover:border-gray-700 cursor-pointer hover:bg-gray-900/80"
      }`}
    >
      {isListed && (
        <div className="absolute top-2 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-900/60 text-yellow-400 border border-yellow-800/50">
          LISTED
        </div>
      )}

      <div className="flex justify-center">
        <Card card={toCardInstance(item)} size="sm" />
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-cyan-300 font-mono text-xs truncate">{item.url}</div>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold ${RARITY_COLORS[item.rarity].split(" ")[0]}`}>
            {RARITY_ICONS[item.rarity]} {item.rarity}
          </span>
          {isListed && (
            <span className="text-yellow-400 text-[10px] font-bold">◎ {item.listing!.price}</span>
          )}
        </div>
      </div>

      {isListed ? (
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          disabled={cancelling}
          className="w-full py-1.5 border border-red-800/50 text-red-500 hover:text-red-400 hover:border-red-700 text-[10px] font-mono rounded transition-colors disabled:opacity-50"
        >
          {cancelling ? "Cancelling..." : "✕ Cancel Listing"}
        </button>
      ) : (
        <div className={`text-center py-1 text-[10px] font-mono rounded border transition-colors ${
          selected
            ? "border-emerald-600 text-emerald-400 bg-emerald-950/30"
            : "border-gray-800 text-gray-600"
        }`}>
          {selected ? "✓ Selected — set price below" : "Click to select"}
        </div>
      )}
    </div>
  );
}
