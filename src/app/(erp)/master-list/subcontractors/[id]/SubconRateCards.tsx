"use client";

import { useState, useTransition } from "react";
import { createSubconRateCard, toggleSubconRateCardActive } from "@/actions/master-list";
import { useRouter } from "next/navigation";

type RateCard = {
  id: string;
  projectName: string | null;
  scopeName: string | null;
  activityCode: string | null;
  activityName: string | null;
  ratePerUnit: string;
  retentionPct: string;
  version: number;
  isActive: boolean;
};

type Project = { id: string; name: string };
type ActivityDef = { id: string; projectId: string; scopeName: string; activityCode: string; activityName: string };

const ACCENT = "#6366f1";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};
const LABEL: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" };
const VALUE: React.CSSProperties = { fontSize: "0.88rem", color: "#111827", fontWeight: 500 };

export function SubconRateCards({
  subconId, rateCards, projects, activityDefs,
}: {
  subconId: string;
  rateCards: RateCard[];
  projects: Project[];
  activityDefs: ActivityDef[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [ratePerUnit, setRatePerUnit] = useState("");
  const [retentionPct, setRetentionPct] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredActivities = activityDefs.filter((a) => a.projectId === selectedProject);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSubconRateCard({
        subconId,
        projectId:     selectedProject,
        activityDefId: selectedActivity,
        ratePerUnit:   Number(ratePerUnit),
        retentionPct:  Number(retentionPct) / 100,
      });
      if (result.success) {
        setShowForm(false);
        setSelectedProject(""); setSelectedActivity(""); setRatePerUnit(""); setRetentionPct("10");
        router.refresh();
      } else {
        setError(result.error ?? "Error saving rate card.");
      }
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleSubconRateCardActive(id, isActive);
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          Rate Cards ({rateCards.length})
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "0.45rem 1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ Add Rate Card"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", marginBottom: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <label>
              <span style={labelStyle}>Project (Site) *</span>
              <select required value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setSelectedActivity(""); }} style={inputStyle}>
                <option value="">Select project…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Scope / Activity *</span>
              <select required value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} style={inputStyle} disabled={!selectedProject}>
                <option value="">Select activity…</option>
                {filteredActivities.map((a) => (
                  <option key={a.id} value={a.id}>{a.scopeName} → {a.activityCode} {a.activityName}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <label>
              <span style={labelStyle}>Rate per Unit (PHP) *</span>
              <input type="number" required min="0" step="0.01" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} placeholder="0.00" style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Retention % *</span>
              <input type="number" required min="0" max="100" step="0.01" value={retentionPct} onChange={(e) => setRetentionPct(e.target.value)} placeholder="10" style={inputStyle} />
            </label>
          </div>
          {error && (
            <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={isPending} style={{
              padding: "0.5rem 1.25rem", borderRadius: "6px", background: isPending ? "#a5b4fc" : ACCENT,
              color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}>
              {isPending ? "Saving…" : "Save Rate Card"}
            </button>
          </div>
        </form>
      )}

      {rateCards.length === 0 ? (
        <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
          No rate cards set up yet. Add one above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {rateCards.map((rc) => (
            <div key={rc.id} style={{
              background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              padding: "0.9rem 1.25rem", opacity: rc.isActive ? 1 : 0.6,
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "1rem", alignItems: "center",
            }}>
              <div>
                <div style={LABEL}>{rc.projectName ?? "—"}</div>
                <div style={VALUE}>{rc.scopeName ?? "—"}</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>{rc.activityCode} {rc.activityName}</div>
              </div>
              <div>
                <div style={LABEL}>Rate / Unit</div>
                <div style={{ ...VALUE, fontWeight: 700 }}>PHP {Number(rc.ratePerUnit).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style={LABEL}>Retention</div>
                <div style={VALUE}>{(Number(rc.retentionPct) * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div style={LABEL}>Version</div>
                <div style={VALUE}>v{rc.version}</div>
              </div>
              <button
                onClick={() => handleToggle(rc.id, !rc.isActive)}
                disabled={isPending}
                style={{
                  padding: "0.3rem 0.75rem", borderRadius: "5px", border: "none", fontSize: "0.75rem", fontWeight: 600,
                  background: rc.isActive ? "#fee2e2" : "#dcfce7", color: rc.isActive ? "#991b1b" : "#166534",
                  cursor: isPending ? "not-allowed" : "pointer",
                }}
              >
                {rc.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
