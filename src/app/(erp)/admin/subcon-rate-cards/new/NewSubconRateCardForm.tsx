"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSubconRateCard } from "@/actions/master-list";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.5rem 0.75rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
};

type Subcon    = { id: string; name: string; code: string };
type Project   = { id: string; name: string };
type Activity  = { id: string; activityCode: string; activityName: string; scopeName: string };

export function NewSubconRateCardForm({
  subcontractors, projects, activities,
}: {
  subcontractors: Subcon[];
  projects: Project[];
  activities: Activity[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [subconId, setSubconId]     = useState(subcontractors[0]?.id ?? "");
  const [projectId, setProjectId]   = useState(projects[0]?.id ?? "");
  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [ratePerUnit, setRate]      = useState("");
  const [retentionPct, setRet]      = useState("10");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSubconRateCard({
        subconId,
        projectId,
        activityDefId: activityId,
        ratePerUnit:   Number(ratePerUnit),
        retentionPct:  Number(retentionPct) / 100,
      });
      if (result.success) router.push("/admin/subcon-rate-cards");
      else setError(result.error ?? "Failed to create.");
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>}

      <label><span style={labelStyle}>Subcontractor *</span>
        <select required value={subconId} onChange={(e) => setSubconId(e.target.value)} style={inputStyle}>
          {subcontractors.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
        </select>
      </label>

      <label><span style={labelStyle}>Project *</span>
        <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      <label><span style={labelStyle}>Activity *</span>
        <select required value={activityId} onChange={(e) => setActivityId(e.target.value)} style={inputStyle}>
          {activities.map((a) => <option key={a.id} value={a.id}>{a.activityCode}: {a.activityName} ({a.scopeName})</option>)}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label><span style={labelStyle}>Rate per Unit (PHP) *</span>
          <input type="number" required min={0.01} step={0.01} value={ratePerUnit}
            onChange={(e) => setRate(e.target.value)} placeholder="e.g. 15000.00" style={inputStyle} />
        </label>
        <label><span style={labelStyle}>Retention % *</span>
          <input type="number" required min={0} max={100} step={0.01} value={retentionPct}
            onChange={(e) => setRet(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", paddingTop: "0.5rem" }}>
        <button type="submit" disabled={isPending} style={{
          padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#a5b4fc" : "#6366f1",
          color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>{isPending ? "Saving…" : "Create Rate Card"}</button>
        <a href="/admin/subcon-rate-cards" style={{
          padding: "0.6rem 1rem", borderRadius: "6px", background: "#f3f4f6",
          border: "1px solid #d1d5db", color: "#374151", fontSize: "0.875rem",
          textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
      </div>
    </form>
  );
}
