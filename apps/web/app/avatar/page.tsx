"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, Upload, Sparkles, Download, RefreshCw, CheckCircle, Loader2, Zap, Globe, User } from "lucide-react";
import { useAuth } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────

type Style = "Comic" | "Anime";
type Step  = "capture" | "style" | "generating" | "result";

interface GenStep { label: string; done: boolean; active: boolean }

const STYLES: { id: Style; label: string; emoji: string; desc: string }[] = [
  { id: "Comic", label: "Cosmic Comic", emoji: "🌌", desc: "Bold ink outlines, deep-space galaxy, neon glow" },
  { id: "Anime", label: "Anime",        emoji: "🎌", desc: "Vibrant cel-shading, expressive manga style"     },
];

const API_URL = (typeof window !== "undefined" && (window as Window & { NEXT_PUBLIC_API_URL?: string }).NEXT_PUBLIC_API_URL)
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "https://baebackend-production.up.railway.app";

const FRAMES_TO_CAPTURE = 5;

// ─── Generation steps shown during loading ────────────────────────────────────

const BASE_STEPS = [
  "Selecting best frame from 5 captures",
  "Detecting ethnic region & skin tone",
  "Analysing facial features",
  "Building personalised AI prompt",
  "Generating cosmic NFT portrait via AI",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AvatarPage() {
  const { jwt } = useAuth();

  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);

  const [mounted,      setMounted]      = useState(false);
  const [step,          setStep]          = useState<Step>("capture");
  const [camActive,     setCamActive]     = useState(false);
  const [capturing,     setCapturing]     = useState(false);
  const [countdown,     setCountdown]     = useState<number | null>(null);
  const [capturedBlobs, setCapturedBlobs] = useState<Blob[]>([]);
  const [previewUrls,   setPreviewUrls]   = useState<string[]>([]);
  const [style,         setStyle]         = useState<Style>("Comic");
  const [genSteps,      setGenSteps]      = useState<GenStep[]>([]);
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [provider,      setProvider]      = useState<string>("");
  const [facingMode,    setFacingMode]    = useState<"user" | "environment">("user");

  // Mark as mounted after hydration
  useEffect(() => setMounted(true), []);

  // Stop camera on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  // Show loading skeleton until mounted
  if (!mounted) {
    return <LoadingSkeleton />;
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamActive(true);
      setError(null);
    } catch {
      setError("Camera access denied. Please allow camera permissions or upload a photo.");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamActive(false);
  }, []);

  // Capture a single frame blob from the live video
  const captureOneFrame = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) { resolve(null); return; }
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.92);
    });
  }, []);

  // Capture FRAMES_TO_CAPTURE frames with countdown
  const captureAllFrames = useCallback(async () => {
    setCapturing(true);
    const blobs: Blob[] = [];
    const urls:  string[] = [];
    for (let i = FRAMES_TO_CAPTURE; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 600));
      const blob = await captureOneFrame();
      if (blob) {
        blobs.push(blob);
        urls.push(URL.createObjectURL(blob));
      }
    }
    setCountdown(null);
    stopCamera();
    setCapturedBlobs(blobs);
    setPreviewUrls(urls);
    setCapturing(false);
    setStep("style");
  }, [captureOneFrame, stopCamera]);

  // Single file upload → treated as 1 frame
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedBlobs([file]);
    setPreviewUrls([url]);
    stopCamera();
    setStep("style");
  }, [stopCamera]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setCapturedBlobs([file]);
    setPreviewUrls([url]);
    setStep("style");
  }, []);

  // ── Generation ──────────────────────────────────────────────────────────────

  const generate = useCallback(async () => {
    if (capturedBlobs.length === 0) return;
    setError(null);
    setStep("generating");

    // Animate progress steps
    const steps: GenStep[] = BASE_STEPS.map((label, i) => ({ label, done: false, active: i === 0 }));
    setGenSteps([...steps]);

    const advanceStep = (i: number) => {
      setGenSteps(prev => prev.map((s, idx) => ({
        ...s,
        done:   idx < i,
        active: idx === i,
      })));
    };

    // Animate steps while API works
    const timers: ReturnType<typeof setTimeout>[] = [];
    BASE_STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => advanceStep(i), i * 7000));
    });

    try {
      // Send all frames as frame0, frame1, ... (matching backend expectation)
      const form = new FormData();
      capturedBlobs.forEach((blob, i) => form.append(`frame${i}`, blob, `frame${i}.jpg`));
      form.append("style", style);

      // Auth: prefer wallet JWT, fall back to localStorage token (from video-kyc-test.html flow)
      const token = jwt ?? (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      let res: Response;
      try {
        res = await fetch(`${API_URL}/users/me/avatar/kyc-frames`, {
          method: "POST",
          headers,
          body:   form,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (fetchErr instanceof Error && fetchErr.name === "AbortError")
          throw new Error("Generation timed out (>2 min). Please try again.");
        throw fetchErr;
      }
      clearTimeout(timeout);
      timers.forEach(t => clearTimeout(t));

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 401) throw new Error("Please connect your wallet to generate an avatar.");
        if (res.status === 429) throw new Error(body.error ?? "Daily limit reached. Try again tomorrow.");
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { avatarUrl?: string; provider?: string };

      setGenSteps(prev => prev.map(s => ({ ...s, done: true, active: false })));
      setAvatarUrl(data.avatarUrl ?? null);
      setProvider(data.provider ?? "AI");
      setStep("result");

    } catch (err) {
      timers.forEach(t => clearTimeout(t));
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
      setStep("style");
    }
  }, [capturedBlobs, style, jwt]);

  const reset = useCallback(() => {
    setCapturedBlobs([]);
    setPreviewUrls([]);
    setAvatarUrl(null);
    setError(null);
    setProvider("");
    setStep("capture");
  }, []);

  const downloadAvatar = useCallback(() => {
    if (!avatarUrl) return;
    const a = document.createElement("a");
    a.href = avatarUrl;
    a.download = "bae4u-avatar.png";
    a.click();
  }, [avatarUrl]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="aurora-bg min-h-screen" style={{ background: "#09090b" }}>

      {/* ── Hero header ────────────────────────────────────────── */}
      <div style={{ textAlign: "center", padding: "3rem 1.5rem 2rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}
          className="badge-pink">
          <Sparkles size={12} />
          AI Avatar Generator
        </div>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 900, lineHeight: 1.1, marginBottom: "0.75rem" }}>
          <span className="gradient-text">Your Cosmic</span>
          <br />NFT Portrait
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05rem", maxWidth: 480, margin: "0 auto" }}>
          We detect your ethnic region, skin tone &amp; facial features — then generate a stunning cosmic avatar that&apos;s uniquely you.
        </p>
      </div>

      {/* ── Step indicator ─────────────────────────────────────── */}
      <StepIndicator current={step} />

      {/* ── Main content ───────────────────────────────────────── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem 1.5rem 4rem" }}>

        {error && (
          <div style={{ background: "rgba(255,45,120,0.12)", border: "1px solid rgba(255,45,120,0.3)", borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1.25rem", color: "#ff7eb3", fontSize: "0.9rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP: capture */}
        {step === "capture" && (
          <CapturePanel
            videoRef={videoRef}
            canvasRef={canvasRef}
            fileInputRef={fileInputRef}
            camActive={camActive}
            capturing={capturing}
            countdown={countdown}
            facingMode={facingMode}
            onStartCamera={startCamera}
            onCapture={captureAllFrames}
            onStopCamera={stopCamera}
            onFileChange={handleFileUpload}
            onDrop={handleDrop}
            onFlip={() => setFacingMode((f: "user" | "environment") => f === "user" ? "environment" : "user")}
          />
        )}

        {/* STEP: style */}
        {step === "style" && previewUrls.length > 0 && (
          <StylePanel
            previewUrls={previewUrls}
            selectedStyle={style}
            onSelectStyle={setStyle}
            onGenerate={generate}
            onRetake={reset}
            hasJwt={!!jwt}
          />
        )}

        {/* STEP: generating */}
        {step === "generating" && (
          <GeneratingPanel steps={genSteps} />
        )}

        {/* STEP: result */}
        {step === "result" && avatarUrl && (
          <ResultPanel
            avatarUrl={avatarUrl}
            provider={provider}
            previewUrl={previewUrls[0] ?? null}
            onDownload={downloadAvatar}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "capture",    label: "Capture"  },
    { id: "style",      label: "Style"    },
    { id: "generating", label: "Generate" },
    { id: "result",     label: "Result"   },
  ];
  const idx = steps.findIndex(s => s.id === current);

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "0", marginBottom: "1.5rem", padding: "0 1.5rem" }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700,
              background: i < idx ? "linear-gradient(135deg,#ff2d78,#3b82f6)"
                : i === idx ? "linear-gradient(135deg,#ff2d78,#e91e8c)"
                : "rgba(255,255,255,0.06)",
              border: i === idx ? "2px solid rgba(255,45,120,0.6)" : "2px solid transparent",
              color: i <= idx ? "#fff" : "rgba(255,255,255,0.25)",
              boxShadow: i === idx ? "0 0 16px rgba(255,45,120,0.5)" : "none",
              transition: "all 0.3s",
            }}>
              {i < idx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: i <= idx ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: "4rem", height: 2, background: i < idx ? "linear-gradient(90deg,#ff2d78,#3b82f6)" : "rgba(255,255,255,0.07)", margin: "0 0.25rem", marginBottom: "1.2rem", transition: "background 0.4s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Capture panel ────────────────────────────────────────────────────────────

interface CapturePanelProps {
  videoRef:     React.RefObject<HTMLVideoElement | null>;
  canvasRef:    React.RefObject<HTMLCanvasElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  camActive:    boolean;
  capturing:    boolean;
  countdown:    number | null;
  facingMode:   "user" | "environment";
  onStartCamera: () => void;
  onCapture:    () => void;
  onStopCamera: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop:       (e: React.DragEvent) => void;
  onFlip:       () => void;
}

function CapturePanel({ videoRef, canvasRef, fileInputRef, camActive, capturing, countdown, onStartCamera, onCapture, onStopCamera, onFileChange, onDrop, onFlip }: CapturePanelProps) {
  return (
    <div>
      {/* Camera / upload card */}
      <div className="glass" style={{ borderRadius: "1.5rem", overflow: "hidden", position: "relative", marginBottom: "1.25rem" }}>

        {camActive ? (
          <>
            {/* Live preview */}
            <div style={{ position: "relative", background: "#000", aspectRatio: "4/3" }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: "block" }} />

              {/* Face guide overlay */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: "55%", aspectRatio: "3/4", border: "2px dashed rgba(255,45,120,0.6)", borderRadius: "50% 50% 45% 45%", boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)" }} />
              </div>

              {/* Countdown overlay */}
              {countdown !== null && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ fontSize: "6rem", fontWeight: 900, color: "#fff", textShadow: "0 0 30px rgba(255,45,120,0.8), 0 2px 8px rgba(0,0,0,0.8)" }}>{countdown}</span>
                </div>
              )}

              {/* Guide text */}
              {!capturing && (
                <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center" }}>
                  <span style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", borderRadius: "9999px", padding: "0.3rem 0.9rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
                    Centre your face · We capture {FRAMES_TO_CAPTURE} frames
                  </span>
                </div>
              )}

              {/* Flip button */}
              <button onClick={onFlip}
                style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "9999px", padding: "0.4rem 0.6rem", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>
                🔄
              </button>
            </div>

            {/* Actions */}
            <div style={{ padding: "1.25rem", display: "flex", gap: "0.75rem" }}>
              <button onClick={onCapture} disabled={capturing} className="btn-pink" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.875rem", opacity: capturing ? 0.6 : 1 }}>
                {capturing
                  ? <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> Capturing {FRAMES_TO_CAPTURE} frames...</>
                  : <><Camera size={18} /> Capture {FRAMES_TO_CAPTURE} Frames</>}
              </button>
              {!capturing && (
                <button onClick={onStopCamera}
                  style={{ padding: "0.875rem 1.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9999px", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
                  Cancel
                </button>
              )}
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </>
        ) : (
          /* Drop zone */
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            style={{ padding: "3rem 2rem", textAlign: "center", cursor: "pointer" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,rgba(255,45,120,0.2),rgba(59,130,246,0.2))", border: "1px solid rgba(255,45,120,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
              <Upload size={28} style={{ color: "#ff7eb3" }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.375rem" }}>Drop your photo here</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>PNG, JPG up to 10 MB</p>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
      </div>

      {/* Or use camera */}
      {!camActive && (
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={onStartCamera} className="btn-pink" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.875rem" }}>
            <Camera size={17} /> Open Camera
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.875rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9999px", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: "0.9rem" }}>
            <Upload size={17} /> Upload Photo
          </button>
        </div>
      )}

      {/* Info chips */}
      <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
        {[
          { icon: Globe,  text: "Ethnic region detected" },
          { icon: User,   text: "Facial features analysed" },
          { icon: Zap,    text: "Personalised AI prompt" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9999px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>
            <Icon size={12} style={{ color: "#ff7eb3" }} />
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Style panel ──────────────────────────────────────────────────────────────

function StylePanel({ previewUrls, selectedStyle, onSelectStyle, onGenerate, onRetake, hasJwt }: {
  previewUrls:   string[];
  selectedStyle: Style;
  onSelectStyle: (s: Style) => void;
  onGenerate:    () => void;
  onRetake:      () => void;
  hasJwt:        boolean;
}) {
  return (
    <div>
      {/* Frame previews + retake */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <p style={{ fontWeight: 700 }}>📸 {previewUrls.length} frame{previewUrls.length > 1 ? "s" : ""} captured ✓</p>
          <button onClick={onRetake} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "9999px", padding: "0.35rem 0.875rem", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>
            <RefreshCw size={12} /> Retake
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {previewUrls.map((url, i) => (
            <div key={i} style={{ position: "relative", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`frame ${i}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: "0.625rem", border: i === 0 ? "2px solid rgba(255,45,120,0.5)" : "1px solid rgba(255,255,255,0.1)" }} />
              {i === 0 && <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", fontSize: "0.55rem", color: "#ff7eb3", fontWeight: 700 }}>BEST</div>}
            </div>
          ))}
        </div>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", marginTop: "0.5rem" }}>Best frame auto-selected · AI detects ethnic region, skin tone &amp; features</p>
      </div>

      {/* Style grid — 2 styles only */}
      <p style={{ fontWeight: 700, marginBottom: "1rem", color: "rgba(255,255,255,0.8)" }}>Choose your avatar style</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.75rem" }}>
        {STYLES.map(s => (
          <button key={s.id} onClick={() => onSelectStyle(s.id)}
            style={{
              padding: "1rem",
              borderRadius: "1rem",
              cursor: "pointer",
              textAlign: "left",
              background: selectedStyle === s.id ? "linear-gradient(135deg,rgba(255,45,120,0.18),rgba(59,130,246,0.12))" : "rgba(255,255,255,0.03)",
              border: selectedStyle === s.id ? "1.5px solid rgba(255,45,120,0.5)" : "1.5px solid rgba(255,255,255,0.07)",
              boxShadow: selectedStyle === s.id ? "0 0 20px rgba(255,45,120,0.2)" : "none",
              transition: "all 0.2s",
            }}>
            <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{s.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.2rem", color: selectedStyle === s.id ? "#ff7eb3" : "#fff" }}>{s.label}</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{s.desc}</div>
          </button>
        ))}
      </div>

      {!hasJwt && (
        <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "rgba(147,197,253,0.9)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          💡 Connect your wallet (top right) to save your avatar to your profile.
        </div>
      )}

      <button onClick={onGenerate} className="btn-pink" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.625rem", padding: "1.1rem", fontSize: "1rem" }}>
        <Sparkles size={18} />
        Generate My Avatar
      </button>
    </div>
  );
}

// ─── Generating panel ─────────────────────────────────────────────────────────

function GeneratingPanel({ steps }: { steps: GenStep[] }) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Pulsing cosmic orb */}
      <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 2.5rem" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,45,120,0.35) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)", animation: "orb-pulse 2s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: "20%", borderRadius: "50%", background: "linear-gradient(135deg,#ff2d78,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(255,45,120,0.6)" }}>
          <Loader2 size={36} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      </div>

      <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.5rem" }}>Creating your avatar</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2rem", fontSize: "0.9rem" }}>This takes 15–45 seconds — hang tight ✨</p>

      <div className="glass" style={{ borderRadius: "1.25rem", padding: "1.5rem", textAlign: "left" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.625rem 0", borderBottom: i < steps.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: s.done ? "linear-gradient(135deg,#ff2d78,#3b82f6)" : s.active ? "rgba(255,45,120,0.2)" : "rgba(255,255,255,0.05)",
              border: s.active ? "1.5px solid rgba(255,45,120,0.5)" : "1.5px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: s.active ? "0 0 12px rgba(255,45,120,0.4)" : "none",
              transition: "all 0.3s",
            }}>
              {s.done   ? <CheckCircle size={14} color="#fff" />
              : s.active ? <Loader2 size={13} color="#ff7eb3" style={{ animation: "spin 1s linear infinite" }} />
              : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />}
            </div>
            <span style={{ fontSize: "0.9rem", color: s.done ? "rgba(255,255,255,0.7)" : s.active ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: s.active ? 600 : 400, transition: "all 0.3s" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────

function ResultPanel({ avatarUrl, provider, previewUrl, onDownload, onReset }: {
  avatarUrl:  string;
  provider:   string;
  previewUrl: string | null;
  onDownload: () => void;
  onReset:    () => void;
}) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }} className="badge-pink">
          <CheckCircle size={12} /> Avatar generated
        </div>
        <h2 style={{ fontWeight: 900, fontSize: "1.75rem", marginBottom: "0.375rem" }}>Your cosmic portrait is ready ✨</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>via {provider}</p>
      </div>

      {/* Side-by-side comparison */}
      <div style={{ display: "grid", gridTemplateColumns: previewUrl ? "1fr 1fr" : "1fr", gap: "1rem", marginBottom: "1.75rem" }}>
        {previewUrl && (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}>
              <span style={{ background: "rgba(0,0,0,0.65)", borderRadius: "9999px", padding: "0.2rem 0.6rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>Original</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Original" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
        )}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}>
            <span className="badge-pink" style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem" }}>✨ AI Avatar</span>
          </div>
          {/* Neon glow ring */}
          <div style={{ position: "absolute", inset: -3, borderRadius: "calc(1.25rem + 3px)", background: "linear-gradient(135deg,#ff2d78,#3b82f6)", zIndex: -1, filter: "blur(8px)", opacity: 0.6 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="Generated Avatar" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "1.25rem", border: "2px solid rgba(255,45,120,0.5)", position: "relative", display: "block" }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <button onClick={onDownload} className="btn-pink" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.9rem" }}>
          <Download size={16} /> Download
        </button>
        <button onClick={onReset}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.9rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9999px", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: "0.9rem" }}>
          <RefreshCw size={16} /> New Avatar
        </button>
      </div>

      {/* Share prompt */}
      <div className="glass" style={{ borderRadius: "1rem", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <div style={{ fontSize: "1.5rem" }}>🌌</div>
        <div>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.15rem" }}>Set as your Bae4U profile</p>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>Go to your profile page to upload this as your avatar and show it off to matches.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="aurora-bg" style={{ background: "#09090b", minHeight: "100vh", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Hero skeleton */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 120, height: 24, background: "rgba(255,255,255,0.08)", borderRadius: "9999px", margin: "0 auto 1rem" }} />
          <div style={{ width: 280, height: 48, background: "rgba(255,255,255,0.06)", borderRadius: "0.5rem", margin: "0 auto 0.5rem" }} />
          <div style={{ width: 200, height: 16, background: "rgba(255,255,255,0.04)", borderRadius: "0.25rem", margin: "0 auto" }} />
        </div>

        {/* Card skeleton */}
        <div className="glass" style={{ borderRadius: "1.5rem", padding: "2rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ aspectRatio: "4/3", background: "rgba(255,255,255,0.04)", borderRadius: "1rem", marginBottom: "1.5rem" }} />
          <div style={{ width: "100%", height: 48, background: "rgba(255,255,255,0.06)", borderRadius: "0.75rem" }} />
        </div>
      </div>
    </div>
  );
}
