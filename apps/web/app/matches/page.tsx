"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Zap, MessageCircle, ChevronLeft } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";
import ClickSpark from "@/components/ClickSpark";
import { useAuth } from "@/lib/store";
import { getMatches, getMessages } from "@/lib/api";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://baebackend-production.up.railway.app";

interface Match {
  id:                string;
  matched_at:        string;
  partner_id:        string;
  username:          string;
  display_name:      string;
  avatar_ipfs_hash?: string;
  is_verified?:      boolean;
  last_message?:     string;
  last_message_at?:  string;
  compatibility_score?: number;
}

interface Message {
  id:        string;
  sender_id: string;
  content:   string;
  sent_at:   string;
}

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = [...(name || "")].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, hsl(${hue},70%,60%), hsl(${(hue + 60) % 360},70%,50%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.36, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

function ChatWindow({ match, userId, jwt, onBack }: { match: Match; userId: string; jwt: string; onBack: () => void }) {
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [socket,   setSocket]   = useState<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMessages(match.id)
      .then((data: any) => setMessages(data.messages ?? []))
      .catch(() => {});

    const s = io(API_URL, { auth: { token: jwt }, transports: ["websocket"] });
    s.emit("join:match", match.id);
    s.on("connect", () => setIsPartnerOnline(true));
    s.on("disconnect", () => setIsPartnerOnline(false));
    s.on("message:new", (msg: Message) => setMessages((prev) => {
      const isDupe = prev.some(
        (m) => m.id.startsWith("opt-") && m.sender_id === msg.sender_id && m.content === msg.content
      );
      if (isDupe) return prev.map((m) => (m.id.startsWith("opt-") && m.content === msg.content && m.sender_id === msg.sender_id ? msg : m));
      return [...prev, msg];
    }));
    s.on("messages:read", () => {});
    setSocket(s);
    return () => { s.disconnect(); };
  }, [match.id, jwt]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMsg() {
    const text = input.trim();
    if (!text || !socket) return;
    const optimistic: Message = {
      id:        `opt-${Date.now()}`,
      sender_id: userId,
      content:   text,
      sent_at:   new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    socket.emit("send:message", { matchId: match.id, content: text });
  }

  const name = match.display_name || match.username || "Match";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 148px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "0.25rem", display: "flex" }}>
          <ChevronLeft size={20} />
        </button>
        <Avatar name={name} size={36} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            {name}{match.is_verified && <span style={{ marginLeft: 4, color: "#3b82f6", fontSize: "0.8rem" }}>✓</span>}
          </div>
          <div style={{ fontSize: "0.7rem", color: isPartnerOnline ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
            {isPartnerOnline ? "● Connected" : "○ Offline"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.875rem", padding: "2rem" }}>
            Say hi to {name} 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%", borderRadius: isMine ? "1.25rem 1.25rem 0.25rem 1.25rem" : "1.25rem 1.25rem 1.25rem 0.25rem",
                padding: "0.625rem 1rem", fontSize: "0.9rem", lineHeight: 1.5,
                background: isMine
                  ? "linear-gradient(135deg, #ff2d78, #c9005a)"
                  : "rgba(255,255,255,0.07)",
                color: "#fff",
                border: isMine ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "0.75rem" }}>
        <input
          className="input-glass"
          placeholder={`Message ${name}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }}}
          style={{ flex: 1 }}
        />
        <ClickSpark sparkColor="#ff2d78" sparkCount={10} sparkRadius={20}>
          <button onClick={sendMsg} disabled={!input.trim()} className="btn-pink"
            style={{ padding: "0.75rem", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", opacity: input.trim() ? 1 : 0.4 }}>
            <Send size={16} />
          </button>
        </ClickSpark>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { jwt, user, login } = useAuth();
  const [matches,  setMatches]  = useState<Match[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Match | null>(null);

  useEffect(() => {
    if (!jwt) { setLoading(false); return; }
    getMatches()
      .then((data: any) => setMatches(data.matches ?? []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [jwt]);

  if (!jwt) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: "1.25rem", textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "4rem", filter: "drop-shadow(0 0 24px rgba(255,45,120,0.4))" }}>💬</div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Your Matches</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", maxWidth: 320 }}>Connect your wallet to view and chat with your matches.</p>
        <ClickSpark sparkColor="#ff2d78" sparkCount={10} sparkRadius={24}>
          <button onClick={login} className="btn-pink flex items-center gap-2">
            <Zap size={16} /> Connect Wallet
          </button>
        </ClickSpark>
      </div>
    );
  }

  const userId = (user as any)?.id ?? "";

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "1rem" }}>
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div key="chat" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
            <ChatWindow match={selected} userId={userId} jwt={jwt} onBack={() => setSelected(null)} />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Matches <span className="gradient-text">💘</span></h1>
              {matches.length > 0 && <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)" }}>{matches.length} match{matches.length !== 1 ? "es" : ""}</span>}
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(255,45,120,0.3)", borderTop: "3px solid #ff2d78", animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : matches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                <MessageCircle size={48} style={{ margin: "0 auto 1rem", color: "rgba(255,255,255,0.2)" }} />
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>No matches yet</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>Like profiles on the Discover page to get matches</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {matches.map((m, i) => {
                  const name = m.display_name || m.username || "Match";
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{ x: 4 }}
                    >
                      <SpotlightCard
                        spotlightColor="rgba(255, 45, 120, 0.12)"
                        className="!py-0 !px-0 cursor-pointer w-full"
                      >
                        <button
                          onClick={() => setSelected(m)}
                          style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
                        >
                          {m.avatar_ipfs_hash
                            ? <img src={`https://gateway.pinata.cloud/ipfs/${m.avatar_ipfs_hash}`} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            : <Avatar name={name} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: 4 }}>
                              {name}
                              {m.is_verified && <span style={{ color: "#3b82f6", fontSize: "0.7rem" }}>✓</span>}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {m.last_message ?? "Tap to start chatting 💬"}
                            </div>
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                            {m.last_message_at ? timeAgo(m.last_message_at) : timeAgo(m.matched_at)}
                          </div>
                        </button>
                      </SpotlightCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
