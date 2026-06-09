"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logDailyProgressBulk } from "@/actions/construction";

type Project    = { id: string; name: string };
type Block      = { id: string; blockName: string; projectId: string };
type Unit       = { id: string; unitCode: string; projectId: string; blockId: string; unitModel: string; unitType: string };
type Assignment = { id: string; unitId: string; subconId: string; subconName: string; category: string; phaseScopeId: string | null; scopeName: string | null };
type Subcon     = { id: string; name: string; code: string };
type Activity   = { id: string; code: string; name: string; scopeId: string; weight: string; order: number };

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

export function LogProgressForm({
  projects, blocks, units, assignments, allSubcons, activities, userId,
}: {
  projects: Project[];
  blocks: Block[];
  units: Unit[];
  assignments: Assignment[];
  allSubcons: Subcon[];
  activities: Activity[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedProject,  setSelectedProject]  = useState("");
  const [selectedBlock,    setSelectedBlock]    = useState("");
  const [checkedUnits,     setCheckedUnits]     = useState<Set<string>>(new Set());
  const [selectedNtp,      setSelectedNtp]      = useState("");
  const [selectedSubcon,   setSelectedSubcon]   = useState("");
  const [entryDate,        setEntryDate]        = useState(new Date().toISOString().slice(0, 10));
  const [manpower,         setManpower]         = useState(0);
  const [delayType,        setDelayType]        = useState("");
  const [issuesDetails,    setIssuesDetails]    = useState("");

  // Activity checklist: activityId → status
  const [activityChecks, setActivityChecks] = useState<Record<string, ActivityStatus>>({});

  const projectBlocks   = blocks.filter((b) => b.projectId === selectedProject);
  const blockUnits      = units.filter((u) => u.projectId === selectedProject && (!selectedBlock || u.blockId === selectedBlock));
  const unitIds         = [...checkedUnits];
  const ntpOptions      = assignments.filter((a) => unitIds.includes(a.unitId));
  const selectedNtpObj  = assignments.find((a) => a.id === selectedNtp);
  const scopeId         = selectedNtpObj?.phaseScopeId ?? null;
  const scopeActivities = activities.filter((a) => scopeId ? a.scopeId === scopeId : false);

  // Auto-set subcon from NTP
  useEffect(() => {
    if (selectedNtpObj) setSelectedSubcon(selectedNtpObj.subconId);
  }, [selectedNtpObj?.id]);

  // Reset activity checks when scope changes
  useEffect(() => {
    setActivityChecks({});
  }, [scopeId]);

  function toggleUnit(id: string) {
    setCheckedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectedNtp("");
    setActivityChecks({});
  }

  function toggleAllBlockUnits() {
    if (checkedUnits.size === blockUnits.length && blockUnits.length > 0) {
      setCheckedUnits(new Set());
    } else {
      setCheckedUnits(new Set(blockUnits.map((u) => u.id)));
    }
    setSelectedNtp("");
    setActivityChecks({});
  }

  function toggleActivity(actId: string) {
    setActivityChecks((prev) => {
      if (prev[actId]) {
        const next = { ...prev };
        delete next[actId];
        return next;
      }
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (checkedUnits.size === 0)      { setError("Select at least one unit."); return; }
    if (!selectedNtp)                 { setError("Select a Task Assignment (NTP)."); return; }
    if (!selectedSubcon)              { setError("Select a subcontractor."); return; }
    if (checkedActivityIds.length === 0) { setError("Select at least one activity."); return; }
    setError(null);

    const activityList = checkedActivityIds.map((id) => ({
      phaseActivityId: id,
      status: activityChecks[id] ?? "STARTED",
    }));

    startTransition(async () => {
      const result = await logDailyProgressBulk({
        projectId:        selectedProject,
        unitIds,
        taskAssignmentId: selectedNtp,
        subconId:         selectedSubcon,
        activities:       activityList,
        entryDate,
        actualManpower:   manpower,
        delayType:        (delayType as any) || undefined,
        issuesDetails:    issuesDetails || undefined,
        enteredBy:        userId,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push("/construction"), 1200);
      } else {
        setError(result.error);
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

      {/* ── SECTION 1: Project + Block + Units ── */}
      <div style={sectionCard}>
        <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
          Site / Unit Selection
        </p>

        {/* Project */}
        <label>
          <span style={labelStyle}>Project <span style={{ color: "#e02424" }}>*</span></span>
          <select value={selectedProject} onChange={(e) => {
            setSelectedProject(e.target.value);
            setSelectedBlock(""); setCheckedUnits(new Set()); setSelectedNtp(""); setActivityChecks({});
          }} style={inputStyle} required>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        {/* Block dropdown */}
        {selectedProject && (
          <label>
            <span style={labelStyle}>Block</span>
            <select value={selectedBlock} onChange={(e) => {
              setSelectedBlock(e.target.value); setCheckedUnits(new Set()); setSelectedNtp(""); setActivityChecks({});
            }} style={inputStyle}>
              <option value="">All Blocks</option>
              {projectBlocks.map((b) => <option key={b.id} value={b.id}>{b.blockName}</option>)}
            </select>
          </label>
        )}

        {/* Units checkboxes */}
        {selectedProject && (
          <div>
            <div style={{ ...labelStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Units <span style={{ color: "#e02424" }}>*</span></span>
              <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 400 }}>{checkedUnits.size} selected</span>
            </div>
            {blockUnits.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: 0 }}>No units found.</p>
            ) : (
              <div style={{ border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ padding: "0.5rem 0.85rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <input type="checkbox"
                    checked={checkedUnits.size === blockUnits.length && blockUnits.length > 0}
                    onChange={toggleAllBlockUnits} style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>Select All</span>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexWrap: "wrap", gap: "0.25rem", padding: "0.5rem" }}>
                  {blockUnits.map((u) => (
                    <label key={u.id} style={{
                      display: "inline-flex", alignItems: "center", gap: "0.4rem",
                      padding: "0.3rem 0.65rem", borderRadius: "6px", cursor: "pointer",
                      background: checkedUnits.has(u.id) ? "#f0fdf4" : "#f9fafb",
                      border: checkedUnits.has(u.id) ? `1px solid ${ACCENT}` : "1px solid #e5e7eb",
                      fontSize: "0.82rem",
                    }}>
                      <input type="checkbox" checked={checkedUnits.has(u.id)} onChange={() => toggleUnit(u.id)} style={{ cursor: "pointer" }} />
                      <span style={{ fontWeight: 600, color: "#111827" }}>{u.unitCode}</span>
                      <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{u.unitType}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 2: NTP + Subcontractor ── */}
      {checkedUnits.size > 0 && (
        <div style={sectionCard}>
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
            Task Assignment
          </p>

          <label>
            <span style={labelStyle}>Task Assignment (NTP) <span style={{ color: "#e02424" }}>*</span></span>
            {ntpOptions.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: 0 }}>No active NTPs for selected units.</p>
            ) : (
              <select value={selectedNtp} onChange={(e) => { setSelectedNtp(e.target.value); setActivityChecks({}); }} style={inputStyle} required>
                <option value="">Select NTP…</option>
                {ntpOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.subconName} — {a.category}{a.scopeName ? ` / ${a.scopeName}` : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedNtpObj?.scopeName && (
              <span style={{ display: "inline-block", marginTop: "0.4rem", padding: "0.2rem 0.5rem", background: "#dcfce7", color: "#166534", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600 }}>
                Scope: {selectedNtpObj.scopeName}
              </span>
            )}
          </label>

          <label>
            <span style={labelStyle}>Subcontractor <span style={{ color: "#e02424" }}>*</span></span>
            <select value={selectedSubcon} onChange={(e) => setSelectedSubcon(e.target.value)} style={inputStyle} required>
              <option value="">Select subcontractor…</option>
              {allSubcons.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* ── SECTION 3: Activity Checklist ── */}
      {selectedNtp && (
        <div style={sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
              Activities
            </p>
            {scopeActivities.length > 0 && (
              <button type="button" onClick={markAllActivities} style={{
                fontSize: "0.75rem", color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0,
              }}>
                Check All
              </button>
            )}
          </div>

          {scopeActivities.length === 0 ? (
            <div style={{ padding: "0.85rem 1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "0.85rem", color: "#92400e" }}>
              {selectedNtpObj?.phaseScopeId
                ? "No activities defined for this scope."
                : "This NTP has no scope assigned. Activities cannot be filtered."}
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
                      <select
                        value={status}
                        onChange={(e) => setActivityStatus(act.id, e.target.value as ActivityStatus)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem", border: "1px solid #d1d5db", borderRadius: "5px", background: "#fff", cursor: "pointer" }}
                      >
                        {ACTIVITY_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {checkedActivityIds.length > 0 && (
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

      {/* ── SECTION 4: Entry Details ── */}
      {selectedNtp && (
        <div style={sectionCard}>
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
            Entry Details
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label>
              <span style={labelStyle}>Entry Date <span style={{ color: "#e02424" }}>*</span></span>
              <input type="date" required value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Manpower Count <span style={{ color: "#e02424" }}>*</span></span>
              <input type="number" min="0" required value={manpower}
                onChange={(e) => setManpower(Number(e.target.value))} style={inputStyle} />
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
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Describe any issues or delays…" />
          </label>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/construction" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending || checkedUnits.size === 0 || !selectedNtp || checkedActivityIds.length === 0} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: (isPending || checkedUnits.size === 0 || !selectedNtp || checkedActivityIds.length === 0) ? "#6ee7b7" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: (isPending || checkedUnits.size === 0 || !selectedNtp || checkedActivityIds.length === 0) ? "not-allowed" : "pointer",
        }}>
          {isPending
            ? "Saving…"
            : checkedActivityIds.length > 0
              ? `Log ${checkedActivityIds.length} activit${checkedActivityIds.length > 1 ? "ies" : "y"} for ${checkedUnits.size} unit${checkedUnits.size > 1 ? "s" : ""}`
              : "Log Progress"}
        </button>
      </div>
    </form>
  );
}
