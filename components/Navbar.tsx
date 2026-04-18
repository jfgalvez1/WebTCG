"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "⬡" },
  { href: "/registrar", label: "Registrar", icon: "⊕" },
  { href: "/booster", label: "Booster", icon: "◈" },
  { href: "/inventory", label: "Inventory", icon: "⊞" },
  { href: "/registry", label: "Registry", icon: "◉" },
  { href: "/marketplace", label: "Market", icon: "⟳" },
  { href: "/battlefield", label: "Battlefield", icon: "⚔" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="border-b border-cyan-900/50 bg-gray-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-cyan-400 text-xl group-hover:text-cyan-300 transition-colors">⟨/⟩</span>
          <span className="font-mono text-white font-bold text-sm tracking-wider hidden sm:block">
            WEB<span className="text-cyan-400">TCG</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-1 px-2 py-1.5 rounded text-xs font-mono transition-all
                ${pathname === href
                  ? "bg-cyan-900/60 text-cyan-300 border border-cyan-700/50"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                }
              `}
            >
              <span className="hidden sm:inline">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          {session?.user && (
            <span className="text-gray-500 text-xs font-mono hidden sm:block">
              {session.user.name ?? session.user.email}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs font-mono text-red-500 hover:text-red-400 border border-red-900/50 hover:border-red-700 px-2 py-1 rounded transition-all"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </nav>
  );
}
