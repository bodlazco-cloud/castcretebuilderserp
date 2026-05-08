"use client";

import { useState, useTransition } from "react";
import { updateProject } from "@/actions/master-list";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  contractValue: string;
  developerAdvance: string;
  targetUnitsPerMonth: number;
  minOperatingCashBuffer: string;
};

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

const STATUSES = ["BIDDING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

export function EditProjectForm({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProject({
        id:                     project.id,
        name:                   fd.get("name") as string,
        status:                 fd.get("status") as any,
        startDate:              (fd.get("startDate") as string) || undefined,
        endDate:                (fd.get("endDate") as string) || undefined,
        contractValue:          Number(fd.get("contractValue")),
        developerAdvance:       Number(fd.get("developerAdvance")),
        targetUnitsPerMonth:    Number(fd.get("targetUnitsPerMonth")),
        minOperatingCashBuffer: Number(fd.get("minOperatingCashBuffer")),
      });
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Error saving.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "0.5rem 1rem", borderRadius: "6px", background: open ? "#f3f4f6" : "#374151",
          color: open ? "#374151" : "#fff", border: open ? "1px solid #d1d5db" : "none",
          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        {open ? "Cancel Edit" : "Edit Project"}
      </button>

      {open && (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginTop: "1rem", gridColumn: "1 / -1" }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit Project Details</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <label>
                <span style={labelStyle}>Project Name *</span>
                <input name="name" required defaultValue={project.name} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Status *</span>
                <select name="status" required defaultValue={project.status} style={inputStyle}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>
                <span style={labelStyle}>Start Date</span>
                <input name="startDate" type="date" defaultValue={project.startDate ?? ""} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>End Date</span>
                <input name="endDate" type="date" defaultValue={project.endDate ?? ""} style={inputStyle} />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
              <label>
                <span style={labelStyle}>Contract Value (PHP) *</span>
                <input name="contractValue" type="number" min="0" step="0.01" required defaultValue={project.contractValue} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Developer Advance (PHP)</span>
                <input name="developerAdvance" type="number" min="0" step="0.01" defaultValue={project.developerAdvance} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Target Units / Month</span>
                <input name="targetUnitsPerMonth" type="number" min="0" defaultValue={project.targetUnitsPerMonth} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Min. Cash Buffer (PHP)</span>
                <input name="minOperatingCashBuffer" type="number" min="0" step="0.01" defaultValue={project.minOperatingCashBuffer} style={inputStyle} />
              </label>
            </div>
            {error && (
              <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={isPending} style={{
                padding: "0.55rem 1.5rem", borderRadius: "6px", background: isPending ? "#9ca3af" : "#374151",
                color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
              }}>
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
