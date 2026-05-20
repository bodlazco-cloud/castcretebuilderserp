"use client";

import { useState } from "react";
import { DeleteRowButton } from "../DeleteRowButton";
import { deleteSubcontractor } from "@/actions/master-list";

type Row = {
  id: string;
  code: string;
  name: string;
  tradeTypes: string[];
  defaultMaxActiveUnits: number;
  performanceGrade: string;
  performanceScore: string;
  stopAssignment: boolean;
  isActive: boolean;
};

const GRADE_STYLE: Record<string, { bg: string; color: string }> = {
  A: { bg: "#dcfce7", color: "#166534" },
  B: { bg: "#fef9c3", color: "#713f12" },
  C: { bg: "#fef2f2", color: "#b91c1c" },
};

export default function SubcontractorsTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(r =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.tradeTypes.some(t => t.toLowerCase().includes(q))
      )
    : rows;

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="search"
          placeholder="Search by code, name, or trade type…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: "100%", maxWidth: "420px", padding: "0.55rem 0.9rem",
            border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem",
            outline: "none", boxSizing: "border-box",
          }}
        />
        {q && (
          <span style={{ marginLeft: "0.75rem", fontSize: "0.8rem", color: "#6b7280" }}>
            {filtered.length} of {rows.length} results
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
          {q ? `No subcontractors match "${query}".` : "No subcontractors yet. Click \"+ Add Subcontractor\" to get started."}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Code", "Name", "Trade Types", "Max Units", "Grade", "Score", "Status", ""].map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const gs = GRADE_STYLE[r.performanceGrade] ?? { bg: "#f3f4f6", color: "#6b7280" };
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>{r.code}</td>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#111827" }}>{r.name}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.tradeTypes.join(", ")}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.defaultMaxActiveUnits}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, background: gs.bg, color: gs.color }}>
                          {r.performanceGrade}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{Number(r.performanceScore).toFixed(1)}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {r.stopAssignment ? (
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#fef2f2", color: "#b91c1c" }}>Stop</span>
                        ) : r.isActive ? (
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#dcfce7", color: "#166534" }}>Active</span>
                        ) : (
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#f3f4f6", color: "#6b7280" }}>Inactive</span>
                        )}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                        <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                          <a href={`/master-list/subcontractors/${r.id}`} style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                          <DeleteRowButton action={deleteSubcontractor.bind(null, r.id)} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
