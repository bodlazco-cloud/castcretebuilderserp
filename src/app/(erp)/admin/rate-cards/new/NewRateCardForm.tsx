"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDeveloperRateCard } from "@/actions/master-list";

const ACCENT = "#dc2626";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};
const hintStyle: React.CSSProperties = {
  fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem", display: "block",
};

type Project  = { id: string; name: string };
type Activity = { id: string; activityCode: string; activityName: string; scopeName: string };

interface Props {
  projects:   Project[];
  activities: Activity[];
}

export function NewRateCardForm({ projects, activities }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [projectId,       setProjectId]       = useState(projects[0]?.id ?? "");
  const [activityDefId,   setActivityDefId]   = useState(activities[0]?.id ?? "");
  const [grossRatePerUnit, setGrossRatePerUnit] = useState("0.00");
  const [retentionPct,    setRetentionPct]    = useState("10.00");
  const [dpRecoupmentPct, setDpRecoupmentPct] = useState("10.00");
  const [taxPct,          setTaxPct]          = useState("0.00");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      projectId,
      activityDefId,
      grossRatePerUnit: Number(grossRatePerUnit),
      retentionPct:     Number(retentionPct) / 100,
      dpRecoupmentPct:  Number(dpRecoupmentPct) / 100,
      taxPct:           Number(taxPct) / 100,
    };

    startTransition(async () => {
      const result = await createDeveloperRateCard(payload);
      if (result.success) {
        router.push("/admin/rate-cards");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <label>
        <span style={labelStyle}>Project *</span>
        <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Activity *</span>
        <select required value={activityDefId} onChange={(e) => setActivityDefId(e.target.value)} style={inputStyle}>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.activityCode}: {a.activityName} ({a.scopeName})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Gross Rate / Unit (PHP) *</span>
        <input
          type="number" required min="0.01" step="0.01"
          value={grossRatePerUnit}
          onChange={(e) => setGrossRatePerUnit(e.target.value)}
          style={inputStyle}
        />
        <span style={hintStyle}>The base rate paid to the developer per completed unit.</span>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Retention %</span>
          <input
            type="number" required min="0" max="100" step="0.01"
            value={retentionPct}
            onChange={(e) => setRetentionPct(e.target.value)}
            style={inputStyle}
          />
          <span style={hintStyle}>e.g. 10.00 = 10%</span>
        </label>
        <label>
          <span style={labelStyle}>DP Recoupment %</span>
          <input
            type="number" required min="0" max="100" step="0.01"
            value={dpRecoupmentPct}
            onChange={(e) => setDpRecoupmentPct(e.target.value)}
            style={inputStyle}
          />
          <span style={hintStyle}>e.g. 10.00 = 10%</span>
        </label>
        <label>
          <span style={labelStyle}>Tax %</span>
          <input
            type="number" required min="0" max="100" step="0.01"
            value={taxPct}
            onChange={(e) => setTaxPct(e.target.value)}
            style={inputStyle}
          />
          <span style={hintStyle}>e.g. 0.00 = 0%</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb" }}>
        <a href="/admin/rate-cards" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>
          Cancel
        </a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#fca5a5" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Create Rate Card"}
        </button>
      </div>
    </form>
  );
}
