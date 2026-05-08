"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueTaskAssignment } from "@/actions/construction";

type Project = { id: string; name: string; status: string };
type Unit = { id: string; unitCode: string; projectId: string; unitModel: string; unitType: string };
type Subcon = { id: string; name: string; code: string; tradeTypes: string[] };

const ACCENT = "#057a55";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "0.9rem", boxSizing: "border-box", background: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600,
  color: "#374151", marginBottom: "0.35rem",
};

const CATEGORIES = ["STRUCTURAL", "ARCHITECTURAL", "TURNOVER"] as const;
const WORK_TYPES  = ["STRUCTURAL", "ARCHITECTURAL", "BOTH"] as const;

export function IssueNtpForm({
  projects, units, subcontractors, userId,
}: {
  projects: Project[];
  units: Unit[];
  subcontractors: Subcon[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterType, setFilterType] = useState("");
  const [checkedUnits, setCheckedUnits] = useState<Set<string>>(new Set());

  const projectUnits = units.filter((u) => u.projectId === selectedProject);
  const uniqueModels = [...new Set(projectUnits.map((u) => u.unitModel))].sort();
  const uniqueTypes  = [...new Set(projectUnits.map((u) => u.unitType))].sort();

  const visibleUnits = projectUnits.filter((u) => {
    if (filterModel && u.unitModel !== filterModel) return false;
    if (filterType  && u.unitType  !== filterType)  return false;
    return true;
  });

  function toggleUnit(id: string) {
    setCheckedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (checkedUnits.size === visibleUnits.length && visibleUnits.length > 0) {
      setCheckedUnits(new Set());
    } else {
      setCheckedUnits(new Set(visibleUnits.map((u) => u.id)));
    }
  }

  function handleProjectChange(id: string) {
    setSelectedProject(id);
    setFilterModel("");
    setFilterType("");
    setCheckedUnits(new Set());
    setError(null);
    setSuccessCount(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (checkedUnits.size === 0) { setError("Select at least one unit."); return; }
    setError(null);
    setSuccessCount(null);
    const fd = new FormData(e.currentTarget);
    const unitIds = [...checkedUnits];

    startTransition(async () => {
      let issued = 0;
      let lastError: string | null = null;
      for (const unitId of unitIds) {
        const result = await issueTaskAssignment({
          projectId: fd.get("projectId") as string,
          unitId,
          subconId:  fd.get("subconId") as string,
          category:  fd.get("category") as "STRUCTURAL" | "ARCHITECTURAL" | "TURNOVER",
          workType:  fd.get("workType") as "STRUCTURAL" | "ARCHITECTURAL" | "BOTH",
          startDate: fd.get("startDate") as string,
          endDate:   fd.get("endDate") as string,
          issuedBy:  userId,
        });
        if (result.success) { issued++; }
        else { lastError = result.error; break; }
      }
      if (issued > 0) {
        setSuccessCount(issued);
        setCheckedUnits(new Set());
        if (issued === 1) {
          // single unit — navigate to the NTP detail
        } else {
          router.push(`/construction/ntp`);
        }
      }
      if (lastError) setError(lastError);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
      {successCount != null && successCount > 0 && (
        <div style={{ padding: "0.85rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#057a55", fontSize: "0.875rem" }}>
          {successCount} NTP(s) issued successfully.
        </div>
      )}

      <label>
        <span style={labelStyle}>Project <span style={{ color: "#e02424" }}>*</span></span>
        <select name="projectId" required value={selectedProject}
          onChange={(e) => handleProjectChange(e.target.value)} style={inputStyle}>
          <option value="">Select project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.status}</option>
          ))}
        </select>
      </label>

      {selectedProject && (
        <div>
          <span style={labelStyle}>Units <span style={{ color: "#e02424" }}>*</span></span>

          {/* Filters */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
            <select value={filterModel} onChange={(e) => { setFilterModel(e.target.value); setCheckedUnits(new Set()); }}
              style={{ padding: "0.35rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.8rem", background: "#fff" }}>
              <option value="">All Models</option>
              {uniqueModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCheckedUnits(new Set()); }}
              style={{ padding: "0.35rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.8rem", background: "#fff" }}>
              <option value="">All Types</option>
              {uniqueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: "0.78rem", color: "#6b7280", display: "flex", alignItems: "center" }}>
              {visibleUnits.length} unit(s) shown · {checkedUnits.size} selected
            </span>
          </div>

          {visibleUnits.length === 0 ? (
            <div style={{ padding: "0.85rem 1rem", background: "#f9fafb", borderRadius: "6px", fontSize: "0.85rem", color: "#9ca3af" }}>
              No PENDING units in this project.
            </div>
          ) : (
            <div style={{ border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
              {/* Select all row */}
              <div style={{ padding: "0.55rem 0.85rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <input type="checkbox"
                  checked={checkedUnits.size === visibleUnits.length && visibleUnits.length > 0}
                  onChange={toggleAll}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>Select All Visible</span>
              </div>
              <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                {visibleUnits.map((u) => (
                  <label key={u.id} style={{
                    display: "flex", alignItems: "center", gap: "0.65rem",
                    padding: "0.5rem 0.85rem", borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer", background: checkedUnits.has(u.id) ? "#f0fdf4" : "#fff",
                  }}>
                    <input
                      type="checkbox"
                      checked={checkedUnits.has(u.id)}
                      onChange={() => toggleUnit(u.id)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ fontWeight: 500, color: "#111827", fontSize: "0.875rem" }}>{u.unitCode}</span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{u.unitModel}</span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "3px", background: "#eff6ff", color: "#1e40af" }}>{u.unitType}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <label>
        <span style={labelStyle}>Subcontractor <span style={{ color: "#e02424" }}>*</span></span>
        <select name="subconId" required style={inputStyle}>
          <option value="">Select subcontractor…</option>
          {subcontractors.map((s) => (
            <option key={s.id} value={s.id}>{s.code} — {s.name} ({s.tradeTypes.join(", ")})</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Category <span style={{ color: "#e02424" }}>*</span></span>
          <select name="category" required style={inputStyle}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Work Type <span style={{ color: "#e02424" }}>*</span></span>
          <select name="workType" required style={inputStyle}>
            {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Start Date <span style={{ color: "#e02424" }}>*</span></span>
          <input name="startDate" type="date" required style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>End Date <span style={{ color: "#e02424" }}>*</span></span>
          <input name="endDate" type="date" required style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <a href="/construction" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending || checkedUnits.size === 0} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending || checkedUnits.size === 0 ? "#6ee7b7" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem",
          fontWeight: 600, cursor: isPending || checkedUnits.size === 0 ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Issuing NTPs…" : checkedUnits.size > 0 ? `Issue ${checkedUnits.size} NTP(s)` : "Issue NTP"}
        </button>
      </div>
    </form>
  );
}
