"use client";

import { useState } from "react";
import { DeleteRowButton } from "../DeleteRowButton";
import { deleteMaterial } from "@/actions/master-list";

type Row = {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string | null;
  adminPrice: string;
  isActive: boolean;
  supName: string | null;
};

export default function MaterialsTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(r =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q) ||
        (r.supName ?? "").toLowerCase().includes(q)
      )
    : rows;

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="search"
          placeholder="Search by code, name, unit, or supplier…"
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
          {q ? `No materials match "${query}".` : "No materials yet. Click \"+ Add Material\" to get started."}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Code", "Name", "Unit", "Category", "Admin Price", "Pref. Supplier", "Status", ""].map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>{r.code}</td>
                    <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#111827" }}>{r.name}</td>
                    <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.unit}</td>
                    <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.category}</td>
                    <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>
                      PHP {Number(r.adminPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.supName ?? "—"}</td>
                    <td style={{ padding: "0.65rem 1rem" }}>
                      <span style={{
                        display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600,
                        background: r.isActive ? "#dcfce7" : "#f3f4f6", color: r.isActive ? "#166534" : "#6b7280",
                      }}>{r.isActive ? "Active" : "Inactive"}</span>
                    </td>
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                      <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                        <a href={`/master-list/materials/${r.id}`} style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                        <DeleteRowButton action={deleteMaterial.bind(null, r.id)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
