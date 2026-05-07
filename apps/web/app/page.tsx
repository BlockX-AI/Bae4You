"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Heart, Zap, ArrowRight, ChevronDown, Shield, Star } from "lucide-react";
import { useAuth } from "@/lib/store";
import Aurora from "@/components/Aurora";
import GradientText from "@/components/GradientText";
import SpotlightCard from "@/components/SpotlightCard";
import ShinyText from "@/components/ShinyText";
import Orb from "@/components/Orb";
import Particles from "@/components/Particles";
import ClickSpark from "@/components/ClickSpark";

const FEATURES = [
  { icon: "🐾", title: "Own Digital Pets",  tag: "NFT",      desc: "Buy, lock, and gift on-chain profile pets. Every interaction lives on Base Sepolia.", color: "rgba(255,45,120,0.12)",  border: "rgba(255,45,120,0.25)",  spotlight: "rgba(255, 45, 120, 0.18)" as const },
  { icon: "�", title: "Smart Matching",    tag: "Dating",   desc: "Swipe through profiles, find mutual attraction, unlock on-chain relationship NFTs.",  color: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.25)",  spotlight: "rgba(139, 92, 246, 0.18)" as const },
  { icon: "💎", title: "Earn PCASH",        tag: "DeFi",     desc: "Claim daily PCASH tokens, earn passive income from pet trades, climb the leaderboard.", color: "rgba(59,130,246,0.12)",   border: "rgba(59,130,246,0.25)",   spotlight: "rgba(59, 130, 246, 0.18)" as const },
  { icon: "⚡", title: "Gasless for Users", tag: "ERC-4337", desc: "Coinbase paymaster covers all gas. Connect, swipe, and own — zero friction.",          color: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.25)",   spotlight: "rgba(234, 179, 8, 0.18)" as const },
  { icon: "🔒", title: "SIWE Auth",         tag: "Security", desc: "Sign-In with Ethereum. Your wallet IS your account. No emails, no passwords.",        color: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.25)",   spotlight: "rgba(34, 197, 94, 0.18)" as const },
  { icon: "🏆", title: "On-Chain Rankings", tag: "Web3",     desc: "Weekly leaderboards with EIP-712 badge NFTs for top performers globally.",            color: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.25)",  spotlight: "rgba(249, 115, 22, 0.18)" as const },
];

const MOCK_CARDS = [
  { name: "Emma", age: 24, loc: "New York", emoji: "👩‍🦳", pet: "🦊", pcash: "2,400" },
  { name: "Alex", age: 27, loc: "London",   emoji: "🧑‍🦱", pet: "🐺", pcash: "1,850" },
  { name: "Mia",  age: 23, loc: "Tokyo",    emoji: "👩‍🦰", pet: "🐱", pcash: "3,200" },
];

const STATS = [
  { value: "4",     label: "Verified Contracts", color: "#ff7eb3" },
  { value: "Base",  label: "Sepolia Testnet",     color: "#93c5fd" },
  { value: "43",    label: "API Endpoints",       color: "#c084fc" },
  { value: "0 gas", label: "For Users",           color: "#6ee7b7" },
];

export default function LandingPage() {
  const { jwt, login } = useAuth();

  return (
    <div style={{ minHeight: "100vh", position: "relative", background: "#09090b", color: "#fff" }}>

      {/* Aurora */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Aurora colorStops={["#3b82f6", "#ff2d78", "#7c3aed"]} amplitude={1.3} blend={0.65} speed={0.4} />
      </div>

      {/* Orbs */}
      <div style={{ position: "fixed", left: "-12vw", top: "8vh", width: "52vw", height: "52vw", maxWidth: 620, maxHeight: 620, zIndex: 1, pointerEvents: "none", opacity: 0.28 }}>
        <Orb hue={330} hoverIntensity={0.3} forceHoverState={false} />
      </div>
      <div style={{ position: "fixed", right: "-10vw", bottom: "5vh", width: "42vw", height: "42vw", maxWidth: 520, maxHeight: 520, zIndex: 1, pointerEvents: "none", opacity: 0.18 }}>
        <Orb hue={220} hoverIntensity={0.3} forceHoverState={false} />
      </div>

      {/* ── HERO ── */}
      <section style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", alignItems: "center", padding: "6rem 2rem 4rem" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.35 }}>
          <Particles particleCount={90} particleColors={["#ff2d78", "#ff7eb3", "#93c5fd", "#c084fc"]} particleBaseSize={1.5} speed={0.25} className="w-full h-full" />
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: "4rem", justifyContent: "space-between" }}>

          {/* Left text */}
          <div style={{ flex: "1 1 0", minWidth: 0, maxWidth: 580 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} style={{ marginBottom: "1.75rem" }}>
              <ShinyText text="✨  Now Live on Base Sepolia" speed={3} className="badge-pink inline-block" color="rgba(255,255,255,0.5)" shineColor="#fff" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
              <div style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: "1.5rem" }}>
                <div style={{ color: "rgba(255,255,255,0.88)" }}>Find Your</div>
                <div style={{ lineHeight: 0.95 }}>
                  <GradientText colors={["#ff2d78", "#ff7eb3", "#c084fc", "#93c5fd", "#ff2d78"]} animationSpeed={3} showBorder={false} className="">
                    Bae.
                  </GradientText>
                </div>
                <div style={{ color: "rgba(255,255,255,0.52)", fontSize: "0.68em", marginTop: "0.15em" }}>On-Chain.</div>
              </div>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.55 }}
              style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.48)", lineHeight: 1.78, marginBottom: "2.5rem", maxWidth: 460 }}
            >
              Swipe real profiles. Trade on-chain pets. Earn PCASH every day.
              All gasless — the Web3 dating app you actually want to use.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
              style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", marginBottom: "3.25rem" }}
            >
              {jwt ? (
                <Link href="/discover">
                  <ClickSpark sparkColor="#ff2d78" sparkCount={14} sparkRadius={30}>
                    <button className="btn-pink flex items-center gap-2" style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}>
                      <Heart size={18} /> Start Swiping
                    </button>
                  </ClickSpark>
                </Link>
              ) : (
                <ClickSpark sparkColor="#ff2d78" sparkCount={14} sparkRadius={30}>
                  <button onClick={login} className="btn-pink flex items-center gap-2" style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}>
                    <Zap size={18} /> Connect Wallet
                  </button>
                </ClickSpark>
              )}
              <Link href="/pets">
                <ClickSpark sparkColor="#3b82f6" sparkCount={10} sparkRadius={24}>
                  <button className="btn-blue flex items-center gap-2" style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}>
                    <ShoppingBag size={18} /> Browse Pets
                  </button>
                </ClickSpark>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.7 }}
              style={{ display: "flex", gap: "2.5rem", flexWrap: "wrap" }}
            >
              {STATS.map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.28)", marginTop: "0.2rem" }}>{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: floating profile cards — hidden on small screens */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="hidden lg:block"
            style={{ position: "relative", width: 300, height: 430, flexShrink: 0 }}
          >
            {MOCK_CARDS.map((card, i) => (
              <motion.div
                key={card.name}
                animate={{ y: [0, i % 2 === 0 ? -12 : -8, 0] }}
                transition={{ duration: 3.2 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.45 }}
                style={{
                  position: "absolute",
                  top: i * 16,
                  left: i * 10,
                  width: 258,
                  borderRadius: "1.5rem",
                  background: i === 2 ? "rgba(12,12,20,0.96)" : "rgba(18,18,28,0.72)",
                  border: `1px solid ${i === 2 ? "rgba(255,45,120,0.35)" : "rgba(255,255,255,0.07)"}`,
                  backdropFilter: "blur(20px)",
                  boxShadow: i === 2 ? "0 24px 60px rgba(255,45,120,0.22), 0 0 0 1px rgba(255,45,120,0.1) inset" : "0 12px 40px rgba(0,0,0,0.55)",
                  transform: `rotate(${[-6, 3, 0][i]}deg)`,
                  zIndex: i + 1,
                  overflow: "hidden",
                  padding: "1.25rem",
                }}
              >
                <div style={{ width: "100%", height: 148, borderRadius: "1rem", background: `linear-gradient(135deg, ${["rgba(139,92,246,0.45)","rgba(59,130,246,0.45)","rgba(255,45,120,0.4)"][i]}, rgba(0,0,0,0.25))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.75rem", marginBottom: "1rem" }}>
                  {card.emoji}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>{card.name}, {card.age}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.38)", marginTop: "0.2rem" }}>📍 {card.loc}</div>
                  </div>
                  <div style={{ background: "rgba(255,45,120,0.14)", border: "1px solid rgba(255,45,120,0.28)", borderRadius: "0.7rem", padding: "0.3rem 0.55rem", textAlign: "center" }}>
                    <div style={{ fontSize: "0.55rem", color: "#ff7eb3", fontWeight: 700, letterSpacing: "0.05em" }}>PCASH</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fff" }}>{card.pcash}</div>
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.45rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.6rem", padding: "0.45rem 0.7rem" }}>
                  <span style={{ fontSize: "1rem" }}>{card.pet}</span>
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.42)" }}>Profile Pet · Locked</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.6rem", background: "rgba(34,197,94,0.15)", color: "#4ade80", borderRadius: "9999px", padding: "0.12rem 0.45rem", fontWeight: 700 }}>ON-CHAIN</span>
                </div>
              </motion.div>
            ))}

            {/* Animated like badge */}
            <motion.div
              animate={{ opacity: [0, 1, 1, 0], x: [0, 18, 18, 18], scale: [0.8, 1, 1, 0.8] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: 1.5 }}
              style={{ position: "absolute", top: "42%", right: -44, background: "linear-gradient(135deg,#ff2d78,#e91e8c)", borderRadius: "0.75rem", padding: "0.45rem 0.8rem", fontWeight: 800, fontSize: "0.8rem", color: "#fff", boxShadow: "0 0 24px rgba(255,45,120,0.55)", zIndex: 20 }}
            >
              💘 LIKE
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.9, repeat: Infinity }}
          style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.18)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}
        >
          <span style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>scroll</span>
          <ChevronDown size={15} />
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ position: "relative", zIndex: 10, padding: "6rem 2rem", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#ff7eb3", fontWeight: 700, marginBottom: "0.875rem" }}>Why Bae4U?</div>
          <h2 style={{ fontSize: "clamp(1.75rem,5vw,2.75rem)", fontWeight: 900, letterSpacing: "-0.02em" }}>
            Everything you love about dating apps —
            <br />
            <span className="gradient-text">now on-chain.</span>
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.15rem" }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.42, delay: i * 0.07 }}
              whileHover={{ y: -4 }}
            >
              <SpotlightCard
                spotlightColor={f.spotlight as `rgba(${number}, ${number}, ${number}, ${number})`}
                className="h-full"
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ width: 50, height: 50, borderRadius: "0.875rem", background: f.color, border: `1px solid ${f.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.45rem", flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.45rem" }}>
                      <h3 style={{ fontWeight: 700, fontSize: "0.93rem", color: "#fff" }}>{f.title}</h3>
                      <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.45rem", borderRadius: "9999px", background: f.color, border: `1px solid ${f.border}`, color: "rgba(255,255,255,0.55)", fontWeight: 700, letterSpacing: "0.04em" }}>{f.tag}</span>
                    </div>
                    <p style={{ fontSize: "0.81rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.65 }}>{f.desc}</p>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ position: "relative", zIndex: 10, padding: "6rem 2rem", maxWidth: 860, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#93c5fd", fontWeight: 700, marginBottom: "0.875rem" }}>Get Started</div>
          <h2 style={{ fontSize: "clamp(1.75rem,4.5vw,2.5rem)", fontWeight: 900, letterSpacing: "-0.02em" }}>
            Three steps to your first match
          </h2>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { step: "01", title: "Connect Your Wallet", desc: "MetaMask, WalletConnect, Coinbase, or create a free in-app wallet — no seed phrase needed.", icon: <Zap size={20} />, accent: "rgba(255,45,120,0.15)", border: "rgba(255,45,120,0.25)" },
            { step: "02", title: "Build Your Profile",  desc: "Mint your on-chain pet, set your interests, and start discovering matches worldwide.",      icon: <Star size={20} />, accent: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.25)" },
            { step: "03", title: "Swipe, Match & Earn", desc: "Like profiles, chat with matches, trade pets for PCASH, and climb the leaderboard.",         icon: <Heart size={20} />, accent: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.25)" },
            { step: "04", title: "Rank & Earn Badges",  desc: "Collect weekly bonuses, on-chain badge NFTs, and rise to the top of 50+ country boards.",    icon: <Shield size={20} />, accent: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.25)" },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -28 : 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.48, delay: i * 0.1 }}
            >
              <SpotlightCard spotlightColor={item.accent as `rgba(${number}, ${number}, ${number}, ${number})`} className="">
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "rgba(255,255,255,0.12)", letterSpacing: "0.04em", minWidth: 26 }}>{item.step}</div>
                  <div style={{ width: 46, height: 46, borderRadius: "0.875rem", background: item.accent, border: `1px solid ${item.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem", color: "#fff" }}>{item.title}</div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                  <ArrowRight size={15} style={{ color: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ position: "relative", zIndex: 10, padding: "4rem 2rem 8rem", textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          style={{
            maxWidth: 680, margin: "0 auto",
            background: "linear-gradient(135deg, rgba(255,45,120,0.07) 0%, rgba(139,92,246,0.07) 50%, rgba(59,130,246,0.07) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "2rem",
            padding: "4rem 3rem",
            backdropFilter: "blur(24px)",
          }}
        >
          <div style={{ fontSize: "2.75rem", marginBottom: "1.25rem" }}>🐾💘</div>
          <h2 style={{ fontSize: "clamp(1.75rem,4vw,2.4rem)", fontWeight: 900, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Ready to find your <span className="gradient-text">Bae4U</span>?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "2.5rem", lineHeight: 1.75, fontSize: "1rem", maxWidth: 420, margin: "0 auto 2.5rem" }}>
            Join the on-chain dating revolution. Your perfect match and digital pet are waiting.
          </p>
          {jwt ? (
            <Link href="/discover">
              <ClickSpark sparkColor="#ff2d78" sparkCount={14} sparkRadius={32}>
                <button className="btn-pink flex items-center gap-2 mx-auto" style={{ fontSize: "1rem", padding: "0.875rem 2.5rem" }}>
                  <Heart size={18} /> Start Discovering <ArrowRight size={18} />
                </button>
              </ClickSpark>
            </Link>
          ) : (
            <ClickSpark sparkColor="#ff2d78" sparkCount={14} sparkRadius={32}>
              <button onClick={login} className="btn-pink flex items-center gap-2 mx-auto" style={{ fontSize: "1rem", padding: "0.875rem 2.5rem" }}>
                <Zap size={18} /> Get Started Free <ArrowRight size={18} />
              </button>
            </ClickSpark>
          )}
          <p style={{ marginTop: "1.5rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
            Free to use · Gasless transactions · No email required
          </p>
        </motion.div>
      </section>
    </div>
  );
}

function ShoppingBag({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
