"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { updateMilestoneProgress } from "@/actions/construction";
import type { TaggingUnit, TaggingActivity } from "./page";

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:     { bg: "#f3f4f6", color: "#6b7280", label: "Pending" },
  IN_PROGRESS: { bg: "#eff6ff", color: "#1d4ed8", label: "In Progress" },
  COMPLETE:    { bg: "#dcfce7", color: "#166534", label: "Complete" },
};

export function TaggingForm({
  units,
  activities,
}: {
  units:      TaggingUnit[];
  activities: TaggingActivity[];
}) {
  const searchParams = useSearchParams();
  const preselect = searchParams.get("unit");

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    preselect && units.some((u) => u.unitId === preselect)
      ? preselect
      : (units[0]?.unitId ?? null),
  );
  const [pctMap, setPctMap] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const unitActivities = activities.filter((a) => a.unitId === selectedUnitId);

  function handleUpdate(activityId: string) {
    const pct = pctMap[activityId] ?? 0;
    setErrors((prev: Record<string, string>) => ({ ...prev, [activityId]: "" }));

    startTransition(async () => {
      const res = await updateMilestoneProgress({ unitActivityId: activityId, progressPct: pct });
      if (!res.success) {
        setErrors((prev: Record<string, string>) => ({ ...prev, [activityId]: res.error }));
      }
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", alignItems: "start" }}>
      {/* ── Left: Unit List ──────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Select Unit
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "520px", overflowY: "auto" }}>
          {units.map((u) => {
            const isSelected = u.unitId === selectedUnitId;
            const unitDoneCount = activities.filter(
              (a) => a.unitId === u.unitId && a.status === "COMPLETE",
            ).length;
            const unitTotalCount = activities.filter((a) => a.unitId === u.unitId).length;

            return (
              <button
                key={u.unitId}
                onClick={() => setSelectedUnitId(u.unitId)}
                style={{
                  width: "100%", textAlign: "left", padding: "0.65rem 0.75rem",
                  borderRadius: "6px", border: "1px solid",
                  borderColor: isSelected ? "#93c5fd" : "#e5e7eb",
                  background:  isSelected ? "#eff6ff" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "block", fontWeight: 700, fontSize: "0.875rem", color: isSelected ? "#1d4ed8" : "#111827" }}>
                  {u.blockName} – Lot {u.lotNumber}
                </span>
                <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                  {u.unitCode} · {u.unitModel}
                  {unitTotalCount > 0 && ` · ${unitDoneCount}/${unitTotalCount} done`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: Activity List ─────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "0.875rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Activities
        </h3>

        {unitActivities.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
            {selectedUnitId ? "No activities assigned to this unit yet." : "Select a unit to view activities."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {unitActivities.map((a) => {
              const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.PENDING;
              const isComplete = a.status === "COMPLETE";
              const currentPct = pctMap[a.activityId] ?? 0;

              return (
                <div
                  key={a.activityId}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.85rem 1rem", borderRadius: "8px",
                    border: "1px solid #e5e7eb", background: "#f9fafb",
                    gap: "1rem", flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <p style={{ margin: "0 0 0.2rem", fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>
                      {a.activityName}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#6b7280" }}>
                      {a.activityCode}
                      {a.subconName && ` · ${a.subconName}`}
                    </p>
                  </div>

                  <span style={{
                    padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem",
                    fontWeight: 700, background: badge.bg, color: badge.color, whiteSpace: "nowrap",
                  }}>
                    {badge.label}
                  </span>

                  {!isComplete && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={currentPct}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPctMap((prev: Record<string, number>) => ({
                            ...prev,
                            [a.activityId]: Math.min(100, Math.max(0, Number(e.target.value))),
                          }))
                        }
                        style={{
                          width: "60px", border: "1px solid #d1d5db", borderRadius: "6px",
                          padding: "0.3rem 0.5rem", fontSize: "0.875rem", textAlign: "center",
                        }}
                        disabled={isPending}
                      />
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>%</span>
                      <button
                        onClick={() => handleUpdate(a.activityId)}
                        disabled={isPending || currentPct === 0}
                        style={{
                          padding: "0.35rem 0.85rem", borderRadius: "6px", border: "none",
                          background: currentPct === 0 ? "#e5e7eb" : "#1d4ed8",
                          color: currentPct === 0 ? "#9ca3af" : "#fff",
                          fontSize: "0.8rem", fontWeight: 600,
                          cursor: currentPct === 0 || isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        Update
                      </button>
                    </div>
                  )}

                  {errors[a.activityId] && (
                    <p style={{ width: "100%", margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#b91c1c" }}>
                      {errors[a.activityId]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#9ca3af" }}>
          Document attachments (WAR sign-off, milestone photos) are submitted via{" "}
          <a href="/construction/submit-war" style={{ color: "#057a55" }}>Work Accomplished Report</a>.
        </p>
      </div>
    </div>
  );
}
