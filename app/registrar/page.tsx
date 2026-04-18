"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import { CardInstance } from "@/store/gameStore";

interface ForgedCard {
  url: string;
  baseAttack: number;
  baseHealth: number;
  factions: string[];
  genesisMinted: boolean;
  mintCost: number;
}

export default function RegistrarPage() {
  const [urlInput, setUrlInput] = useState("");
  const [forged, setForged] = useState<ForgedCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleForge(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setForged(null);
    setLoading(true);

    const res = await fetch("/api/forge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlInput }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Forge failed.");
    } else {
      setForged(data);
    }
  }

  async function handleMint() {
    if (!forged) return;
    setError("");
    setSuccess("");
    setMinting(true);

    const res = await fetch("/api/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: forged.url }),
    });

    const data = await res.json();
    setMinting(false);

    if (!res.ok) {
      setError(data.error || "Mint failed.");
    } else {
      setSuccess(
        `✓ Successfully minted GENESIS 1-of-1 card for "${forged.url}"! Cost: ${data.cost} Premium Coins.`
      );
      setForged((prev) => prev ? { ...prev, genesisMinted: true } : null);
    }
  }

  const previewCard: CardInstance | null = forged
    ? {
        instanceId: "preview",
        url: forged.url,
        rarity: "GENESIS",
        baseAttack: forged.baseAttack,
        baseHealth: forged.baseHealth,
        factions: forged.factions,
        dateAcquired: new Date().toISOString(),
      }
    : null;

  return (
    <div className="min-h-screen matrix-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 text-xl">⊕</span>
            <h1 className="text-xl font-bold tracking-widest uppercase">Domain Registrar</h1>
          </div>
          <p className="text-gray-600 text-xs mt-1 ml-8">
            // Every card is 1-of-1. Once claimed, no other player can ever own it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input panel */}
          <div className="space-y-6">
            {/* Forge form */}
            <div className="border border-yellow-900/40 bg-gray-900/50 rounded-lg p-5">
              <h2 className="text-xs uppercase tracking-widest text-yellow-400 font-bold mb-4">
                Step 1 — Appraise Domain
              </h2>
              <form onSubmit={handleForge} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                    Domain URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="e.g. google.com or https://github.com"
                      className="flex-1 bg-black/50 border border-yellow-900/30 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-yellow-500 transition-colors placeholder-gray-700"
                    />
                    <button
                      type="submit"
                      disabled={loading || !urlInput}
                      className="bg-yellow-900/60 hover:bg-yellow-800/60 border border-yellow-700 text-yellow-300 font-bold px-4 py-2 rounded transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      {loading ? "..." : "APPRAISE"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Appraisal result */}
            {forged && (
              <div className="border border-gray-700/50 bg-gray-900/50 rounded-lg p-5 space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                  Step 2 — Appraisal Report
                </h2>

                <div className="space-y-2 text-xs">
                  <Row label="Domain" value={forged.url} color="text-cyan-400" />
                  <Row label="Base Attack" value={`${forged.baseAttack} ⚔`} color="text-red-400" />
                  <Row label="Base Health" value={`${forged.baseHealth} ♥`} color="text-green-400" />
                  <Row label="Factions" value={forged.factions.join(", ")} color="text-purple-400" />
                  <Row
                    label="Ownership"
                    value={forged.genesisMinted ? "⊗ Already Claimed" : "✓ Unclaimed"}
                    color={forged.genesisMinted ? "text-red-400" : "text-green-400"}
                  />
                </div>

                <div className="border-t border-gray-800 pt-4">
                  {!forged.genesisMinted ? (
                    <div className="border border-yellow-900/50 bg-yellow-950/20 rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-yellow-400 font-bold text-xs">◈ GENESIS 1-OF-1</span>
                        <span className="text-yellow-300 font-bold text-sm">{forged.mintCost.toLocaleString()} ⊕</span>
                      </div>
                      <p className="text-gray-500 text-xs mb-3">
                        The only copy that will ever exist. No clones. No duplicates.
                      </p>
                      <button
                        onClick={() => handleMint()}
                        disabled={minting}
                        className="w-full bg-yellow-900/60 hover:bg-yellow-800/60 border border-yellow-600 text-yellow-300 font-bold py-2 rounded text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {minting ? "MINTING..." : `▶ MINT GENESIS — ${forged.mintCost.toLocaleString()} ⊕`}
                      </button>
                    </div>
                  ) : (
                    <div className="border border-red-900/50 bg-red-950/20 rounded p-3 text-center">
                      <div className="text-red-400 font-bold text-xs mb-1">⊗ ALREADY CLAIMED</div>
                      <p className="text-gray-600 text-xs">
                        This card is owned by another player. Every card is 1-of-1 — no duplicates exist.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-xs border border-red-900/50 bg-red-950/30 px-4 py-3 rounded">
                ✕ {error}
              </div>
            )}
            {success && (
              <div className="text-green-400 text-xs border border-green-900/50 bg-green-950/30 px-4 py-3 rounded">
                {success}
              </div>
            )}
          </div>

          {/* Card preview */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-gray-600 uppercase tracking-widest mb-4">Card Preview</div>
            {previewCard ? (
              <Card card={previewCard} size="lg" />
            ) : (
              <div className="w-48 h-64 border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-700">
                  <div className="text-3xl mb-2">⊕</div>
                  <div className="text-xs">Enter a domain to preview</div>
                </div>
              </div>
            )}

            {/* Popular domains hint */}
            <div className="mt-6 text-xs text-gray-700 text-center">
              <p className="mb-2">Try these high-tier domains:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["google.com", "github.com", "reddit.com", "twitch.tv"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setUrlInput(d)}
                    className="border border-gray-800 hover:border-gray-600 text-gray-500 hover:text-gray-300 px-2 py-1 rounded transition-all"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
