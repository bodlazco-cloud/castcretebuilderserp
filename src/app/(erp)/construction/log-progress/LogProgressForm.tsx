"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logDailyProgressBulk } from "@/actions/construction";

type NtpUnit = {
  unitId: string; taskAssignmentId: string;
  unitCode: string; unitModel: string; unitType: string; blockId: string;
};
type NtpGroup = {
  groupKey: string; projectId: string; subconId: string;
  category: string; phaseScopeId: string | null; scopeName: string | null;
  subconName: string; subconCode: string; projName: string;
  units: NtpUnit[];
};
type Activity = { id: string; code: string; name: string; scopeId: string; weight: string; order: number };

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
const ACTIVITY_STATUSES = ["STARTED", "ONGOING", "COMPLETED"] as const;
type ActivityStatus = typeof ACTIVITY_STATUSES[number];

export function LogProgressForm({ ntpGroups, activities, userId }: {
  ntpGroups: NtpGroup[];
  activities: Activity[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [selectedUnitIds, setSelectedUnitIds]   = useState<Set<string>>(new Set());
  const [activityChecks, setActivityChecks] = useState<Record<string, ActivityStatus>>({});
  const [skipActivities, setSkipActivities] = useState(false);
  const [entryDate,      setEntryDate]      = useState(new Date().toISOString().slice(0, 10));
  const [manpower,       setManpower]       = useState(0);
  const [delayType,      setDelayType]      = useState("");
  const [issuesDetails,  setIssuesDetails]  = useState("");

  const selectedGroup  = ntpGroups.find((g) => g.groupKey === selectedGroupKey) ?? null;
  const scopeId        = selectedGroup?.phaseScopeId ?? null;
  const scopeActivities = activities.filter((a) => scopeId ? a.scopeId === scopeId : false);

  // Reset unit/activity selections when NTP group changes
  useEffect(() => {
    setSelectedUnitIds(new Set(selectedGroup?.units.map((u) => u.unitId) ?? []));
    setActivityChecks({});
    setSkipActivities(false);
  }, [selectedGroupKey]);

  function toggleUnit(unitId: string) {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId); else next.add(unitId);
      return next;
    });
  }

  function toggleActivity(actId: string) {
    setActivityChecks((prev) => {
      if (prev[actId]) { const next = { ...prev }; delete next[actId]; return next; }
      return { ...prev, [actId]: "STARTED" };
    });
  }

  function setActivityStatus(actId: string, status: ActivityStatus) {
    setActivityChecks((prev) => ({ ...prev, [actId]: status }));
  }

  function markAllActivities() {
    const next: Record<string, ActivityStatus> = {};
    scopeActivities.forEach((a) => { next[a.id] = "STARTED"; });
    setActivityChecks(next);
  }

  const checkedActivityIds = Object.keys(activityChecks);

  // Group NTP groups by project for dropdown
  const ntpsByProject = ntpGroups.reduce<Record<string, NtpGroup[]>>((acc, g) => {
    (acc[g.projName] ??= []).push(g);
    return acc;
  }, {});

  function groupLabel(g: NtpGroup): string {
    const codes = g.units.map((u) => u.unitCode).join(", ");
    return `${codes} — ${g.subconName}${g.scopeName ? ` / ${g.scopeName}` : ` / ${g.category}`}`;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedGroup) { setError("Select a Task Assignment (NTP)."); return; }
    if (selectedUnitIds.size === 0) { setError("Select at least one unit."); return; }
    if (!skipActivities && checkedActivityIds.length === 0) {
      setError("Select at least one activity, or check \"Log without a specific activity\".");
      return;
    }
    setError(null);

    startTransition(async () => {
      const units = selectedGroup.units.filter((u) => selectedUnitIds.has(u.unitId));
      let lastError: string | null = null;
      let totalCount = 0;

      for (const unit of units) {
        const result = await logDailyProgressBulk({
          projectId:        selectedGroup.projectId,
          unitIds:          [unit.unitId],
          taskAssignmentId: unit.taskAssignmentId,
          subconId:         selectedGroup.subconId,
          activities:       skipActivities ? [] : checkedActivityIds.map((id) => ({ phaseActivityId: id, status: activityChecks[id] ?? "STARTED" })),
          entryDate,
          actualManpower:   manpower,
          delayType:        (delayType as any) || undefined,
          issuesDetails:    issuesDetails || undefined,
          enteredBy:        userId,
        });
        if (result.success) { totalCount += result.count; }
        else { lastError = result.error; break; }
      }

      if (lastError) {
        setError(lastError);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/construction"), 1200);
      }
    });
  }

  const sectionCard: React.CSSProperties = {
    padding: "1rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb",
    display: "flex", flexDirection: "column", gap: "0.85rem",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "0.85rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: ACCENT, fontSize: "0.875rem" }}>
          Progress logged successfully. Redirecting…
        </div>
      )}

      {/* ── STEP 1: Select NTP ── */}
      <div style={sectionCard}>
        <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
          Step 1 — Select Task Assignment (NTP)
        </p>
        {ntpGroups.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#9ca3af" }}>No active NTPs found.</p>
        ) : (
          <label>
            <span style={labelStyle}>Active NTP <span style={{ color: "#e02424" }}>*</span></span>
            <select value={selectedGroupKey} onChange={(e) => setSelectedGroupKey(e.target.value)} style={inputStyle} required>
              <option value="">Select NTP…</option>
              {Object.entries(ntpsByProject).map(([projName, projGroups]) => (
                <optgroup key={projName} label={projName}>
                  {projGroups.map((g) => (
                    <option key={g.groupKey} value={g.groupKey}>
                      {groupLabel(g)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}

        {selectedGroup && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ padding: "0.2rem 0.55rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, color: "#166534" }}>
              {selectedGroup.projName}
            </span>
            <span style={{ padding: "0.2rem 0.55rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, color: "#1e40af" }}>
              {selectedGroup.subconCode} — {selectedGroup.subconName}
            </span>
            {selectedGroup.scopeName && (
              <span style={{ padding: "0.2rem 0.55rem", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, color: "#713f12" }}>
                Scope: {selectedGroup.scopeName}
              </span>
            )}
          </div>
        )}

        {selectedGroup && selectedGroup.units.length > 1 && (
          <div>
            <span style={labelStyle}>Units to log <span style={{ color: "#e02424" }}>*</span></span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {selectedGroup.units.map((u) => (
                <label key={u.unitId} style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.45rem 0.7rem", borderRadius: "6px", cursor: "pointer",
                  background: selectedUnitIds.has(u.unitId) ? "#f0fdf4" : "#fff",
                  border: selectedUnitIds.has(u.unitId) ? `1px solid ${ACCENT}` : "1px solid #e5e7eb",
                }}>
                  <input type="checkbox" checked={selectedUnitIds.has(u.unitId)}
                    onChange={() => toggleUnit(u.unitId)} style={{ cursor: "pointer" }} />
                  <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#111827" }}>{u.unitCode}</span>
                  <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>{u.unitModel}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "3px", background: "#eff6ff", color: "#1e40af" }}>{u.unitType}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 2: Activities ── */}
      {selectedGroup && (
        <div style={sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
              Step 2 — Activities
            </p>
            {scopeActivities.length > 0 && !skipActivities && (
              <button type="button" onClick={markAllActivities} style={{ fontSize: "0.75rem", color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                Check All
              </button>
            )}
          </div>

          <label style={{
            display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.85rem",
            borderRadius: "6px", cursor: "pointer",
            background: skipActivities ? "#f0fdf4" : "#f9fafb",
            border: skipActivities ? `1px solid ${ACCENT}` : "1px solid #e5e7eb",
          }}>
            <input type="checkbox" checked={skipActivities} onChange={(e) => setSkipActivities(e.target.checked)} style={{ cursor: "pointer" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>
              Log without a specific activity (NTP/scope-level entry)
            </span>
          </label>

          {!skipActivities && (scopeActivities.length === 0 ? (
            <div style={{ padding: "0.85rem 1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "0.85rem", color: "#92400e" }}>
              {selectedGroup.phaseScopeId
                ? "No activities defined for this scope."
                : "This NTP has no scope assigned — activities cannot be filtered."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {scopeActivities.map((act) => {
                const isChecked = !!activityChecks[act.id];
                const status    = activityChecks[act.id] ?? "STARTED";
                return (
                  <div key={act.id} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.6rem 0.85rem", borderRadius: "6px", cursor: "pointer",
                    background: isChecked ? "#f0fdf4" : "#fff",
                    border: isChecked ? `1px solid ${ACCENT}` : "1px solid #e5e7eb",
                  }}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleActivity(act.id)} style={{ cursor: "pointer", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>{act.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                        <span style={{ fontFamily: "monospace", background: "#eff6ff", color: "#1e40af", padding: "0.05rem 0.3rem", borderRadius: "3px", marginRight: "0.4rem" }}>{act.code}</span>
                        {Number(act.weight) > 0 && `${act.weight}% weight`}
                      </div>
                    </div>
                    {isChecked && (
                      <select value={status} onChange={(e) => setActivityStatus(act.id, e.target.value as ActivityStatus)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem", border: "1px solid #d1d5db", borderRadius: "5px", background: "#fff", cursor: "pointer" }}>
                        {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {!skipActivities && checkedActivityIds.length > 0 && (
            <p style={{ margin: 0, fontSize: "0.75rem", color: ACCENT, fontWeight: 600 }}>
              {checkedActivityIds.length} of {scopeActivities.length} activities selected
              {checkedActivityIds.length === scopeActivities.length && scopeActivities.length > 0 && (
                <span style={{ marginLeft: "0.5rem", background: "#dcfce7", color: "#166534", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                  All activities — WAR may be submittable after saving
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* ── STEP 3: Entry Details ── */}
      {selectedGroup && (
        <div style={sectionCard}>
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
            Step 3 — Entry Details
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label>
              <span style={labelStyle}>Entry Date <span style={{ color: "#e02424" }}>*</span></span>
              <input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Manpower Count <span style={{ color: "#e02424" }}>*</span></span>
              <input type="number" min="0" required value={manpower} onChange={(e) => setManpower(Number(e.target.value))} style={inputStyle} />
            </label>
          </div>
          <label>
            <span style={labelStyle}>Delay Type (if any)</span>
            <select value={delayType} onChange={(e) => setDelayType(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              <option value="WEATHER">Weather</option>
              <option value="MATERIAL_DELAY">Material Delay</option>
              <option value="MANPOWER_SHORTAGE">Manpower Shortage</option>
              <option value="EQUIPMENT_BREAKDOWN">Equipment Breakdown</option>
              <option value="DESIGN_CHANGE">Design Change</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label>
            <span style={labelStyle}>Issues / Details</span>
            <textarea rows={3} value={issuesDetails} onChange={(e) => setIssuesDetails(e.target.value)}
              style={{ ...inputStyle, resize: "vertical" }} placeholder="Describe any issues or delays…" />
          </label>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/construction" style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Cancel
        </a>
        <button type="submit"
          disabled={isPending || !selectedGroup || selectedUnitIds.size === 0 || (!skipActivities && checkedActivityIds.length === 0)}
          style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: (!selectedGroup || selectedUnitIds.size === 0 || (!skipActivities && checkedActivityIds.length === 0)) ? "#6ee7b7" : ACCENT,
            color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
            cursor: (!selectedGroup || selectedUnitIds.size === 0 || (!skipActivities && checkedActivityIds.length === 0)) ? "not-allowed" : "pointer",
          }}>
          {isPending
            ? "Saving…"
            : checkedActivityIds.length > 0
              ? `Log ${checkedActivityIds.length} activit${checkedActivityIds.length > 1 ? "ies" : "y"} for ${selectedUnitIds.size} unit${selectedUnitIds.size !== 1 ? "s" : ""}`
              : `Log Progress for ${selectedUnitIds.size} unit${selectedUnitIds.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </form>
  );
}
