"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkUpdateActivityProgress } from "@/actions/construction";

type ActivityRow = {
  id: string;
  category: string;
  scopeName: string;
  activityCode: string;
  activityName: string;
  weightInScopePct: string;
  currentPct: number;
};

type ProjectOption = { id: string; name: string };

const ACCENT = "#057a55";
const CAT_COLOR: Record<string, string> = {
  STRUCTURAL:   "#1a56db",
  ARCHITECTURAL: "#713f12",
  TURNOVER:      "#6b7280",
};
const CAT_BG: Record<string, string> = {
  STRUCTURAL:   "#eff6ff",
  ARCHITECTURAL: "#fef9c3",
  TURNOVER:      "#f3f4f6",
};

export function ActivityProgressClient({
  projects,
  allActivities,
  initialProgress,
}: {
  projects: ProjectOption[];
  allActivities: ActivityRow[];
  initialProgress: Record<string, Record<string, number>>;  // projectId -> activityDefId -> pct
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id ?? "");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getInitialPct(activityId: string) {
    return initialProgress[selectedProject]?.[activityId] ?? 0;
  }

  function getPct(activityId: string) {
    return progress[activityId] ?? getInitialPct(activityId);
  }

  function setPct(activityId: string, val: number) {
    setSaved(false);
    setProgress((prev) => ({ ...prev, [activityId]: Math.min(100, Math.max(0, val)) }));
  }

  function handleProjectChange(pid: string) {
    setSelectedProject(pid);
    setProgress({});
    setSaved(false);
    setError(null);
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    const updates = allActivities
      .map((a) => ({ activityDefId: a.id, completionPct: getPct(a.id) }))
      .filter((u) => u.completionPct > 0 || (initialProgress[selectedProject]?.[u.activityDefId] ?? 0) > 0);

    startTransition(async () => {
      const result = await bulkUpdateActivityProgress({ projectId: selectedProject, updates });
      if (result.success) {
        setSaved(true);
        setProgress({});
        router.refresh();
      } else {
        setError(result.error ?? "Failed to save.");
      }
    });
  }

  // Group activities by category
  const grouped = allActivities.reduce<Record<string, ActivityRow[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  // Compute category % for selected project
  function categoryPct(cat: string) {
    const acts = grouped[cat] ?? [];
    if (!acts.length) return 0;
    const totalWeight = acts.reduce((s, a) => s + Number(a.weightInScopePct), 0);
    if (!totalWeight) return 0;
    const weighted = acts.reduce((s, a) => s + getPct(a.id) * Number(a.weightInScopePct), 0);
    return Math.round(weighted / totalWeight);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Project selector */}
      <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem" }}>
        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
          Select Project / Site
        </label>
        <select
          value={selectedProject}
          onChange={(e) => handleProjectChange(e.target.value)}
          style={{ padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", minWidth: "280px" }}
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
      {saved && (
        <div style={{ padding: "0.85rem 1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", color: "#166534", fontSize: "0.875rem" }}>
          Progress saved successfully.
        </div>
      )}

      {/* Category summaries */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {Object.keys(grouped).map((cat) => {
          const pct = categoryPct(cat);
          return (
            <div key={cat} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: CAT_COLOR[cat] ?? "#374151", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                {cat}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#111827", lineHeight: 1 }}>{pct}%</div>
              <div style={{ marginTop: "0.5rem", height: "6px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: CAT_COLOR[cat] ?? ACCENT, borderRadius: "999px", transition: "width 0.3s ease" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.35rem" }}>
                {grouped[cat].length} activit{grouped[cat].length !== 1 ? "ies" : "y"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity checklist by category */}
      {Object.entries(grouped).map(([cat, activities]) => (
        <div key={cat} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "0.75rem 1.25rem", background: CAT_BG[cat] ?? "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: "0.875rem", color: CAT_COLOR[cat] ?? "#374151" }}>{cat}</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: CAT_COLOR[cat] ?? "#374151" }}>{categoryPct(cat)}% complete</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {activities.map((a, idx) => {
              const pct = getPct(a.id);
              return (
                <div key={a.id} style={{
                  padding: "0.75rem 1.25rem",
                  borderBottom: idx < activities.length - 1 ? "1px solid #f3f4f6" : undefined,
                  display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "1rem",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700, color: "#374151", background: "#e5e7eb", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                        {a.activityCode}
                      </span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{a.activityName}</span>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>— {a.scopeName}</span>
                    </div>
                    <div style={{ height: "5px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#166534" : ACCENT, borderRadius: "999px", transition: "width 0.2s" }} />
                    </div>
                    {Number(a.weightInScopePct) > 0 && (
                      <span style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem", display: "block" }}>
                        Weight: {Number(a.weightInScopePct).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="number"
                      min={0} max={100} step={1}
                      value={pct}
                      onChange={(e) => setPct(a.id, Number(e.target.value))}
                      style={{
                        width: "64px", padding: "0.4rem 0.5rem", border: "1px solid #d1d5db",
                        borderRadius: "6px", fontSize: "0.9rem", textAlign: "center",
                        background: pct === 100 ? "#f0fdf4" : "#fff",
                        color: pct === 100 ? "#166534" : "#111827",
                        fontWeight: pct === 100 ? 700 : 400,
                      }}
                    />
                    <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save button */}
      {allActivities.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "2rem" }}>
          <button
            onClick={handleSave}
            disabled={isPending}
            style={{
              padding: "0.75rem 2rem", borderRadius: "6px",
              background: isPending ? "#6ee7b7" : ACCENT,
              color: "#fff", border: "none", fontSize: "0.95rem", fontWeight: 700,
              cursor: isPending ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
            }}
          >
            {isPending ? "Saving…" : "Save Progress"}
          </button>
        </div>
      )}
    </div>
  );
}
