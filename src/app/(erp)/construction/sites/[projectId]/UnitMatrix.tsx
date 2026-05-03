"use client";

import { useRouter } from "next/navigation";
import type { UnitGridRow } from "@/actions/dashboard";

const CATEGORY_LABEL: Record<string, string> = {
  STRUCTURAL:    "S",
  ARCHITECTURAL: "A",
  TURNOVER:      "T",
};

function unitColor(row: UnitGridRow): { bg: string; border: string; text: string } {
  if (row.isFlagged)              return { bg: "#fecaca", border: "#dc2626", text: "#7f1d1d" };
  if (row.status === "COMPLETED") return { bg: "#bbf7d0", border: "#16a34a", text: "#14532d" };
  if (row.status === "ACTIVE")    return { bg: "#fef08a", border: "#ca8a04", text: "#713f12" };
  return                                 { bg: "#f3f4f6", border: "#d1d5db", text: "#6b7280" };
}

export function UnitMatrix({
  units,
  projectId,
}: {
  units:     UnitGridRow[];
  projectId: string;
}) {
  const router = useRouter();

  if (units.length === 0) {
    return (
      <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", textAlign: "center", color: "#9ca3af" }}>
        No units found for this project.
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
          gap: "6px",
        }}
      >
        {units.map((unit) => {
          const { bg, border, text } = unitColor(unit);
          const catLabel = CATEGORY_LABEL[unit.currentCategory] ?? "?";

          return (
            <button
              key={unit.unitId}
              title={[
                unit.unitCode,
                unit.unitModel,
                unit.assignedSubcon ? `Subcon: ${unit.assignedSubcon}` : null,
                unit.isFlagged ? "⚠ Flagged" : null,
              ].filter(Boolean).join("\n")}
              onClick={() =>
                router.push(
                  `/construction/sites/${projectId}/tagging?unit=${unit.unitId}`,
                )
              }
              style={{
                padding: "0.4rem 0.25rem",
                borderRadius: "5px",
                border: `1px solid ${border}`,
                background: bg,
                color: text,
                fontSize: "0.65rem",
                fontWeight: 700,
                textAlign: "center",
                cursor: "pointer",
                lineHeight: 1.3,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ display: "block", fontSize: "0.6rem", opacity: 0.7, fontWeight: 400 }}>
                {catLabel}
              </span>
              {unit.unitCode}
            </button>
          );
        })}
      </div>

      <p style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "#9ca3af" }}>
        Click any unit to log milestone progress. Hover for subcontractor details.
      </p>
    </div>
  );
}
