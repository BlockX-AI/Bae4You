"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Wallet, Trophy, Zap, Copy, ExternalLink, Gift } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";
import ClickSpark from "@/components/ClickSpark";
import { useAuth } from "@/lib/store";
import { getMe, updateMe, claimBonus, getBonusStatus, setupWallet, getRankings, getPortfolio } from "@/lib/api";
import { formatAddress } from "@/lib/wallet";

export default function ProfilePage() {
  const { jwt, address, login, logout } = useAuth();
  const [user,      setUser]      = useState<any>(null);
  const [rankings,  setRankings]  = useState<any[]>([]);
  const [editing,   setEditing]   = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio,       setBio]       = useState("");
  const [country,   setCountry]   = useState("");
  const [toast,     setToast]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bonusInfo, setBonusInfo] = useState<{ canClaim: boolean; nextClaimAt?: string } | null>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    if (!jwt) { setLoading(false); return; }
    Promise.all([getMe(), getRankings(), getBonusStatus()])
      .then(([u, r, b]) => {
        const usr = u as any;
        setUser(usr);
        setDisplayName(usr.display_name ?? "");
        setBio(usr.bio ?? "");
        setCountry(usr.country_code ?? "");
        setRankings((r as any).rankings ?? []);
        setBonusInfo({ canClaim: (b as any).canClaim ?? true, nextClaimAt: (b as any).nextClaimAt });
        if (usr.wallet_address) {
          getPortfolio(usr.wallet_address)
            .then((p: any) => setPortfolio(p.pets ?? p ?? []))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jwt]);

  useEffect(() => {
    if (!bonusInfo?.nextClaimAt) return;
    const iv = setInterval(() => {
      const diff = new Date(bonusInfo.nextClaimAt!).getTime() - Date.now();
      if (diff <= 0) { setCountdown(""); setBonusInfo((b) => b ? { ...b, canClaim: true } : b); clearInterval(iv); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`);
    }, 1000);
    return () => clearInterval(iv);
  }, [bonusInfo?.nextClaimAt]);

  async function saveProfile() {
    try {
      const u = await updateMe({ display_name: displayName, bio, country_code: country || undefined });
      setUser(u);
      setEditing(false);
      showToast("✅ Profile saved!");
    } catch (e: unknown) {
      showToast(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  async function handleClaimBonus() {
    try {
      const data = await claimBonus() as any;
      showToast(`🎁 Bonus claimed!`);
      const b = await getBonusStatus() as any;
      setBonusInfo({ canClaim: b.canClaim ?? false, nextClaimAt: b.nextClaimAt });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("429") || msg.toLowerCase().includes("cooldown")) {
        showToast("⏳ Bonus cooldown — try again later");
      } else {
        showToast(`❌ ${msg}`);
      }
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !jwt) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://baebackend-production.up.railway.app";
      const stored = localStorage.getItem("bae4u_jwt");
      const res = await fetch(`${API_URL}/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${stored}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUser((u: any) => ({ ...u, avatar_ipfs_hash: data.ipfsHash ?? data.avatar_ipfs_hash }));
      showToast("✅ Avatar updated!");
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSetupWallet() {
    try {
      const data = await setupWallet("custodial") as any;
      showToast(`🔑 Wallet: ${String(data.walletAddress ?? data.wallet_address ?? "ready").slice(0, 14)}…`);
      const u = await getMe();
      setUser(u);
    } catch (e: unknown) {
      showToast(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  if (!jwt) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: "1.25rem", textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "4rem", filter: "drop-shadow(0 0 24px rgba(255,45,120,0.4))" }}>👤</div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Your Profile</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", maxWidth: 320 }}>Connect your wallet to view and edit your on-chain profile.</p>
        <ClickSpark sparkColor="#ff2d78" sparkCount={10} sparkRadius={24}>
          <button onClick={login} className="btn-pink flex items-center gap-2">
            <Zap size={16} /> Connect Wallet
          </button>
        </ClickSpark>
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

  const walletAddr = (user as any)?.wallet_address ?? address ?? "";
  const tokenId    = (user as any)?.token_id;
  const walletType = (user as any)?.wallet_type ?? "external";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: "fixed", top: 85, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,45,120,0.3)", color: "#fff", borderRadius: "9999px", padding: "0.75rem 1.5rem", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", whiteSpace: "nowrap", maxWidth: "90vw", textAlign: "center" }}
        >
          {toast}
        </motion.div>
      )}

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "1.25rem" }}>
      <SpotlightCard spotlightColor="rgba(255, 45, 120, 0.15)" className="!p-0 overflow-hidden">
        {/* Banner + Avatar */}
        <div style={{ height: 110, background: "linear-gradient(135deg, #ff2d78 0%, #3b82f6 100%)", position: "relative" }}>
          <label style={{ position: "absolute", bottom: -36, left: "50%", transform: "translateX(-50%)", cursor: "pointer" }}>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            <div style={{ width: 72, height: 72, borderRadius: "50%", border: "3px solid #09090b", overflow: "hidden", background: "linear-gradient(135deg, #ff2d78, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {uploading
                ? <div style={{ width: 26, height: 26, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", borderTop: "3px solid #fff", animation: "spin 0.8s linear infinite" }} />
                : (user as any)?.avatar_ipfs_hash
                  ? <img src={`https://gateway.pinata.cloud/ipfs/${(user as any).avatar_ipfs_hash}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: "1.75rem" }}>🐾</span>
              }
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s", borderRadius: "50%", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.02em" }} className="hover-avatar-overlay">
                EDIT
              </div>
            </div>
          </label>
        </div>
        <style>{`.hover-avatar-overlay { } label:hover .hover-avatar-overlay { opacity: 1 !important; background: rgba(0,0,0,0.45) !important; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ padding: "2.5rem 1.5rem 1.5rem", textAlign: "center" }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
              <input
                className="input-glass"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <textarea
                className="input-glass"
                placeholder="Bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                style={{ resize: "none" }}
              />
              <input
                className="input-glass"
                placeholder="Country code (e.g. IN, US, GB)"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
              />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={saveProfile} className="btn-pink" style={{ flex: 1 }}>Save</button>
                <button onClick={() => setEditing(false)} style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: "9999px", padding: "0.625rem 1rem", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                {(user as any)?.display_name || (user as any)?.username || formatAddress(address ?? "")}
              </h2>
              {(user as any)?.bio && (
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", marginBottom: "1rem", lineHeight: 1.6 }}>{(user as any).bio}</p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
                <span className="badge-pink">{walletType}</span>
                {tokenId && (
                  <span style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)", color: "#93c5fd", borderRadius: "9999px", padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: 600 }}>
                    Pet #{tokenId}
                  </span>
                )}
              </div>
              <button onClick={() => setEditing(true)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: "9999px", padding: "0.5rem 1.25rem", cursor: "pointer", fontSize: "0.875rem" }}>
                Edit Profile
              </button>
            </>
          )}
        </div>
      </SpotlightCard>
      </motion.div>

      {/* Wallet info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: "1rem" }}>
      <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.12)">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <Wallet size={18} style={{ color: "#ff7eb3" }} />
          <span style={{ fontWeight: 700 }}>Wallet</span>
        </div>
        {walletAddr ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem" }}>
            <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.6)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {walletAddr}
            </span>
            <button
              onClick={() => { navigator.clipboard.writeText(walletAddr); showToast("Copied!"); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "0.25rem", display: "flex" }}
            >
              <Copy size={14} />
            </button>
            <a href={`https://sepolia.basescan.org/address/${walletAddr}`} target="_blank" rel="noopener noreferrer"
              style={{ color: "rgba(255,255,255,0.4)", display: "flex" }}>
              <ExternalLink size={14} />
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}>No custodial wallet yet</span>
            <button onClick={handleSetupWallet} className="btn-blue" style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}>
              Create
            </button>
          </div>
        )}
      </SpotlightCard>
      </motion.div>

      {/* Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ marginBottom: "1rem" }}>
      <SpotlightCard spotlightColor="rgba(255, 45, 120, 0.12)">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <Gift size={18} style={{ color: "#93c5fd" }} />
          <span style={{ fontWeight: 700 }}>Daily Bonus</span>
          {bonusInfo?.canClaim && (
            <span style={{ marginLeft: "auto", fontSize: "0.7rem", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", borderRadius: "9999px", padding: "0.15rem 0.5rem", fontWeight: 700 }}>Ready</span>
          )}
        </div>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem" }}>
          {countdown ? `Next claim in ${countdown}` : "Claim your EIP-712 signed PCASH bonus once per 4 hours"}
        </p>
        <ClickSpark sparkColor="#ff2d78" sparkCount={12} sparkRadius={28}>
          <button
            onClick={handleClaimBonus}
            disabled={!!countdown}
            className="btn-pink"
            style={{ width: "100%", opacity: countdown ? 0.45 : 1 }}
          >
            {countdown ? `⏳ ${countdown}` : "Claim Bonus 🎁"}
          </button>
        </ClickSpark>
      </SpotlightCard>
      </motion.div>

      {/* Rankings */}
      {rankings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: "1rem" }}>
        <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.12)">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Trophy size={18} style={{ color: "#f59e0b" }} />
            <span style={{ fontWeight: 700 }}>Top Rankings</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {rankings.slice(0, 5).map((r: any, i: number) => (
              <div key={r.user_id ?? i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", borderRadius: "0.75rem", background: i < 3 ? "rgba(245,158,11,0.08)" : "transparent" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: i === 0 ? "#f59e0b" : i === 1 ? "#9ca3af" : i === 2 ? "#d97706" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.display_name ?? r.username ?? "Unknown"}
                </span>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                  {r.score?.toLocaleString() ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </SpotlightCard>
        </motion.div>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} style={{ marginBottom: "1rem" }}>
        <SpotlightCard spotlightColor="rgba(255, 45, 120, 0.1)">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.1rem" }}>🐾</span>
              <span style={{ fontWeight: 700 }}>My Pets</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>{portfolio.length} owned</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {portfolio.slice(0, 8).map((p: any) => (
              <a
                key={p.token_id}
                href={`https://sepolia.basescan.org/address/${p.owner_address}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.2)", borderRadius: "0.75rem", padding: "0.4rem 0.75rem", fontSize: "0.78rem", fontWeight: 600, color: "#ff7eb3", textDecoration: "none" }}
              >
                Pet #{p.token_id}
              </a>
            ))}
          </div>
        </SpotlightCard>
        </motion.div>
      )}

      {/* Sign out */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <button
          onClick={logout}
          style={{ width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", borderRadius: "0.75rem", padding: "0.875rem", cursor: "pointer", transition: "all 0.2s", fontSize: "0.875rem" }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,45,120,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "#ff7eb3"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; }}
        >
          Disconnect Wallet
        </button>
      </motion.div>
    </div>
  );
}
