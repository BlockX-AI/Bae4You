"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Wallet, Shield, Cpu, ChevronRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";

type Step = "idle" | "connecting" | "signing" | "creating_wallet" | "done" | "error";

interface WalletOption {
  id:          "metamask" | "walletconnect" | "coinbase" | "inapp" | "cdp";
  icon:        React.ReactNode;
  label:       string;
  tag?:        string;
  tagColor?:   string;
  description: string;
  steps:       string[];
  gradient:    string;
  spotlight:   `rgba(${number}, ${number}, ${number}, ${number})`;
}

const OPTIONS: WalletOption[] = [
  {
    id:          "metamask",
    icon:        <MetaMaskIcon />,
    label:       "MetaMask",
    tag:         "Browser Extension",
    tagColor:    "rgba(255,45,120,0.2)",
    description: "Connect your MetaMask browser extension wallet.",
    steps:       ["Requesting accounts…", "Switching to Base Sepolia…", "Signing SIWE message…"],
    gradient:    "linear-gradient(135deg, rgba(255,45,120,0.15) 0%, rgba(255,45,120,0.03) 100%)",
    spotlight:   "rgba(255, 45, 120, 0.15)",
  },
  {
    id:          "walletconnect",
    icon:        <WalletConnectIcon />,
    label:       "WalletConnect",
    tag:         "Scan with any wallet",
    tagColor:    "rgba(59,153,255,0.25)",
    description: "Use Rainbow, Trust Wallet, Uniswap, or any WalletConnect-compatible app.",
    steps:       ["Opening QR modal…", "Scanning & connecting…", "Signing SIWE message…"],
    gradient:    "linear-gradient(135deg, rgba(59,153,255,0.12) 0%, rgba(59,153,255,0.03) 100%)",
    spotlight:   "rgba(59, 153, 255, 0.15)",
  },
  {
    id:          "coinbase",
    icon:        <CoinbaseIcon />,
    label:       "Coinbase Wallet",
    tag:         "Recommended for new users",
    tagColor:    "rgba(0,82,255,0.2)",
    description: "Create a free Coinbase Wallet or connect your existing one. No seed phrase needed.",
    steps:       ["Opening Coinbase Wallet…", "Approving connection…", "Signing SIWE message…"],
    gradient:    "linear-gradient(135deg, rgba(0,82,255,0.12) 0%, rgba(0,82,255,0.03) 100%)",
    spotlight:   "rgba(0, 82, 255, 0.15)",
  },
  {
    id:          "inapp",
    icon:        <Shield size={28} strokeWidth={1.5} style={{ color: "#60a5fa" }} />,
    label:       "In-App Wallet",
    tag:         "No extension needed",
    tagColor:    "rgba(59,130,246,0.2)",
    description: "Instant gasless wallet created in-browser. Perfect for first-time users.",
    steps:       ["Generating secure key…", "Signing in silently…", "Creating on-chain wallet…"],
    gradient:    "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.03) 100%)",
    spotlight:   "rgba(59, 130, 246, 0.15)",
  },
  {
    id:          "cdp",
    icon:        <Cpu size={28} strokeWidth={1.5} style={{ color: "#a78bfa" }} />,
    label:       "Coinbase Smart Wallet",
    tag:         "CDP — Enterprise",
    tagColor:    "rgba(139,92,246,0.2)",
    description: "MPC-secured wallet via Coinbase Developer Platform. No private key exposure.",
    steps:       ["Generating secure key…", "Signing in silently…", "Provisioning CDP wallet…"],
    gradient:    "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.03) 100%)",
    spotlight:   "rgba(139, 92, 246, 0.15)",
  },
];

interface Props {
  open:             boolean;
  onClose:          () => void;
  onMetaMask:       () => Promise<void>;
  onWalletConnect:  () => Promise<void>;
  onCoinbase:       () => Promise<void>;
  onInApp:          () => Promise<void>;
  onCdp:            () => Promise<void>;
}

export default function WalletModal({ open, onClose, onMetaMask, onWalletConnect, onCoinbase, onInApp, onCdp }: Props) {
  const [active,    setActive]    = useState<WalletOption["id"] | null>(null);
  const [step,      setStep]      = useState<Step>("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [error,     setError]     = useState<string | null>(null);

  async function connect(opt: WalletOption) {
    setActive(opt.id);
    setError(null);

    const handlers: Record<WalletOption["id"], () => Promise<void>> = {
      metamask:      onMetaMask,
      walletconnect: onWalletConnect,
      coinbase:      onCoinbase,
      inapp:         onInApp,
      cdp:           onCdp,
    };

    try {
      for (let i = 0; i < opt.steps.length; i++) {
        setStep(i === 0 ? "connecting" : i === 1 ? "signing" : "creating_wallet");
        setStepLabel(opt.steps[i]);
        if (i < opt.steps.length - 1) await delay(350);
      }
      await handlers[opt.id]();
      setStep("done");
      await delay(800);
      reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setStep("error");
    }
  }

  function reset() {
    setActive(null);
    setStep("idle");
    setStepLabel("");
    setError(null);
  }

  function handleClose() {
    if (step === "connecting" || step === "signing" || step === "creating_wallet") return;
    reset();
    onClose();
  }

  const busy = step === "connecting" || step === "signing" || step === "creating_wallet";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "fixed", inset: 0, zIndex: 501,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "1rem", pointerEvents: "none",
            }}
          >
            <div style={{
              width: "100%", maxWidth: 460, pointerEvents: "all",
              background: "rgba(10,10,14,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "1.5rem",
              boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset",
              overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{ padding: "1.5rem 1.5rem 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #ff2d78, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                    🐾
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff" }}>Connect to Bae4U</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>Choose how you want to connect</div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={busy}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: busy ? "not-allowed" : "pointer", color: "rgba(255,255,255,0.4)", opacity: busy ? 0.4 : 1, transition: "all 0.2s" }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)", margin: "1rem 0" }} />

              {/* Options */}
              <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {OPTIONS.map((opt) => {
                  const isActive  = active === opt.id;
                  const isOther   = active !== null && active !== opt.id;
                  const isDone    = isActive && step === "done";
                  const isErr     = isActive && step === "error";

                  return (
                    <SpotlightCard
                      key={opt.id}
                      spotlightColor={opt.spotlight}
                      className={`!p-0 !rounded-xl !border-0 transition-all duration-300 ${isOther ? "opacity-40" : ""}`}
                    >
                      <button
                        onClick={() => !busy && connect(opt)}
                        disabled={busy}
                        style={{
                          width: "100%", padding: "1rem 1.125rem",
                          background: isActive ? opt.gradient : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
                          borderRadius: "0.75rem",
                          display: "flex", alignItems: "center", gap: "1rem",
                          cursor: busy ? "default" : "pointer",
                          textAlign: "left", transition: "all 0.25s",
                        }}
                      >
                        {/* Icon */}
                        <div style={{ width: 44, height: 44, borderRadius: "0.75rem", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isActive && busy ? (
                            <Loader2 size={22} className="animate-spin text-white" style={{ animation: "spin 0.8s linear infinite" }} />
                          ) : isDone ? (
                            <CheckCircle size={22} style={{ color: "#22c55e" }} />
                          ) : isErr ? (
                            <AlertCircle size={22} style={{ color: "#ef4444" }} />
                          ) : (
                            opt.icon
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>{opt.label}</span>
                            {opt.tag && (
                              <span style={{ background: opt.tagColor, border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9999px", padding: "0.1rem 0.5rem", fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                                {opt.tag}
                              </span>
                            )}
                          </div>

                          {isActive && busy ? (
                            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>{stepLabel}</div>
                          ) : isDone ? (
                            <div style={{ fontSize: "0.8rem", color: "#22c55e" }}>Connected successfully ✓</div>
                          ) : isErr ? (
                            <div style={{ fontSize: "0.75rem", color: "#ef4444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{error}</div>
                          ) : (
                            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{opt.description}</div>
                          )}
                        </div>

                        {!busy && !isActive && (
                          <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                        )}
                      </button>
                    </SpotlightCard>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: "0 1.5rem 1.25rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", lineHeight: 1.6 }}>
                  By connecting, you agree to the Bae4U Terms of Service.
                  Your keys are stored locally and never sent to our servers.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function MetaMaskIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 318 318" fill="none">
      <path d="M274.1 35.5l-99.7 74.1 18.4-43.5 81.3-30.6z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M44 35.5l98.8 74.8-17.5-44.2L44 35.5z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M238.3 206.8l-26.5 40.6 56.7 15.6 16.3-55.3-46.5-.9zM33.9 207.7L50 263l56.7-15.6-26.5-40.6-46.3.9z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M103.6 138.2l-15.8 23.9 56.3 2.5-2-60.5-38.5 34.1zM214.5 138.2l-39.1-34.9-1.3 61.3 56.2-2.5-15.8-23.9zM106.7 247.4l33.8-16.5-29.2-22.8-4.6 39.3zM177.6 230.9l33.9 16.5-4.7-39.3-29.2 22.8z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M211.5 247.4l-33.9-16.5 2.7 22.1-.3 9.3 31.5-14.9zM106.7 247.4l31.5 14.9-.2-9.3 2.6-22.1-33.9 16.5z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M138.8 193.5l-28.2-8.3 19.9-9.1 8.3 17.4zM179.3 193.5l8.3-17.4 20 9.1-28.3 8.3z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M106.7 247.4l4.8-40.6-31.1.9 26.3 39.7zM206.6 206.8l4.8 40.6 26.3-39.7-31.1-.9zM230.5 162.1l-56.2 2.5 5.2 28.9 8.3-17.4 20 9.1 22.7-23.1zM110.6 185.2l20-9.1 8.2 17.4 5.3-28.9-56.3-2.5 22.8 23.1z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M87.8 162.1l23.6 46.1-.8-23-22.8-23.1zM207.5 185.2l-1 23 23.6-46.1-22.6 23.1zM143.9 164.6l-5.3 28.9 6.6 34.1 1.5-44.9-2.8-18.1zM174.3 164.6l-2.7 18 1.3 45 6.7-34.1-5.3-28.9z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M179.6 193.5l-6.7 34.1 4.8 3.3 29.2-22.8 1-23-28.3 8.4zM110.6 185.2l.8 23 29.2 22.8 4.8-3.3-6.6-34.1-28.2-8.4z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M180 262.3l.3-9.3-2.5-2.2h-37.7l-2.4 2.2.2 9.3-31.5-14.9 11 9 22.3 15.5h38.3l22.4-15.5 11-9-31.4 14.9z" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M177.6 230.9l-4.8-3.3h-27.5l-4.8 3.3-2.6 22.1 2.4-2.2h37.7l2.5 2.2-2.9-22.1z" fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M278.3 114.2l8.5-40.8-12.7-37.9-96.2 71.4 37 31.3 52.3 15.3 11.6-13.5-5-3.6 7.9-7.2-6.1-4.7 7.9-6 -5.2-4.3zM31.8 73.4l8.5 40.8-5.4 4 8 6-6 4.7 7.9 7.2-5 3.6 11.5 13.5 52.3-15.3 37-31.3-96.2-71.4-12.6 37.9z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M266.9 153.5l-52.3-15.3 15.8 23.9-23.6 46.1 31.1-.9h46.5l-17.5-53.8zM103.6 138.2l-52.3 15.3-17.4 53.8h46.4l31.1.9-23.6-46.1 15.8-23.9zM174.3 164.6l3.3-57.5 15.1-40.8h-67.2l15 40.8 3.5 57.5 1.2 18.2.1 44.8h27.5l.2-44.8 1.3-18.2z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WalletConnectIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 300 185" fill="none">
      <path d="M61.4 36.3C114.2-14.8 199.8-14.8 252.6 36.3L258.9 42.5C261.6 45.1 261.6 49.4 258.9 52L239.3 70.9C238 72.2 235.9 72.2 234.6 70.9L225.9 62.4C189.4 26.8 110.6 26.8 74.1 62.4L64.8 71.4C63.5 72.7 61.4 72.7 60.1 71.4L40.5 52.5C37.8 49.9 37.8 45.6 40.5 43L61.4 36.3Z" fill="#3B99FC"/>
      <path d="M280.3 67.8L297.8 85C300.5 87.6 300.5 91.9 297.8 94.5L221.4 168.7C218.7 171.3 214.5 171.3 211.8 168.7L157.1 115.4C156.4 114.8 155.4 114.8 154.7 115.4L100 168.7C97.3 171.3 93.1 171.3 90.4 168.7L13.8 94.3C11.1 91.7 11.1 87.4 13.8 84.8L31.3 67.6C34 65 38.2 65 40.9 67.6L95.6 120.9C96.3 121.5 97.3 121.5 98 120.9L152.7 67.6C155.4 65 159.6 65 162.3 67.6L217 120.9C217.7 121.5 218.7 121.5 219.4 120.9L274.1 67.6C276.8 65.2 280.3 65.2 280.3 67.8Z" fill="#3B99FC"/>
    </svg>
  );
}

function CoinbaseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 1024 1024" fill="none">
      <rect width="1024" height="1024" rx="200" fill="#0052FF"/>
      <path d="M512 160C316.8 160 160 316.8 160 512s156.8 352 352 352 352-156.8 352-352S707.2 160 512 160zm-88 464h176c8.8 0 16-7.2 16-16V376c0-8.8-7.2-16-16-16H424c-8.8 0-16 7.2-16 16v232c0 8.8 7.2 16 16 16z" fill="white"/>
    </svg>
  );
}
