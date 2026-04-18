"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid credentials. Check your email and password.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center matrix-bg p-4">
      <div className="w-full max-w-md">
        {/* ASCII Logo */}
        <div className="text-center mb-8">
          <pre className="text-cyan-400 text-xs leading-none select-none hidden sm:block">
{`██╗    ██╗███████╗██████╗     ████████╗ ██████╗ ██████╗ 
██║    ██║██╔════╝██╔══██╗    ╚══██╔══╝██╔════╝██╔════╝ 
██║ █╗ ██║█████╗  ██████╔╝       ██║   ██║     ██║  ███╗
██║███╗██║██╔══╝  ██╔══██╗       ██║   ██║     ██║   ██║
╚███╔███╔╝███████╗██████╔╝       ██║   ╚██████╗╚██████╔╝
 ╚══╝╚══╝ ╚══════╝╚═════╝        ╚═╝    ╚═════╝ ╚═════╝`}
          </pre>
          <div className="text-cyan-400 text-2xl font-bold sm:hidden">⟨/⟩ WEB TCG</div>
          <p className="text-gray-500 text-xs mt-2 tracking-widest uppercase">The Internet is the Battlefield</p>
        </div>

        {/* Login card */}
        <div className="border border-cyan-900/60 bg-gray-900/80 rounded-lg p-6 backdrop-blur shadow-xl shadow-cyan-950/40">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-sm font-bold tracking-widest uppercase text-cyan-300">
              SysAdmin Login
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                Email
              </label>
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
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-cyan-900/50 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-colors placeholder-gray-700"
                placeholder="••••••••"
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
              className="w-full bg-cyan-900/60 hover:bg-cyan-800/60 border border-cyan-700 text-cyan-300 font-bold py-2.5 rounded transition-all text-sm tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-900/30"
            >
              {loading ? "AUTHENTICATING..." : "▶ CONNECT"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-gray-600 text-xs">No account? </span>
            <Link href="/register" className="text-cyan-500 hover:text-cyan-400 text-xs transition-colors">
              Register as SysAdmin →
            </Link>
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-4">
          v0.1.0 — ALPHA BUILD
        </p>
      </div>
    </div>
  );
}
