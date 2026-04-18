"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface UserData {
  username: string;
  standardCoins: number;
  premiumCoins: number;
}

interface InventoryItem {
  instanceId: string;
  url: string;
  rarity: string;
  dateAcquired: string;
  card: {
    baseAttack: number;
    baseHealth: number;
    factions: string[];
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentCards, setRecentCards] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        setUserData(data.user);
        setRecentCards(data.inventory?.slice(0, 6) ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const RARITY_COLORS = {
    GENESIS: "text-yellow-400",
    COMMON: "text-cyan-400",
    DEAD_LINK: "text-red-400",
  };

  return (
    <div className="min-h-screen matrix-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-widest uppercase text-gray-100">
              Welcome, <span className="text-cyan-400">{userData?.username ?? session?.user?.name ?? "SysAdmin"}</span>
            </h1>
          </div>
          <p className="text-gray-600 text-xs mt-1 ml-6">// System Status: ONLINE</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Standard Coins"
            value={loading ? "..." : (userData?.standardCoins ?? 0).toLocaleString()}
            icon="◈"
            color="text-cyan-400"
            sub="Used for Booster Packs"
          />
          <StatCard
            label="Premium Coins"
            value={loading ? "..." : (userData?.premiumCoins ?? 0).toLocaleString()}
            icon="⊕"
            color="text-yellow-400"
            sub="Used for Domain Minting"
          />
          <StatCard
            label="Cards Owned"
            value={loading ? "..." : recentCards.length.toString()}
            icon="⊞"
            color="text-purple-400"
            sub="Total inventory"
          />
          <StatCard
            label="Genesis Cards"
            value={loading ? "..." : recentCards.filter((c) => c.rarity === "GENESIS").length.toString()}
            icon="★"
            color="text-yellow-300"
            sub="1-of-1 cards"
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <ActionCard
            href="/booster"
            title="Open Booster Pack"
            desc="5 random domain cards for 100 Standard Coins"
            icon="◈"
            color="cyan"
            cost="100 ◈"
          />
          <ActionCard
            href="/registrar"
            title="Domain Registrar"
            desc="Mint specific URLs as Genesis 1-of-1 cards"
            icon="⊕"
            color="yellow"
            cost="Variable ⊕"
          />
          <ActionCard
            href="/battlefield"
            title="Enter Battlefield"
            desc="Deploy your cards against the AI SysAdmin"
            icon="⚔"
            color="red"
            cost="Free"
          />
        </div>

        {/* Recent cards */}
        <div className="border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold">
              ⊞ Recent Acquisitions
            </h2>
            <Link href="/inventory" className="text-xs text-cyan-500 hover:text-cyan-400">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="text-gray-600 text-xs text-center py-8">Loading inventory...</div>
          ) : recentCards.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-700 text-4xl mb-3">⊞</div>
              <p className="text-gray-500 text-sm">No cards yet.</p>
              <p className="text-gray-600 text-xs mt-1">Open a Booster Pack to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-600 uppercase tracking-widest border-b border-gray-800">
                    <th className="pb-2 text-left">URL</th>
                    <th className="pb-2 text-left">Rarity</th>
                    <th className="pb-2 text-center">⚔ ATK</th>
                    <th className="pb-2 text-center">♥ HP</th>
                    <th className="pb-2 text-left">Factions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {recentCards.map((item) => (
                    <tr key={item.instanceId} className="hover:bg-gray-900/30 transition-colors">
                      <td className="py-2 text-cyan-400 font-mono">{item.url}</td>
                      <td className={`py-2 font-bold ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || "text-gray-400"}`}>
                        {item.rarity}
                      </td>
                      <td className="py-2 text-center text-red-400 font-bold">{item.card.baseAttack}</td>
                      <td className="py-2 text-center text-green-400 font-bold">{item.card.baseHealth}</td>
                      <td className="py-2 text-gray-500">{item.card.factions.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: string; color: string; sub: string;
}) {
  return (
    <div className="border border-gray-800 bg-gray-900/40 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-xs uppercase tracking-widest">{label}</span>
        <span className={`${color} text-lg`}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-gray-700 text-xs mt-1">{sub}</div>
    </div>
  );
}

function ActionCard({ href, title, desc, icon, color, cost }: {
  href: string; title: string; desc: string; icon: string; color: string; cost: string;
}) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-900/50 hover:border-cyan-700 hover:bg-cyan-950/20",
    yellow: "border-yellow-900/50 hover:border-yellow-700 hover:bg-yellow-950/20",
    red: "border-red-900/50 hover:border-red-700 hover:bg-red-950/20",
  };
  const iconColors: Record<string, string> = {
    cyan: "text-cyan-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <Link
      href={href}
      className={`block border bg-gray-900/40 rounded-lg p-4 transition-all group ${colors[color]}`}
    >
      <div className={`text-2xl mb-2 ${iconColors[color]}`}>{icon}</div>
      <div className="font-bold text-sm text-gray-200 mb-1 group-hover:text-white">{title}</div>
      <div className="text-gray-600 text-xs mb-3">{desc}</div>
      <div className={`text-xs font-bold ${iconColors[color]}`}>Cost: {cost}</div>
    </Link>
  );
}
