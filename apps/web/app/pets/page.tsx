"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, Lock, Gift, TrendingUp, Zap, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/store";
import { getPets, relayBuyPet, relayLockPet } from "@/lib/api";
import SpotlightCard from "@/components/SpotlightCard";
import ClickSpark from "@/components/ClickSpark";

interface Pet {
  token_id:          number;
  owner_address:     string;
  user_address:      string;
  current_price_wei: string;
  total_purchases:   number;
  is_locked:         boolean;
  lock_expiry?:      string;
  username?:         string;
  display_name?:     string;
  avatar_ipfs_hash?: string;
  is_verified?:      boolean;
}

function formatPcash(wei: string): string {
  const num = Number(BigInt(wei) / BigInt(1e15)) / 1000;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toFixed(0);
}

const CARD_GRADIENTS = [
  ["#ff2d78", "#c9005a"],
  ["#3b82f6", "#1d4ed8"],
  ["#7c3aed", "#5b21b6"],
  ["#f59e0b", "#d97706"],
  ["#10b981", "#059669"],
  ["#ec4899", "#be185d"],
];

const SPOTLIGHT_COLORS: Array<`rgba(${number}, ${number}, ${number}, ${number})`> = [
  "rgba(255, 45, 120, 0.18)",
  "rgba(59, 130, 246, 0.18)",
  "rgba(124, 58, 237, 0.18)",
  "rgba(245, 158, 11, 0.18)",
  "rgba(16, 185, 129, 0.18)",
  "rgba(236, 72, 153, 0.18)",
];

function PetCard({ pet, onBuy, onLock }: { pet: Pet; onBuy: (p: Pet) => void; onLock: (p: Pet) => void }) {
  const [hovered, setHovered] = useState(false);
  const gi = pet.token_id % CARD_GRADIENTS.length;
  const [c1, c2] = CARD_GRADIENTS[gi];
  const spotlight = SPOTLIGHT_COLORS[gi];

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <SpotlightCard spotlightColor={spotlight} className="!p-0 overflow-hidden">
        {/* Avatar / banner */}
        <div style={{ height: 120, background: `linear-gradient(135deg, ${c1}, ${c2})`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {pet.avatar_ipfs_hash
            ? <img src={`https://gateway.pinata.cloud/ipfs/${pet.avatar_ipfs_hash}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
            : <span style={{ fontSize: "3rem", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}>🐾</span>
          }
          {pet.is_locked && (
            <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", borderRadius: "9999px", padding: "0.2rem 0.6rem", fontSize: "0.68rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 3, border: "1px solid rgba(255,255,255,0.1)" }}>
              <Lock size={9} /> Locked
            </div>
          )}
          <div style={{ position: "absolute", bottom: 10, left: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: "9999px", padding: "0.2rem 0.6rem", fontSize: "0.68rem", fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)" }}>
            Pet #{pet.token_id}
          </div>
        </div>

        <div style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", background: `linear-gradient(90deg, ${c1}, ${c2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{formatPcash(pet.current_price_wei)} PCASH</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff", marginTop: 2 }}>{pet.display_name || pet.username || "Unknown"}</div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                <TrendingUp size={10} /> {pet.total_purchases} trades
              </div>
            </div>
            <a href={`https://sepolia.basescan.org/address/${pet.owner_address}`} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: "rgba(255,255,255,0.25)", display: "flex", transition: "color 0.2s" }}
              className="hover:!text-white/60">
              <ExternalLink size={13} />
            </a>
          </div>

          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", fontFamily: "monospace", marginBottom: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pet.owner_address.slice(0, 10)}…{pet.owner_address.slice(-6)}
          </div>

          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <ClickSpark sparkColor="#ff2d78" sparkCount={10} sparkRadius={22}>
                    <button
                      disabled={pet.is_locked}
                      onClick={() => onBuy(pet)}
                      className="btn-pink"
                      style={{ flex: 1, fontSize: "0.78rem", padding: "0.45rem", opacity: pet.is_locked ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, width: "100%" }}
                    >
                      <ShoppingCart size={13} /> Buy
                    </button>
                  </ClickSpark>
                  <ClickSpark sparkColor="#3b82f6" sparkCount={8} sparkRadius={18}>
                    <button
                      onClick={() => onLock(pet)}
                      className="btn-blue"
                      style={{ flex: 1, fontSize: "0.78rem", padding: "0.45rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, width: "100%" }}
                    >
                      <Lock size={13} /> Lock
                    </button>
                  </ClickSpark>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export default function PetsPage() {
  const { jwt, login } = useAuth();
  const [pets,    setPets]    = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<string | null>(null);
  const [working, setWorking] = useState<number | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function loadPets() {
    setLoading(true);
    getPets({ limit: 20 })
      .then((data) => setPets(Array.isArray(data) ? data : (data as any).pets ?? []))
      .catch(() => setPets([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPets(); }, []);

  async function handleBuy(pet: Pet) {
    if (!jwt) { login(); return; }
    setWorking(pet.token_id);
    try {
      const data = await relayBuyPet(pet.token_id) as any;
      if (data.success) {
        showToast(`✅ Bought Pet #${pet.token_id}! New price: ${data.newPrice} PCASH`);
        loadPets();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      showToast(`❌ ${msg.includes("locked") ? "This pet is locked" : msg.includes("own") ? "You already own this pet" : msg}`);
    } finally {
      setWorking(null);
    }
  }

  async function handleLock(pet: Pet) {
    if (!jwt) { login(); return; }
    setWorking(pet.token_id);
    try {
      const data = await relayLockPet(pet.token_id, 24) as any;
      if (data.success) {
        showToast(`� Pet #${pet.token_id} locked for 24h`);
        loadPets();
      }
    } catch (e: unknown) {
      showToast(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setWorking(null);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
            Pet <span className="gradient-text">Marketplace</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem", marginTop: 4 }}>
            Buy, lock, and gift on-chain pets · Prices rise 10% per trade
          </p>
        </div>
        {!jwt && (
          <button onClick={login} className="btn-pink flex items-center gap-2" style={{ fontSize: "0.875rem" }}>
            <Zap size={14} /> Connect
          </button>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 85, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,45,120,0.3)", color: "#fff", borderRadius: "9999px", padding: "0.75rem 1.5rem", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", whiteSpace: "nowrap", maxWidth: "90vw", textAlign: "center" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,45,120,0.3)", borderTop: "3px solid #ff2d78", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : pets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🐾</div>
          <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>No pets yet</h3>
          <p style={{ color: "rgba(255,255,255,0.4)" }}>Pets appear after users sign up and get their profile minted</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          {pets.map((pet) => (
            <div key={pet.token_id} style={{ position: "relative" }}>
              {working === pet.token_id && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.5)", borderRadius: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", borderTop: "3px solid #fff", animation: "spin 0.8s linear infinite" }} />
                </div>
              )}
              <PetCard pet={pet} onBuy={handleBuy} onLock={handleLock} />
            </div>
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="glass" style={{ marginTop: "2rem", borderRadius: "1rem", padding: "1rem 1.25rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {[
          { icon: <ShoppingCart size={14} />, text: "Buying a pet transfers PCASH + takes ownership" },
          { icon: <Lock size={14} />, text: "Locking prevents others from buying for set duration" },
          { icon: <Gift size={14} />, text: "Gifting sends PCASH to a pet's profile wallet" },
          { icon: <TrendingUp size={14} />, text: "Price increases 10% on every buy — bonding curve" },
        ].map((item) => (
          <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
            <span style={{ color: "rgba(255,45,120,0.7)" }}>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
