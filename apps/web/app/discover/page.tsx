"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { X, Heart, Zap, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/store";
import { getDiscover, likeUser, passUser } from "@/lib/api";
import Particles from "@/components/Particles";
import ClickSpark from "@/components/ClickSpark";
import AnimatedContent from "@/components/AnimatedContent";

interface Candidate {
  id:              string;
  display_name:    string;
  username:        string;
  avatar_ipfs_hash?: string;
  bio?:            string;
  country_code?:   string;
  is_verified?:    boolean;
  token_id?:       number;
  created_at?:     string;
}

const GRADIENT_COMBOS = [
  "linear-gradient(135deg, #ff2d78 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #ff2d78 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function SwipeCard({
  candidate,
  index,
  onLike,
  onPass,
  active,
}: {
  candidate: Candidate;
  index:     number;
  onLike:    () => void;
  onPass:    () => void;
  active:    boolean;
}) {
  const x       = useMotionValue(0);
  const rotate  = useTransform(x, [-180, 180], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const likeOpacity  = useTransform(x, [20, 80], [0, 1]);
  const passOpacity  = useTransform(x, [-80, -20], [1, 0]);

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 100) onLike();
    else if (info.offset.x < -100) onPass();
  }

  const gradient = GRADIENT_COMBOS[index % GRADIENT_COMBOS.length];

  return (
    <motion.div
      className="swipe-card"
      style={{
        x,
        rotate,
        opacity,
        zIndex: 10 - index,
        scale:  active ? 1 : 0.94 - index * 0.02,
        y:      active ? 0 : index * 10,
      }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.03 }}
    >
      <div style={{
        borderRadius: "1.5rem",
        overflow: "hidden",
        background: gradient,
        aspectRatio: "3/4",
        position: "relative",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Avatar */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "6rem", fontWeight: 800, color: "rgba(255,255,255,0.3)",
          letterSpacing: "-0.05em",
        }}>
          {candidate.avatar_ipfs_hash
            ? <img src={`https://gateway.pinata.cloud/ipfs/${candidate.avatar_ipfs_hash}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : getInitials(candidate.display_name || candidate.username || "??")}
        </div>

        {/* Like / Pass overlays */}
        {active && (
          <>
            <motion.div style={{ opacity: likeOpacity, position: "absolute", top: 24, left: 24, background: "#ff2d78", color: "#fff", borderRadius: "0.75rem", padding: "0.4rem 1rem", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.1em", border: "3px solid #fff", transform: "rotate(-15deg)" }}>
              LIKE ❤️
            </motion.div>
            <motion.div style={{ opacity: passOpacity, position: "absolute", top: 24, right: 24, background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: "0.75rem", padding: "0.4rem 1rem", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.1em", border: "3px solid rgba(255,255,255,0.5)", transform: "rotate(15deg)" }}>
              NOPE 👋
            </motion.div>
          </>
        )}

        {/* Info overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          padding: "3rem 1.5rem 1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.6rem", fontWeight: 800 }}>
              {candidate.display_name || candidate.username}
            </span>
            {candidate.is_verified && (
              <span style={{ background: "rgba(59,130,246,0.3)", border: "1px solid rgba(59,130,246,0.5)", color: "#93c5fd", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0 }}>✓</span>
            )}
          </div>
          {candidate.country_code && (
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginTop: "0.2rem" }}>
              📍 {candidate.country_code}
            </div>
          )}
          {candidate.bio && (
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", marginTop: "0.5rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {candidate.bio}
            </p>
          )}
          {candidate.token_id && (
            <div style={{ marginTop: "0.6rem", display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,45,120,0.2)", border: "1px solid rgba(255,45,120,0.3)", borderRadius: "9999px", padding: "0.2rem 0.6rem", fontSize: "0.72rem", fontWeight: 600 }}>
              🐾 Pet #{candidate.token_id}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function DiscoverPage() {
  const { jwt, login } = useAuth();
  const [candidates,   setCandidates]   = useState<Candidate[]>([]);
  const [current,      setCurrent]      = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState<{ msg: string; type: "like" | "pass" } | null>(null);
  const [matchPopup,   setMatchPopup]   = useState<Candidate | null>(null);
  const [countryFilter, setCountryFilter] = useState("");

  const load = useCallback(async (country?: string) => {
    setLoading(true);
    try {
      const data = await getDiscover(10, country || undefined);
      setCandidates(data.candidates ?? []);
      setCurrent(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (jwt) load(); else setLoading(false); }, [jwt, load]);

  function showToast(msg: string, type: "like" | "pass") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 1800);
  }

  async function handleLike() {
    const c = candidates[current];
    if (!c) return;
    try {
      const res = await likeUser(c.id);
      if ((res as any).isNewMatch) {
        setMatchPopup(c);
        setTimeout(() => setMatchPopup(null), 3500);
      } else {
        showToast(`❤️ Liked ${c.display_name || c.username}`, "like");
      }
    } catch { showToast(`❤️ Liked!`, "like"); }
    setCurrent((n) => n + 1);
  }

  async function handlePass() {
    const c = candidates[current];
    if (!c) return;
    try { await passUser(c.id); } catch {}
    showToast(`👋 Passed`, "pass");
    setCurrent((n) => n + 1);
  }

  function applyCountryFilter(code: string) {
    setCountryFilter(code);
    load(code);
  }

  if (!jwt) {
    return (
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: "1.5rem", textAlign: "center", padding: "2rem", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Particles particleCount={60} particleColors={["#ff2d78", "#ff7eb3", "#c084fc"]} particleBaseSize={2} speed={0.4} className="w-full h-full" />
        </div>
        <AnimatedContent distance={40} direction="vertical" duration={0.6}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "5rem", marginBottom: "0.5rem" }}>💘</div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Discover Your Match</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem", maxWidth: 340 }}>Connect your wallet to start discovering personality-matched profiles on-chain.</p>
            <ClickSpark sparkColor="#ff2d78" sparkCount={10} sparkRadius={24}>
              <button onClick={login} className="btn-pink flex items-center gap-2" style={{ margin: "0 auto" }}>
                <Zap size={16} /> Connect Wallet
              </button>
            </ClickSpark>
          </div>
        </AnimatedContent>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,45,120,0.3)", borderTop: "3px solid #ff2d78", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const remaining = candidates.slice(current, current + 3);
  const done      = current >= candidates.length;

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "1rem 1rem 2rem", position: "relative" }}>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Discover <span className="gradient-text">💘</span></h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
          {done ? "No more profiles" : `${candidates.length - current} profiles left`}
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: toast.type === "like" ? "#ff2d78" : "rgba(255,255,255,0.12)", color: "#fff", borderRadius: "9999px", padding: "0.75rem 1.5rem", fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* It's a match celebration */}
      <AnimatePresence>
        {matchPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            onClick={() => setMatchPopup(null)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              style={{ textAlign: "center", padding: "2.5rem 2rem", background: "linear-gradient(135deg, rgba(255,45,120,0.15), rgba(59,130,246,0.12))", border: "1px solid rgba(255,45,120,0.3)", borderRadius: "2rem", maxWidth: 340, margin: "0 1rem" }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>💘</div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 900, background: "linear-gradient(135deg,#ff2d78,#93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>It&apos;s a Match!</h2>
              <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.75rem", fontSize: "0.95rem" }}>
                You and <strong style={{ color: "#fff" }}>{matchPopup.display_name || matchPopup.username}</strong> liked each other
              </p>
              <button className="btn-pink" style={{ marginTop: "1.5rem", width: "100%" }} onClick={() => setMatchPopup(null)}>
                Send a Message 💬
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {done ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>You&apos;ve seen everyone!</h3>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2rem" }}>Check back later for new matches</p>
          <button onClick={() => load(countryFilter || undefined)} className="btn-pink">Refresh Feed</button>
        </div>
      ) : (
        <>
          {/* Country filter */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", overflowX: "auto", paddingBottom: 2 }}>
            {["", "IN", "US", "GB", "AU", "CA", "DE", "JP"].map((code) => (
              <button
                key={code}
                onClick={() => applyCountryFilter(code)}
                style={{
                  flexShrink: 0,
                  padding: "0.3rem 0.875rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.2s",
                  background: countryFilter === code ? "#ff2d78" : "rgba(255,255,255,0.05)",
                  borderColor: countryFilter === code ? "#ff2d78" : "rgba(255,255,255,0.1)",
                  color: countryFilter === code ? "#fff" : "rgba(255,255,255,0.5)",
                }}
              >
                {code === "" ? "🌍 All" : code}
              </button>
            ))}
          </div>

          {/* Card stack */}
          <div style={{ position: "relative", height: "calc(min(70vw * 4/3, 480px))", marginBottom: "2rem" }}>
            {remaining.map((c, i) => (
              <SwipeCard
                key={c.id}
                candidate={c}
                index={i}
                active={i === 0}
                onLike={handleLike}
                onPass={handlePass}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.5rem" }}>
            <ClickSpark sparkColor="#ffffff" sparkCount={8} sparkRadius={20}>
              <button className="action-btn action-btn-pass" onClick={handlePass} title="Pass">
                <X size={24} />
              </button>
            </ClickSpark>
            <ClickSpark sparkColor="#f59e0b" sparkCount={12} sparkRadius={20}>
              <button className="action-btn action-btn-super" style={{ width: "3rem", height: "3rem" }} onClick={() => {}} title="Super like">
                <Sparkles size={20} />
              </button>
            </ClickSpark>
            <ClickSpark sparkColor="#ff2d78" sparkCount={12} sparkRadius={24}>
              <button className="action-btn action-btn-like" onClick={handleLike} title="Like">
                <Heart size={24} />
              </button>
            </ClickSpark>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", marginTop: "1.5rem" }}>
            Swipe right to like · Swipe left to pass
          </p>
        </>
      )}
    </div>
  );
}
