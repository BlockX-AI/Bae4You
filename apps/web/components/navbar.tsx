"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, ShoppingBag, MessageCircle, User, Zap, LogOut } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatAddress } from "@/lib/wallet";
import { clsx } from "clsx";
import ClickSpark from "@/components/ClickSpark";

const NAV = [
  { href: "/discover", icon: Heart,         label: "Discover" },
  { href: "/pets",     icon: ShoppingBag,   label: "Pets"     },
  { href: "/matches",  icon: MessageCircle, label: "Matches"  },
  { href: "/profile",  icon: User,          label: "Profile"  },
];

export default function Navbar() {
  const path    = usePathname();
  const { address, jwt, openWalletModal, logout } = useAuth();

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(9,9,11,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" className="flex items-center gap-2">
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#ff2d78,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🐾</div>
          <span style={{ fontWeight: 900, fontSize: "1.1rem", background: "linear-gradient(90deg,#ff7eb3,#93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Bae4U</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={clsx(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                path === href
                  ? "text-white"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
              style={path === href ? { background: "linear-gradient(135deg,rgba(255,45,120,0.2),rgba(59,130,246,0.2))", border: "1px solid rgba(255,255,255,0.1)" } : {}}
            >
              <Icon size={15} strokeWidth={path === href ? 2.5 : 1.5} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {jwt ? (
            <>
              <Link href="/profile">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9999px", padding: "0.375rem 0.875rem", cursor: "pointer" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#ff2d78,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem" }}>🐾</div>
                  <span className="hidden sm:block text-xs font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {address ? formatAddress(address) : "connected"}
                  </span>
                </div>
              </Link>
              <button onClick={logout}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "9999px", padding: "0.375rem 0.5rem", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center" }}
                className="hover:text-white/70 transition-colors">
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <ClickSpark sparkColor="#ff2d78" sparkSize={8} sparkCount={8} sparkRadius={18}>
              <button onClick={openWalletModal} className="btn-pink flex items-center gap-1.5 text-sm" style={{ padding: "0.5rem 1.125rem" }}>
                <Zap size={13} />
                Connect
              </button>
            </ClickSpark>
          )}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe"
        style={{ background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={clsx(
              "flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all",
              path === href ? "text-white" : "text-white/30"
            )}>
            <Icon size={20} strokeWidth={path === href ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
