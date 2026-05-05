"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDeveloperRateCard, toggleDeveloperRateCardActive } from "@/actions/master-list";

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
type Initial  = {
  projectId:        string;
  activityDefId:    string;
  grossRatePerUnit: string;
  retentionPct:     string;
  dpRecoupmentPct:  string;
  taxPct:           string;
};

interface Props {
  id:         string;
  isActive:   boolean;
  projects:   Project[];
  activities: Activity[];
  initial:    Initial;
}

export function EditRateCardForm({ id, isActive, projects, activities, initial }: Props) {
  const router = useRouter();
  const [isSaving,   startSave]   = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [projectId,        setProjectId]        = useState(initial.projectId);
  const [activityDefId,    setActivityDefId]     = useState(initial.activityDefId);
  const [grossRatePerUnit, setGrossRatePerUnit]  = useState(
    Number(initial.grossRatePerUnit).toFixed(2),
  );
  const [retentionPct,    setRetentionPct]    = useState(
    (Number(initial.retentionPct) * 100).toFixed(2),
  );
  const [dpRecoupmentPct, setDpRecoupmentPct] = useState(
    (Number(initial.dpRecoupmentPct) * 100).toFixed(2),
  );
  const [taxPct,          setTaxPct]          = useState(
    (Number(initial.taxPct) * 100).toFixed(2),
  );

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

    startSave(async () => {
      const result = await updateDeveloperRateCard(id, payload);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleToggle() {
    startToggle(async () => {
      await toggleDeveloperRateCardActive(id, !isActive);
      router.refresh();
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

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          style={{
            padding: "0.55rem 1rem", borderRadius: "6px",
            background: isActive ? "#fef2f2" : "#f0fdf4",
            color: isActive ? "#b91c1c" : "#166534",
            border: `1px solid ${isActive ? "#fecaca" : "#86efac"}`,
            fontSize: "0.8rem", fontWeight: 600,
            cursor: isToggling ? "not-allowed" : "pointer",
          }}
        >
          {isToggling ? "…" : isActive ? "Deactivate" : "Reactivate"}
        </button>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <a href="/admin/rate-cards" style={{
            padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
            color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>
            Cancel
          </a>
          <button type="submit" disabled={isSaving} style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: isSaving ? "#fca5a5" : ACCENT,
            color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
            cursor: isSaving ? "not-allowed" : "pointer",
          }}>
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
