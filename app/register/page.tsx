"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed.");
      setLoading(false);
      return;
    }

    // Auto-login after registration
    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center matrix-bg p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-cyan-400 text-2xl font-bold">⟨/⟩ WEB TCG</div>
          <p className="text-gray-500 text-xs mt-1 tracking-widest uppercase">Register New SysAdmin</p>
        </div>

        <div className="border border-cyan-900/60 bg-gray-900/80 rounded-lg p-6 backdrop-blur shadow-xl shadow-cyan-950/40">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h1 className="text-sm font-bold tracking-widest uppercase text-green-300">
              Create Account
            </h1>
          </div>

          {/* Starter pack info */}
          <div className="mb-5 border border-yellow-900/50 bg-yellow-950/20 rounded p-3">
            <p className="text-yellow-400 text-xs font-bold mb-1">⬡ WELCOME BONUS</p>
            <p className="text-gray-400 text-xs">New SysAdmins receive 500 Standard Coins to open Booster Packs.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="w-full bg-black/50 border border-cyan-900/50 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-colors placeholder-gray-700"
                placeholder="SysAdmin_9000"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-cyan-900/50 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-colors placeholder-gray-700"
                placeholder="user@domain.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-black/50 border border-cyan-900/50 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-colors placeholder-gray-700"
                placeholder="min 6 characters"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs border border-red-900/50 bg-red-950/30 px-3 py-2 rounded">
                ✕ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-900/60 hover:bg-green-800/60 border border-green-700 text-green-300 font-bold py-2.5 rounded transition-all text-sm tracking-widest uppercase disabled:opacity-50"
            >
              {loading ? "INITIALIZING..." : "▶ CREATE ACCOUNT"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-gray-600 text-xs">Already have an account? </span>
            <Link href="/login" className="text-cyan-500 hover:text-cyan-400 text-xs transition-colors">
              Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
