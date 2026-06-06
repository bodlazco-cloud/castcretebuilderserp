"use client";

import { useState, useTransition } from "react";
import { createDeveloperRateCard, updateDeveloperRateCard, toggleDeveloperRateCardActive, createDevRateCardDeduction, deleteDevRateCardDeduction } from "@/actions/master-list";
import { useRouter } from "next/navigation";

type RateCard = {
  id: string;
  projectId: string;
  projectName: string | null;
  phaseScopeId: string | null;
  phaseActivityId: string | null;
  unitModel: string | null;
  unitType: string | null;
  phaseCategoryName: string | null;
  phaseScopeName: string | null;
  phaseActivityCode: string | null;
  phaseActivityName: string | null;
  grossRatePerUnit: string;
  retentionPct: string;
  dpRecoupmentPct: string;
  taxPct: string;
  version: number;
  isActive: boolean;
};

type Deduction = { id: string; rateCardId: string; name: string; deductionPct: string; isActive: boolean };
type Project = { id: string; name: string };
type PhaseCategory = { id: string; name: string };
type PhaseScope = { id: string; categoryId: string; name: string };
type PhaseActivity = { id: string; scopeId: string; code: string; name: string };
type UnitModelOption = { projectId: string; projectName: string; unitModel: string; unitType: string };

const ACCENT = "#6366f1";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};
const LABEL: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" };
const VALUE: React.CSSProperties = { fontSize: "0.88rem", color: "#111827", fontWeight: 500 };

const UNIT_TYPES = [
  { value: "BEG",  label: "BEG – Beginning unit" },
  { value: "MID",  label: "MID – Middle unit" },
  { value: "END",  label: "END – End unit" },
  { value: "SHOP", label: "SHOP – Shop lot" },
];

function DeductionRow({ d, isPending, onDelete }: { d: Deduction; isPending: boolean; onDelete: (id: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f9fafb", borderRadius: "5px", padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>
      <span style={{ flex: 1, color: "#374151", fontWeight: 500 }}>{d.name}</span>
      <span style={{ color: "#6b7280", minWidth: "50px", textAlign: "right" }}>{(Number(d.deductionPct) * 100).toFixed(2)}%</span>
      <button
        onClick={() => onDelete(d.id)}
        disabled={isPending}
        style={{ background: "none", border: "none", color: "#b91c1c", cursor: isPending ? "not-allowed" : "pointer", fontSize: "0.75rem", fontWeight: 600, padding: "0.1rem 0.4rem" }}
      >✕</button>
    </div>
  );
}

function AddDeductionForm({ rateCardId, onAdded }: { rateCardId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [pct, setPct] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDevRateCardDeduction(rateCardId, { name, deductionPct: Number(pct) / 100 });
      if (result.success) { setName(""); setPct(""); onAdded(); router.refresh(); }
      else setError(result.error ?? "Error saving.");
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", marginTop: "0.5rem" }}>
      <div style={{ flex: 2 }}>
        <span style={{ ...labelStyle, fontSize: "0.72rem" }}>Label *</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SSS contribution" style={{ ...inputStyle, padding: "0.4rem 0.6rem" }} />
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ ...labelStyle, fontSize: "0.72rem" }}>Rate %</span>
        <input required type="number" min="0" max="100" step="0.01" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="2.00" style={{ ...inputStyle, padding: "0.4rem 0.6rem" }} />
      </div>
      <button type="submit" disabled={isPending} style={{ padding: "0.4rem 0.9rem", borderRadius: "5px", background: isPending ? "#a5b4fc" : ACCENT, color: "#fff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
        {isPending ? "…" : "+ Add"}
      </button>
      {error && <span style={{ color: "#b91c1c", fontSize: "0.75rem" }}>{error}</span>}
    </form>
  );
}

const BLANK_EDIT = { project: "", category: "", scope: "", activity: "", unitModel: "", unitType: "", grossRate: "", retentionPct: "10", dpRecoupmentPct: "10", taxPct: "0" };

export function DevRateCards({
  devProjects, rateCards, deductions, phaseCategories, phaseScopes, phaseActivities, unitModelOptions, isAdmin,
}: {
  devProjects: Project[];
  rateCards: RateCard[];
  deductions: Deduction[];
  phaseCategories: PhaseCategory[];
  phaseScopes: PhaseScope[];
  phaseActivities: PhaseActivity[];
  unitModelOptions: UnitModelOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedScope, setSelectedScope] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [unitModel, setUnitModel] = useState("");
  const [unitType, setUnitType] = useState("");
  const [grossRate, setGrossRate] = useState("");
  const [retentionPct, setRetentionPct] = useState("10");
  const [dpRecoupmentPct, setDpRecoupmentPct] = useState("10");
  const [taxPct, setTaxPct] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openDeductions, setOpenDeductions] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT);

  const filteredScopes = phaseScopes.filter((s) => s.categoryId === selectedCategory);
  const filteredActivities = phaseActivities.filter((a) => a.scopeId === selectedScope);
  const editFilteredScopes = phaseScopes.filter((s) => s.categoryId === editForm.category);
  const editFilteredActivities = phaseActivities.filter((a) => a.scopeId === editForm.scope);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDeveloperRateCard({
        projectId:        selectedProject,
        phaseScopeId:     selectedScope || undefined,
        phaseActivityId:  selectedActivity || undefined,
        unitModel:        unitModel || undefined,
        unitType:         (unitType as "BEG" | "MID" | "END" | "SHOP") || undefined,
        grossRatePerUnit: Number(grossRate),
        retentionPct:     Number(retentionPct) / 100,
        dpRecoupmentPct:  Number(dpRecoupmentPct) / 100,
        taxPct:           Number(taxPct) / 100,
      });
      if (result.success) {
        setShowForm(false);
        setSelectedProject(""); setSelectedCategory(""); setSelectedScope(""); setSelectedActivity("");
        setUnitModel(""); setUnitType(""); setGrossRate(""); setRetentionPct("10"); setDpRecoupmentPct("10"); setTaxPct("0");
        router.refresh();
      } else {
        setError(result.error ?? "Error saving rate card.");
      }
    });
  }

  function handleEditStart(rc: RateCard) {
    const act = phaseActivities.find((a) => a.id === rc.phaseActivityId);
    const scopeViaAct = act ? phaseScopes.find((s) => s.id === act.scopeId) : null;
    const scopeDirect = phaseScopes.find((s) => s.id === rc.phaseScopeId);
    const resolvedScope = scopeViaAct ?? scopeDirect ?? null;
    setEditForm({
      project:        rc.projectId,
      category:       resolvedScope?.categoryId ?? "",
      scope:          resolvedScope?.id ?? "",
      activity:       rc.phaseActivityId ?? "",
      unitModel:      rc.unitModel ?? "",
      unitType:       rc.unitType ?? "",
      grossRate:      String(Number(rc.grossRatePerUnit)),
      retentionPct:   String((Number(rc.retentionPct) * 100).toFixed(2)),
      dpRecoupmentPct: String((Number(rc.dpRecoupmentPct) * 100).toFixed(2)),
      taxPct:         String((Number(rc.taxPct) * 100).toFixed(2)),
    });
    setEditingId(rc.id);
    setError(null);
  }

  function handleEditSubmit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateDeveloperRateCard(id, {
        projectId:        editForm.project,
        phaseScopeId:     editForm.scope || undefined,
        phaseActivityId:  editForm.activity || undefined,
        unitModel:        editForm.unitModel || undefined,
        unitType:         (editForm.unitType as "BEG" | "MID" | "END" | "SHOP") || undefined,
        grossRatePerUnit: Number(editForm.grossRate),
        retentionPct:     Number(editForm.retentionPct) / 100,
        dpRecoupmentPct:  Number(editForm.dpRecoupmentPct) / 100,
        taxPct:           Number(editForm.taxPct) / 100,
      });
      if (result.success) {
        setEditingId(null);
        setEditForm(BLANK_EDIT);
        router.refresh();
      } else {
        setError(result.error ?? "Error saving.");
      }
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleDeveloperRateCardActive(id, isActive);
      router.refresh();
    });
  }

  function handleDeleteDeduction(id: string) {
    startTransition(async () => {
      await deleteDevRateCardDeduction(id);
      router.refresh();
    });
  }

  function setEdit(field: keyof typeof BLANK_EDIT, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          Rate Cards ({rateCards.length})
        </h2>
        {isAdmin && (
          <button
            onClick={() => { setShowForm((v) => !v); setEditingId(null); }}
            style={{ padding: "0.45rem 1rem", borderRadius: "6px", background: ACCENT, color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
          >
            {showForm ? "Cancel" : "+ Add Rate Card"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", marginBottom: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <label>
              <span style={labelStyle}>Project (Site) *</span>
              <select required value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={inputStyle}>
                <option value="">Select project…</option>
                {devProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Phase Category</span>
              <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedScope(""); setSelectedActivity(""); }} style={inputStyle}>
                <option value="">Select category…</option>
                {phaseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Scope of Work</span>
              <select value={selectedScope} onChange={(e) => { setSelectedScope(e.target.value); setSelectedActivity(""); }} style={inputStyle} disabled={!selectedCategory}>
                <option value="">Select scope…</option>
                {filteredScopes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Activity</span>
              <select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} style={inputStyle} disabled={!selectedScope}>
                <option value="">Select activity…</option>
                {filteredActivities.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <label>
              <span style={labelStyle}>Unit Model</span>
              <select value={unitModel} onChange={(e) => { setUnitModel(e.target.value); const match = unitModelOptions.find((u) => u.unitModel === e.target.value); if (match && !unitType) setUnitType(match.unitType); }} style={inputStyle}>
                <option value="">Any / not specified</option>
                {[...new Set(unitModelOptions.map((u) => u.unitModel))].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Unit Type</span>
              <select value={unitType} onChange={(e) => setUnitType(e.target.value)} style={inputStyle}>
                <option value="">Any / not specified</option>
                {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <label>
              <span style={labelStyle}>Gross Rate / Unit *</span>
              <input type="number" required min="0" step="0.01" value={grossRate} onChange={(e) => setGrossRate(e.target.value)} placeholder="0.00" style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Retention %</span>
              <input type="number" min="0" max="100" step="0.01" value={retentionPct} onChange={(e) => setRetentionPct(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>DP Recoupment %</span>
              <input type="number" min="0" max="100" step="0.01" value={dpRecoupmentPct} onChange={(e) => setDpRecoupmentPct(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Tax %</span>
              <input type="number" min="0" max="100" step="0.01" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} style={inputStyle} />
            </label>
          </div>
          {error && <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem", marginBottom: "1rem" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={isPending} style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", background: isPending ? "#a5b4fc" : ACCENT, color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "Saving…" : "Save Rate Card"}
            </button>
          </div>
        </form>
      )}

      {rateCards.length === 0 ? (
        <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
          No rate cards set up yet. Add one above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rateCards.map((rc) => {
            const rcDeductions = deductions.filter((d) => d.rateCardId === rc.id);
            const showDed = openDeductions === rc.id;
            const isEditing = editingId === rc.id;

            return (
              <div key={rc.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "0.9rem 1.25rem", opacity: rc.isActive ? 1 : 0.6 }}>
                {isEditing ? (
                  <form onSubmit={(e) => handleEditSubmit(e, rc.id)}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", marginBottom: "0.75rem" }}>Edit Rate Card</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <label>
                        <span style={labelStyle}>Project (Site) *</span>
                        <select required value={editForm.project} onChange={(e) => setEdit("project", e.target.value)} style={inputStyle}>
                          <option value="">Select project…</option>
                          {devProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </label>
                      <label>
                        <span style={labelStyle}>Phase Category</span>
                        <select value={editForm.category} onChange={(e) => { setEdit("category", e.target.value); setEdit("scope", ""); setEdit("activity", ""); }} style={inputStyle}>
                          <option value="">Select category…</option>
                          {phaseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>
                      <label>
                        <span style={labelStyle}>Scope of Work</span>
                        <select value={editForm.scope} onChange={(e) => { setEdit("scope", e.target.value); setEdit("activity", ""); }} style={inputStyle} disabled={!editForm.category}>
                          <option value="">Select scope…</option>
                          {editFilteredScopes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </label>
                      <label>
                        <span style={labelStyle}>Activity</span>
                        <select value={editForm.activity} onChange={(e) => setEdit("activity", e.target.value)} style={inputStyle} disabled={!editForm.scope}>
                          <option value="">Select activity…</option>
                          {editFilteredActivities.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <label>
                        <span style={labelStyle}>Unit Model</span>
                        <select value={editForm.unitModel} onChange={(e) => setEdit("unitModel", e.target.value)} style={inputStyle}>
                          <option value="">Any / not specified</option>
                          {[...new Set(unitModelOptions.map((u) => u.unitModel))].map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </label>
                      <label>
                        <span style={labelStyle}>Unit Type</span>
                        <select value={editForm.unitType} onChange={(e) => setEdit("unitType", e.target.value)} style={inputStyle}>
                          <option value="">Any / not specified</option>
                          {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <label>
                        <span style={labelStyle}>Gross Rate / Unit *</span>
                        <input type="number" required min="0" step="0.01" value={editForm.grossRate} onChange={(e) => setEdit("grossRate", e.target.value)} style={inputStyle} />
                      </label>
                      <label>
                        <span style={labelStyle}>Retention %</span>
                        <input type="number" min="0" max="100" step="0.01" value={editForm.retentionPct} onChange={(e) => setEdit("retentionPct", e.target.value)} style={inputStyle} />
                      </label>
                      <label>
                        <span style={labelStyle}>DP Recoupment %</span>
                        <input type="number" min="0" max="100" step="0.01" value={editForm.dpRecoupmentPct} onChange={(e) => setEdit("dpRecoupmentPct", e.target.value)} style={inputStyle} />
                      </label>
                      <label>
                        <span style={labelStyle}>Tax %</span>
                        <input type="number" min="0" max="100" step="0.01" value={editForm.taxPct} onChange={(e) => setEdit("taxPct", e.target.value)} style={inputStyle} />
                      </label>
                    </div>
                    {error && <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</div>}
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => { setEditingId(null); setError(null); }} style={{ padding: "0.4rem 0.9rem", borderRadius: "5px", background: "#f3f4f6", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151", cursor: "pointer" }}>Cancel</button>
                      <button type="submit" disabled={isPending} style={{ padding: "0.4rem 1rem", borderRadius: "5px", background: isPending ? "#a5b4fc" : ACCENT, color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
                        {isPending ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: "1rem", alignItems: "center" }}>
                      <div>
                        <div style={LABEL}>{rc.projectName ?? "—"}</div>
                        {(() => {
                          const catName = rc.phaseCategoryName ?? (() => { const sc = phaseScopes.find(s => s.id === rc.phaseScopeId); return sc ? phaseCategories.find(c => c.id === sc.categoryId)?.name ?? null : null; })();
                          const scName  = rc.phaseScopeName  ?? phaseScopes.find(s => s.id === rc.phaseScopeId)?.name ?? null;
                          return catName ? <div style={{ fontSize: "0.72rem", color: "#6366f1", fontWeight: 600, marginBottom: "0.1rem" }}>{catName} › {scName}</div> : null;
                        })()}
                        <div style={VALUE}>{rc.phaseActivityCode ? `${rc.phaseActivityCode} – ` : ""}{rc.phaseActivityName ?? (rc.phaseScopeId ? "" : "—")}</div>
                        {(rc.unitModel || rc.unitType) && (
                          <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.15rem" }}>
                            {rc.unitModel && <span style={{ marginRight: "0.5rem" }}>Model: {rc.unitModel}</span>}
                            {rc.unitType && <span>Type: {rc.unitType}</span>}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={LABEL}>Gross Rate</div>
                        <div style={{ ...VALUE, fontWeight: 700 }}>PHP {Number(rc.grossRatePerUnit).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <div style={LABEL}>Retention</div>
                        <div style={VALUE}>{(Number(rc.retentionPct) * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={LABEL}>DP Recoup</div>
                        <div style={VALUE}>{(Number(rc.dpRecoupmentPct) * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={LABEL}>Tax</div>
                        <div style={VALUE}>{(Number(rc.taxPct) * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-end" }}>
                        {isAdmin && (
                          <button onClick={() => handleEditStart(rc)} style={{ padding: "0.3rem 0.75rem", borderRadius: "5px", border: "1px solid #d1d5db", fontSize: "0.75rem", fontWeight: 600, background: "#fff", color: "#374151", cursor: "pointer" }}>
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleToggle(rc.id, !rc.isActive)} disabled={isPending} style={{ padding: "0.3rem 0.75rem", borderRadius: "5px", border: "none", fontSize: "0.75rem", fontWeight: 600, background: rc.isActive ? "#fee2e2" : "#dcfce7", color: rc.isActive ? "#991b1b" : "#166534", cursor: isPending ? "not-allowed" : "pointer" }}>
                            {rc.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setOpenDeductions(showDed ? null : rc.id)} style={{ padding: "0.3rem 0.75rem", borderRadius: "5px", border: "1px solid #d1d5db", fontSize: "0.75rem", fontWeight: 600, background: "#fff", color: "#374151", cursor: "pointer" }}>
                            Deductions {rcDeductions.length > 0 ? `(${rcDeductions.length})` : ""}
                          </button>
                        )}
                      </div>
                    </div>

                    {showDed && (
                      <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f3f4f6" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>Additional Billing Deductions</div>
                        {rcDeductions.length === 0 ? (
                          <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "0.4rem" }}>No extra deductions yet.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.5rem" }}>
                            {rcDeductions.map((d) => <DeductionRow key={d.id} d={d} isPending={isPending} onDelete={handleDeleteDeduction} />)}
                          </div>
                        )}
                        <AddDeductionForm rateCardId={rc.id} onAdded={() => setOpenDeductions(rc.id)} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
