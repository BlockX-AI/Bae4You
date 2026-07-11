"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/store";
import { api } from "@/lib/api";

interface Report {
  id:                 string;
  reason:             string;
  details:            string | null;
  status:             string;
  created_at:         string;
  reviewed_at:        string | null;
  reporter_id:        string;
  reported_id:        string;
  reporter_username:  string | null;
  reporter_name:      string | null;
  reported_username:  string | null;
  reported_name:      string | null;
  reported_status:    string;
  reported_total:     number | string;
}

const STATUSES = ["open", "reviewed", "actioned", "dismissed", "all"];

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminReportsPage() {
  const { jwt, user } = useAuth();
  const isAdmin = (user as { role?: string } | null)?.role === "admin";

  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus]   = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [busyId, setBusyId]   = useState<string | null>(null);

  const load = useCallback(() => {
    if (!jwt || !isAdmin) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    api
      .get<{ reports: Report[] }>(`/admin/reports?status=${status}`)
      .then((data) => setReports(data.reports ?? []))
      .catch((e) => setError(e.message ?? "Failed to load reports"))
      .finally(() => setLoading(false));
  }, [jwt, isAdmin, status]);

  useEffect(() => { load(); }, [load]);

  async function action(id: string, newStatus: string, suspendUser = false) {
    setBusyId(id);
    try {
      await api.put(`/admin/reports/${id}`, { status: newStatus, suspendUser });
      // Refresh the list so the actioned report drops out of the current filter.
      load();
    } catch (e) {
      setError((e as Error).message ?? "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!jwt || !isAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: "1rem", textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "3rem" }}>🔒</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Admin only</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", maxWidth: 340 }}>
          {jwt ? "This account does not have moderator access." : "Connect an admin account to review reports."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Moderation <span className="gradient-text">Reports</span></h1>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: "0.35rem 0.85rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600,
                cursor: "pointer", textTransform: "capitalize",
                border: status === s ? "none" : "1px solid rgba(255,255,255,0.14)",
                background: status === s ? "linear-gradient(135deg, #ff2d78, #c9005a)" : "transparent",
                color: status === s ? "#fff" : "rgba(255,255,255,0.6)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "0.75rem 1rem", borderRadius: "0.75rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(255,45,120,0.3)", borderTop: "3px solid #ff2d78", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div>
          <h3 style={{ fontWeight: 700, marginBottom: "0.35rem", color: "#fff" }}>Nothing here</h3>
          <p>No {status === "all" ? "" : status} reports.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reports.map((r) => {
            const reportedName = r.reported_name || r.reported_username || r.reported_id.slice(0, 8);
            const reporterName = r.reporter_name || r.reporter_username || r.reporter_id.slice(0, 8);
            const suspended = r.reported_status === "suspended";
            const busy = busyId === r.id;
            return (
              <div key={r.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1rem", padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700 }}>{reportedName}</span>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(255,45,120,0.15)", color: "#ff89b3" }}>
                        {r.reason}
                      </span>
                      {suspended && (
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
                          suspended
                        </span>
                      )}
                      <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
                        {Number(r.reported_total)} total report{Number(r.reported_total) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginTop: "0.35rem" }}>
                      by {reporterName} · {timeAgo(r.created_at)}
                    </div>
                    {r.details && (
                      <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", marginTop: "0.5rem", lineHeight: 1.5 }}>
                        “{r.details}”
                      </div>
                    )}
                  </div>

                  {r.status === "open" && (
                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                      <button
                        onClick={() => action(r.id, "dismissed")}
                        disabled={busy}
                        style={{ padding: "0.5rem 0.9rem", borderRadius: "0.6rem", fontSize: "0.8rem", fontWeight: 600, cursor: busy ? "default" : "pointer", border: "1px solid rgba(255,255,255,0.16)", background: "transparent", color: "rgba(255,255,255,0.7)", opacity: busy ? 0.5 : 1 }}
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => action(r.id, "actioned", true)}
                        disabled={busy}
                        style={{ padding: "0.5rem 0.9rem", borderRadius: "0.6rem", fontSize: "0.8rem", fontWeight: 700, cursor: busy ? "default" : "pointer", border: "none", background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#fff", opacity: busy ? 0.5 : 1 }}
                      >
                        Suspend user
                      </button>
                    </div>
                  )}
                  {r.status !== "open" && (
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", textTransform: "capitalize", flexShrink: 0 }}>
                      {r.status}{r.reviewed_at ? ` · ${timeAgo(r.reviewed_at)}` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
