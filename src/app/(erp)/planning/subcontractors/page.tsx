export const dynamic = "force-dynamic";

import { db } from "@/db";
import { subcontractors } from "@/db/schema";
import { eq } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

type SubconRow = {
  id: string; code: string; name: string; tradeTypes: string[];
  performanceGrade: string | null; stopAssignment: boolean;
  defaultMaxActiveUnits: number | null; isActive: boolean;
};

const GRADE_BADGE: Record<string, { bg: string; color: string }> = {
  A: { bg: "#dcfce7", color: "#166534" },
  B: { bg: "#fef9c3", color: "#713f12" },
  C: { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function SubcontractorsPage() {
  const rows = await safe(
    db.select({
        id:                    subcontractors.id,
        code:                  subcontractors.code,
        name:                  subcontractors.name,
        tradeTypes:            subcontractors.tradeTypes,
        performanceGrade:      subcontractors.performanceGrade,
        stopAssignment:        subcontractors.stopAssignment,
        defaultMaxActiveUnits: subcontractors.defaultMaxActiveUnits,
        isActive:              subcontractors.isActive,
      })
      .from(subcontractors)
      .orderBy(subcontractors.code),
    [] as SubconRow[],
  );

  const active  = rows.filter((r) => r.isActive && !r.stopAssignment).length;
  const stopped = rows.filter((r) => r.stopAssignment).length;
  const gradeA  = rows.filter((r) => r.performanceGrade === "A").length;

  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Planning &amp; Engineering</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Subcontractors</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Eligible for NTP assignment. Grade C (stop-assignment) contractors cannot receive new units.
            Managed in <a href="/admin/subcontractors" style={{ color: "#1a56db", textDecoration: "none" }}>Admin → Subcontractors</a>.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Active / Available", value: active,  accent: "#057a55" },
            { label: "Stop-Assignment",    value: stopped, accent: "#dc2626" },
            { label: "Grade A",            value: gradeA,  accent: "#1a56db" },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: "1.1rem 1.4rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginTop: "0.3rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No subcontractors found.</p>
            <a href="/admin/subcontractors" style={{ color: "#1a56db", fontSize: "0.875rem" }}>Add in Admin →</a>
          </div>
        ) : (
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Code", "Name", "Trade Types", "Grade", "Max Units", "Status"].map((h) => (
                      <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const grade = row.performanceGrade;
                    const gb = grade ? (GRADE_BADGE[grade] ?? { bg: "#f3f4f6", color: "#374151" }) : null;
                    return (
                      <tr key={row.id} style={{ borderBottom: idx < rows.length - 1 ? "1px solid #f3f4f6" : "none", background: row.stopAssignment ? "#fff8f8" : "transparent" }}>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "#1e40af", fontSize: "0.82rem" }}>{row.code}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                            {(row.tradeTypes ?? []).map((t: string) => (
                              <span key={t} style={{ background: "#eff6ff", color: "#1e40af", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 600 }}>{t}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {gb && grade ? (
                            <span style={{ background: gb.bg, color: gb.color, padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>Grade {grade}</span>
                          ) : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", textAlign: "center" }}>
                          {row.defaultMaxActiveUnits ?? <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {row.stopAssignment
                            ? <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>Stop-Assignment</span>
                            : !row.isActive
                            ? <span style={{ background: "#f3f4f6", color: "#6b7280", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>Inactive</span>
                            : <span style={{ background: "#dcfce7", color: "#166534", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>Active</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
