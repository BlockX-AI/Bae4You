"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/store";
import { getJwt } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://baebackend-production.up.railway.app";

// ─── Style presets ─────────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  {
    id: "comic",
    name: "Cosmic Comic",
    emoji: "💥",
    color: "#FF006E",
    bg: "linear-gradient(135deg,#FF006E22,#FFBE0B22)",
    border: "#FF006E",
    prompt: "pop art comic book portrait, bold black ink outlines, sharp crisp halftone dot shading pattern, BACKGROUND: bright golden yellow starburst rays radiating outward on hot pink background, retro 1960s comic book style, Roy Lichtenstein inspired, ben-day dots, flat bold colors, dramatic face lighting, thick ink lines, speech-bubble energy, face filling 65% of frame width, eyes at upper third, close-up portrait crop, high contrast shadows, screen-print color separation, professional comic book illustration, NFT avatar art, ultra high resolution, sharp details, vibrant saturated colors, crisp clean lines",
    negative: "photorealistic, photograph, 3d render, blurry, watermark, text, logo, dark background, dark gloomy, space background, cosmic background, sad, ugly, extra limbs, bad anatomy, low quality, monochrome, grey, washed out, anime, cartoon simple",
  },
  {
    id: "anime",
    name: "Anime",
    emoji: "✨",
    color: "#8B5CF6",
    bg: "linear-gradient(135deg,#8B5CF622,#EC489922)",
    border: "#8B5CF6",
    prompt: "ultra high quality anime portrait, detailed manga illustration, vibrant cel shading, expressive large anime eyes with detailed iris and catchlight, warm amber orange gradient background with glowing light bloom, detailed hair with individual strands and highlight sheen, clean smooth skin with subtle blush, warm confident smile, bright expression, face filling 65% of frame width, eyes at upper third, close-up portrait crop, dynamic lighting from above, rim light glow, professional anime studio quality, Makoto Shinkai style lighting, crisp sharp lines, saturated colors, kawaii but mature aesthetic, NFT avatar art, ultra high resolution, sharp details, vibrant saturated colors, clean crisp rendering",
    negative: "photorealistic, photograph, western cartoon, chibi too simple, blurry, watermark, text, low quality, bad anatomy, ugly, dark gloomy background, 3d render, overexposed",
  },
  {
    id: "spiderverse",
    name: "Spider-Verse",
    emoji: "🕷️",
    color: "#E63946",
    bg: "linear-gradient(135deg,#E6394622,#FFD60A22)",
    border: "#E63946",
    prompt: "Spider-Verse Into the Spider-Verse comic illustration, halftone mosaic background, bold ink outlines, colorful mosaic tiles in warm orange red gold behind figure, graphic novel panel art, pop art energy, strong color contrast, warm confident smile, charismatic expression, face filling 65% of frame, close-up portrait crop, eyes at upper third of image, Sony animation quality, Into the Spider-Verse aesthetic, NFT avatar, ultra high resolution, sharp details, vibrant saturated colors, clean crisp rendering",
    negative: "photorealistic, 3d render, photograph, blurry, watermark, ugly, bad anatomy, dark gloomy, pixel art, 8-bit, retro game sprite, low quality",
  },
  {
    id: "pixar",
    name: "Pixar 3D",
    emoji: "🎬",
    color: "#3B82F6",
    bg: "linear-gradient(135deg,#3B82F622,#A855F722)",
    border: "#3B82F6",
    prompt: "Pixar Disney animated movie character portrait, stylized 3D cartoon illustration, smooth rounded stylized features, NOT photorealistic, animated film quality, warm studio lighting, vivid gradient background purple and orange glow, warm confident smile, bright cheerful expression, face filling 65% of frame width, close-up portrait crop, Pixar Inside Out character quality, Disney Encanto art style, NFT avatar, ultra high resolution, sharp details, vibrant saturated colors, clean crisp rendering",
    negative: "photorealistic, photograph, blurry, watermark, ugly, bad anatomy, dark gloomy, CGI headshot, octane render, hyper realistic skin, stock photo, low quality",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    emoji: "🤖",
    color: "#00F5FF",
    bg: "linear-gradient(135deg,#00F5FF22,#FF006E22)",
    border: "#00F5FF",
    prompt: "cyberpunk neon portrait illustration, electric blue and hot pink neon glow, holographic visor, futuristic streetwear outfit, dark city background with neon signs and rain reflections, bold cel shading, manga linework, glowing circuit pattern tattoos, confident smirk, dynamic rim lighting, ultra-detailed digital art, NFT avatar art, ultra high resolution, sharp details, vibrant neon colors",
    negative: "photorealistic, photograph, blurry, watermark, ugly, bad anatomy, low quality, dark muddy colors, bland background",
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    emoji: "🌸",
    color: "#FF71CE",
    bg: "linear-gradient(135deg,#FF71CE22,#01CDFE22)",
    border: "#FF71CE",
    prompt: "vaporwave aesthetic portrait illustration, pastel pink purple blue gradient background, retro 80s synthwave vibes, bold graphic art style, glitch art accents, cherry blossom petals, cool sunglasses, stylized bold outlines, flat color blocks, dreamy soft glow, TikTok viral aesthetic, Gen-Z favorite, NFT avatar art, ultra high resolution, vibrant pastel saturated colors, crisp clean rendering",
    negative: "photorealistic, photograph, blurry, watermark, ugly, bad anatomy, low quality, dark gloomy, boring plain background",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PromptLabPage() {
  const { jwt } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
  const [model, setModel] = useState<"cloudflare" | "huggingface">("cloudflare");
  const [prompt, setPrompt] = useState(STYLE_PRESETS[0].prompt);
  const [negativePrompt, setNegativePrompt] = useState(STYLE_PRESETS[0].negative);
  const [steps, setSteps] = useState(25);
  const [guidance, setGuidance] = useState(7.5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{ imageBase64: string; provider: string; prompt: string; style: string; timestamp: number }[]>([]);

  useEffect(() => { setMounted(true); }, []);

  const selectStyle = useCallback((style: typeof STYLE_PRESETS[0]) => {
    setSelectedStyle(style);
    setPrompt(style.prompt);
    setNegativePrompt(style.negative);
    setError("");
  }, []);

  const generate = useCallback(async () => {
    const token = jwt || getJwt();
    if (!token) {
      setError("Login required. Please connect your wallet first.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/users/avatar/prompt-lab`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, negativePrompt, model, steps, guidance }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResults(prev => [{
        imageBase64: data.imageBase64,
        provider: data.provider,
        prompt: data.prompt,
        style: selectedStyle.name,
        timestamp: Date.now(),
      }, ...prev].slice(0, 12));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [jwt, prompt, negativePrompt, model, steps, guidance, selectedStyle]);

  const downloadImage = useCallback((base64: string, style: string) => {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `bae4u-${style.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    a.click();
  }, []);

  if (!mounted) return <LoadingSkeleton />;

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", paddingBottom: "4rem" }}>
      {/* ── Header ── */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.75rem" }}>🧪</span>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", margin: 0 }}>Avatar Prompt Lab</h1>
            <span style={{ background: "linear-gradient(90deg,#FF006E,#8B5CF6)", borderRadius: "9999px", padding: "0.2rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>BETA</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", margin: 0 }}>
            Test prompts across models · Find what Gen-Z loves · Iterate fast
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem", display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem" }}>

        {/* ── Left Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Style Presets */}
          <div className="glass" style={{ borderRadius: "1rem", padding: "1rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.75rem" }}>Style Preset</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {STYLE_PRESETS.map(style => (
                <button
                  key={style.id}
                  onClick={() => selectStyle(style)}
                  style={{
                    background: selectedStyle.id === style.id ? style.bg : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${selectedStyle.id === style.id ? style.border : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "0.75rem",
                    padding: "0.6rem 0.5rem",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: "1.25rem" }}>{style.emoji}</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: selectedStyle.id === style.id ? style.color : "rgba(255,255,255,0.7)", marginTop: "0.2rem" }}>{style.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selector */}
          <div className="glass" style={{ borderRadius: "1rem", padding: "1rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.75rem" }}>AI Model</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {([
                { id: "cloudflare", label: "Cloudflare", sub: "SDXL Lightning · Free", icon: "☁️", color: "#F6821F" },
                { id: "huggingface", label: "HuggingFace", sub: "FLUX Schnell · Free", icon: "🤗", color: "#FFD21E" },
              ] as const).map(m => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  style={{
                    background: model === m.id ? `${m.color}18` : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${model === m.id ? m.color : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "0.75rem",
                    padding: "0.75rem 0.5rem",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: "1.4rem" }}>{m.icon}</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: model === m.id ? m.color : "rgba(255,255,255,0.8)", marginTop: "0.2rem" }}>{m.label}</div>
                  <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginTop: "0.1rem" }}>{m.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Settings */}
          <div className="glass" style={{ borderRadius: "1rem", padding: "1rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.75rem" }}>Quality Settings</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>Steps</span>
                  <span style={{ color: "#FF006E", fontSize: "0.8rem", fontWeight: 700 }}>{steps}</span>
                </div>
                <input type="range" min={4} max={50} value={steps} onChange={e => setSteps(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#FF006E" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>4 (fast)</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>50 (best)</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>Guidance</span>
                  <span style={{ color: "#8B5CF6", fontSize: "0.8rem", fontWeight: 700 }}>{guidance}</span>
                </div>
                <input type="range" min={1} max={20} step={0.5} value={guidance} onChange={e => setGuidance(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#8B5CF6" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>1 (creative)</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>20 (strict)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generate}
            disabled={generating}
            style={{
              background: generating ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${selectedStyle.color}, #8B5CF6)`,
              border: "none",
              borderRadius: "0.875rem",
              padding: "1rem",
              color: "#fff",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: generating ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: generating ? 0.7 : 1,
              letterSpacing: "0.02em",
            }}
          >
            {generating ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Generating…
              </span>
            ) : `✨ Generate ${selectedStyle.name}`}
          </button>

          {error && (
            <div style={{ background: "#FF006E18", border: "1px solid #FF006E44", borderRadius: "0.75rem", padding: "0.75rem", color: "#FF006E", fontSize: "0.8rem" }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Prompt Editor */}
          <div className="glass" style={{ borderRadius: "1rem", padding: "1rem", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>✏️ Prompt (edit freely)</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.625rem",
                color: "#e5e7eb",
                fontSize: "0.8rem",
                padding: "0.75rem",
                resize: "vertical",
                outline: "none",
                fontFamily: "monospace",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0.75rem 0 0.5rem" }}>🚫 Negative Prompt</p>
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                background: "rgba(255,0,110,0.04)",
                border: "1px solid rgba(255,0,110,0.15)",
                borderRadius: "0.625rem",
                color: "#fca5a5",
                fontSize: "0.8rem",
                padding: "0.75rem",
                resize: "vertical",
                outline: "none",
                fontFamily: "monospace",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Results Grid */}
          {results.length === 0 && !generating && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", padding: "4rem 2rem", background: "rgba(255,255,255,0.02)", borderRadius: "1rem", border: "1px dashed rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "4rem" }}>🎨</span>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", textAlign: "center", margin: 0 }}>
                Pick a style, choose your model<br />and hit Generate to see your avatar
              </p>
            </div>
          )}

          {generating && results.length === 0 && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", padding: "4rem 2rem", background: "rgba(255,255,255,0.02)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: selectedStyle.color, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", margin: 0 }}>Generating with {model === "cloudflare" ? "☁️ Cloudflare" : "🤗 HuggingFace"}…</p>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                  Results ({results.length})
                </p>
                <button onClick={() => setResults([])} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "0.75rem" }}>
                  Clear all
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "1rem" }}>
                {results.map((r, i) => (
                  <div key={r.timestamp} className="glass" style={{ borderRadius: "1rem", overflow: "hidden", border: `1px solid ${i === 0 ? selectedStyle.color + "44" : "rgba(255,255,255,0.06)"}` }}>
                    <div style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${r.imageBase64}`}
                        alt={r.style}
                        style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
                      />
                      {i === 0 && (
                        <div style={{ position: "absolute", top: 8, left: 8, background: "linear-gradient(90deg,#FF006E,#8B5CF6)", borderRadius: "9999px", padding: "0.15rem 0.6rem", fontSize: "0.65rem", fontWeight: 800, color: "#fff" }}>
                          LATEST
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                        <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>{r.style}</span>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem" }}>{r.provider.split("/")[0] === "cloudflare" ? "☁️ CF" : "🤗 HF"}</span>
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", margin: "0 0 0.5rem", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {r.prompt.slice(0, 80)}…
                      </p>
                      <button
                        onClick={() => downloadImage(r.imageBase64, r.style)}
                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.4rem", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        ⬇ Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea:focus { border-color: rgba(255,255,255,0.25) !important; }
      `}</style>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", padding: "2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ width: 200, height: 32, background: "rgba(255,255,255,0.06)", borderRadius: "0.5rem", marginBottom: "1.5rem" }} />
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[120, 100, 130, 52].map((h, i) => (
              <div key={i} style={{ height: h, background: "rgba(255,255,255,0.04)", borderRadius: "1rem" }} />
            ))}
          </div>
          <div style={{ height: 400, background: "rgba(255,255,255,0.04)", borderRadius: "1rem" }} />
        </div>
      </div>
    </div>
  );
}
