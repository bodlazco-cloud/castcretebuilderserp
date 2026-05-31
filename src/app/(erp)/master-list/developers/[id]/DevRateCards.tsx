"use client";

import { useState, useTransition } from "react";
import { createDeveloperRateCard, toggleDeveloperRateCardActive, createDevRateCardDeduction, deleteDevRateCardDeduction } from "@/actions/master-list";
import { useRouter } from "next/navigation";

type RateCard = {
  id: string;
  projectName: string | null;
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

  const filteredScopes = phaseScopes.filter((s) => s.categoryId === selectedCategory);
  const filteredActivities = phaseActivities.filter((a) => a.scopeId === selectedScope);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDeveloperRateCard({
        projectId:        selectedProject,
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

  return (
    <div style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          Rate Cards ({rateCards.length})
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
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
              <select
                value={unitModel}
                onChange={(e) => {
                  setUnitModel(e.target.value);
                  const match = unitModelOptions.find((u) => u.unitModel === e.target.value);
                  if (match && !unitType) setUnitType(match.unitType);
                }}
                style={inputStyle}
              >
                <option value="">Any / not specified</option>
                {[...new Set(unitModelOptions.map((u) => u.unitModel))].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
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
              <span style={labelStyle}>Gross Rate / Unit (PHP) *</span>
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

          {error && (
            <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={isPending} style={{
              padding: "0.5rem 1.25rem", borderRadius: "6px", background: isPending ? "#a5b4fc" : ACCENT,
              color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}>
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
            return (
              <div key={rc.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "0.9rem 1.25rem", opacity: rc.isActive ? 1 : 0.6 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: "1rem", alignItems: "center" }}>
                  <div>
                    <div style={LABEL}>{rc.projectName ?? "—"}</div>
                    {rc.phaseCategoryName && <div style={{ fontSize: "0.72rem", color: "#6366f1", fontWeight: 600, marginBottom: "0.1rem" }}>{rc.phaseCategoryName} › {rc.phaseScopeName}</div>}
                    <div style={VALUE}>{rc.phaseActivityCode ? `${rc.phaseActivityCode} – ` : ""}{rc.phaseActivityName ?? "—"}</div>
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
                      <button
                        onClick={() => handleToggle(rc.id, !rc.isActive)}
                        disabled={isPending}
                        style={{ padding: "0.3rem 0.75rem", borderRadius: "5px", border: "none", fontSize: "0.75rem", fontWeight: 600, background: rc.isActive ? "#fee2e2" : "#dcfce7", color: rc.isActive ? "#991b1b" : "#166534", cursor: isPending ? "not-allowed" : "pointer" }}
                      >
                        {rc.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setOpenDeductions(showDed ? null : rc.id)}
                        style={{ padding: "0.3rem 0.75rem", borderRadius: "5px", border: "1px solid #d1d5db", fontSize: "0.75rem", fontWeight: 600, background: "#fff", color: "#374151", cursor: "pointer" }}
                      >
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
                        {rcDeductions.map((d) => (
                          <DeductionRow key={d.id} d={d} isPending={isPending} onDelete={handleDeleteDeduction} />
                        ))}
                      </div>
                    )}
                    <AddDeductionForm rateCardId={rc.id} onAdded={() => setOpenDeductions(rc.id)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
