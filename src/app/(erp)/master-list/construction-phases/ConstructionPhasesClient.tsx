"use client";

import { useState, useTransition } from "react";
import {
  createPhaseCategory, updatePhaseCategory, deletePhaseCategory, togglePhaseCategoryActive,
  createPhaseScope, updatePhaseScope, deletePhaseScope, togglePhaseScopeActive,
  createPhaseActivity, updatePhaseActivity, deletePhaseActivity, togglePhaseActivityActive,
  createPhaseBillingMilestone, updatePhaseBillingMilestone, deletePhaseBillingMilestone,
} from "@/actions/master-list";

const ACCENT = "#1a56db";
const TABS = ["Category", "Scope of Work", "Activity", "Billing Milestones"] as const;
type Tab = typeof TABS[number];

type Category      = { id: string; code: string; name: string; sequenceOrder: number; isActive: boolean };
type Scope         = { id: string; categoryId: string; code: string; name: string; sequenceOrder: number; isActive: boolean };
type Activity      = { id: string; scopeId: string; code: string; name: string; standardDurationDays: number; weightInScopePct: string; sequenceOrder: number; isActive: boolean };
type BillingMs     = { id: string; categoryId: string; name: string; weightPct: string; triggersBilling: boolean; sequenceOrder: number; notes: string | null; isActive: boolean };

interface Props {
  categories:       Category[];
  scopes:           Scope[];
  activities:       Activity[];
  billingMilestones: BillingMs[];
  dbError:          string | null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", width: "100%", maxWidth: "480px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#6b7280", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.45rem 0.65rem", border: "1px solid #d1d5db",
  borderRadius: "6px", fontSize: "0.875rem", color: "#111827", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = { ...inputStyle, background: "#fff" };

function ActionRow({ onClose, pending, error }: { onClose: () => void; pending: boolean; error?: string }) {
  return (
    <>
      {error && <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} disabled={pending} style={{ padding: "0.45rem 1rem", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", fontSize: "0.875rem", cursor: "pointer" }}>
          Cancel
        </button>
        <button type="submit" disabled={pending} style={{ padding: "0.45rem 1.1rem", borderRadius: "6px", background: ACCENT, color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

// ─── Category Modal ───────────────────────────────────────────────────────────

function CategoryModal({ initial, onClose }: { initial?: Category; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [seq, setSeq] = useState(String(initial?.sequenceOrder ?? 0));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const input = { code: code.trim(), name: name.trim(), sequenceOrder: Number(seq) };
      const res = initial
        ? await updatePhaseCategory(initial.id, input)
        : await createPhaseCategory(input);
      if (res.success) onClose();
      else setError((res as { success: false; error: string }).error);
    });
  }

  return (
    <Modal title={initial ? "Edit Category" : "Add Category"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Code *">
          <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SLAB" required />
        </Field>
        <Field label="Name *">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Slab Works" required />
        </Field>
        <Field label="Sequence Order">
          <input style={inputStyle} type="number" min={0} value={seq} onChange={(e) => setSeq(e.target.value)} />
        </Field>
        <ActionRow onClose={onClose} pending={pending} error={error} />
      </form>
    </Modal>
  );
}

// ─── Scope Modal ──────────────────────────────────────────────────────────────

function ScopeModal({ initial, categories, onClose }: { initial?: Scope; categories: Category[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [catId, setCatId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [seq, setSeq] = useState(String(initial?.sequenceOrder ?? 0));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const input = { categoryId: catId, code: code.trim(), name: name.trim(), sequenceOrder: Number(seq) };
      const res = initial
        ? await updatePhaseScope(initial.id, input)
        : await createPhaseScope(input);
      if (res.success) onClose();
      else setError((res as { success: false; error: string }).error);
    });
  }

  return (
    <Modal title={initial ? "Edit Scope of Work" : "Add Scope of Work"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Category *">
          <select style={selectStyle} value={catId} onChange={(e) => setCatId(e.target.value)} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Code *">
          <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SLAB-SOW-01" required />
        </Field>
        <Field label="Name *">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ground Floor Slab" required />
        </Field>
        <Field label="Sequence Order">
          <input style={inputStyle} type="number" min={0} value={seq} onChange={(e) => setSeq(e.target.value)} />
        </Field>
        <ActionRow onClose={onClose} pending={pending} error={error} />
      </form>
    </Modal>
  );
}

// ─── Activity Modal ───────────────────────────────────────────────────────────

function ActivityModal({ initial, scopes, categories, onClose }: { initial?: Activity; scopes: Scope[]; categories: Category[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [scopeId, setScopeId] = useState(initial?.scopeId ?? scopes[0]?.id ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [days, setDays] = useState(String(initial?.standardDurationDays ?? 1));
  const [weight, setWeight] = useState(String(initial?.weightInScopePct ?? 0));
  const [seq, setSeq] = useState(String(initial?.sequenceOrder ?? 0));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const input = {
        scopeId, code: code.trim(), name: name.trim(),
        standardDurationDays: Number(days), weightInScopePct: Number(weight), sequenceOrder: Number(seq),
      };
      const res = initial
        ? await updatePhaseActivity(initial.id, input)
        : await createPhaseActivity(input);
      if (res.success) onClose();
      else setError((res as { success: false; error: string }).error);
    });
  }

  const scopesByCat = categories.map((c) => ({
    cat: c,
    scopes: scopes.filter((s) => s.categoryId === c.id),
  })).filter((g) => g.scopes.length > 0);

  return (
    <Modal title={initial ? "Edit Activity" : "Add Activity"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Scope of Work *">
          <select style={selectStyle} value={scopeId} onChange={(e) => setScopeId(e.target.value)} required>
            {scopesByCat.map((g) => (
              <optgroup key={g.cat.id} label={g.cat.name}>
                {g.scopes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            ))}
            {scopes.filter((s) => !categories.some((c) => c.id === s.categoryId)).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Code *">
          <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ACT-001" required />
        </Field>
        <Field label="Name *">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rebar Installation" required />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
          <Field label="Duration (days)">
            <input style={inputStyle} type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
          <Field label="Weight (%)">
            <input style={inputStyle} type="number" min={0} max={100} step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Sequence">
            <input style={inputStyle} type="number" min={0} value={seq} onChange={(e) => setSeq(e.target.value)} />
          </Field>
        </div>
        <ActionRow onClose={onClose} pending={pending} error={error} />
      </form>
    </Modal>
  );
}

// ─── Billing Milestone Modal ──────────────────────────────────────────────────

function BillingMilestoneModal({ initial, categories, onClose }: { initial?: BillingMs; categories: Category[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [catId, setCatId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [weight, setWeight] = useState(String(initial?.weightPct ?? 0));
  const [triggers, setTriggers] = useState(initial?.triggersBilling ?? true);
  const [seq, setSeq] = useState(String(initial?.sequenceOrder ?? 0));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const input = {
        categoryId: catId, name: name.trim(), weightPct: Number(weight),
        triggersBilling: triggers, sequenceOrder: Number(seq), notes: notes.trim() || undefined,
      };
      const res = initial
        ? await updatePhaseBillingMilestone(initial.id, input)
        : await createPhaseBillingMilestone(input);
      if (res.success) onClose();
      else setError((res as { success: false; error: string }).error);
    });
  }

  return (
    <Modal title={initial ? "Edit Billing Milestone" : "Add Billing Milestone"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Category *">
          <select style={selectStyle} value={catId} onChange={(e) => setCatId(e.target.value)} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Milestone Name *">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 25% Slab Completion" required />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
          <Field label="Weight (%)">
            <input style={inputStyle} type="number" min={0} max={100} step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Sequence">
            <input style={inputStyle} type="number" min={0} value={seq} onChange={(e) => setSeq(e.target.value)} />
          </Field>
        </div>
        <Field label="Triggers Billing">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
            <input type="checkbox" checked={triggers} onChange={(e) => setTriggers(e.target.checked)} />
            Yes — this milestone unlocks a billing request
          </label>
        </Field>
        <Field label="Notes">
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: "64px" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
        </Field>
        <ActionRow onClose={onClose} pending={pending} error={error} />
      </form>
    </Modal>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function Badge({ active }: { active: boolean }) {
  return (
    <span style={{
      padding: "0.1rem 0.45rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700,
      background: active ? "#dcfce7" : "#f3f4f6", color: active ? "#166534" : "#6b7280",
    }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th style={{ padding: "0.45rem 0.75rem", textAlign: right ? "right" : "left", fontWeight: 600, fontSize: "0.72rem", color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
    {children}
  </th>
);

const TD = ({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) => (
  <td style={{ padding: "0.45rem 0.75rem", fontSize: "0.82rem", color: "#111827", textAlign: right ? "right" : "left", fontFamily: mono ? "monospace" : undefined }}>
    {children}
  </td>
);

function ActionBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: "0.2rem 0.5rem", borderRadius: "5px", border: "1px solid",
      borderColor: danger ? "#fecaca" : "#e5e7eb",
      background: danger ? "#fef2f2" : "#f9fafb",
      color: danger ? "#dc2626" : "#374151",
      fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap",
    }}>
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConstructionPhasesClient({ categories, scopes, activities, billingMilestones, dbError }: Props) {
  const [tab, setTab] = useState<Tab>("Category");
  const [modal, setModal] = useState<
    | { type: "cat-add" }
    | { type: "cat-edit"; item: Category }
    | { type: "scope-add" }
    | { type: "scope-edit"; item: Scope }
    | { type: "act-add" }
    | { type: "act-edit"; item: Activity }
    | { type: "bm-add" }
    | { type: "bm-edit"; item: BillingMs }
    | null
  >(null);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");

  function catName(id: string) { return categories.find((c) => c.id === id)?.name ?? "—"; }
  function scopeName(id: string) { return scopes.find((s) => s.id === id)?.name ?? "—"; }

  function handleDelete(type: "cat" | "scope" | "act" | "bm", id: string) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    setActionError("");
    startTransition(async () => {
      let res: { success: boolean; error?: string };
      if (type === "cat")   res = await deletePhaseCategory(id);
      else if (type === "scope") res = await deletePhaseScope(id);
      else if (type === "act")   res = await deletePhaseActivity(id);
      else                       res = await deletePhaseBillingMilestone(id);
      if (!res.success) setActionError(res.error ?? "Delete failed.");
    });
  }

  function handleToggle(type: "cat" | "scope" | "act", id: string, current: boolean) {
    startTransition(async () => {
      if (type === "cat")   await togglePhaseCategoryActive(id, !current);
      else if (type === "scope") await togglePhaseScopeActive(id, !current);
      else                       await togglePhaseActivityActive(id, !current);
    });
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Construction Phases</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            Manage generic categories, scopes of work, activities, and billing milestones.
          </p>
        </div>

        {dbError && (
          <div style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "0.875rem" }}>
            <strong>Database error:</strong> {dbError}
            <br /><span style={{ fontSize: "0.8rem" }}>Run migration 016 in Supabase SQL Editor to create the required tables.</span>
          </div>
        )}

        {actionError && (
          <div style={{ padding: "0.75rem 1rem", marginBottom: "1rem", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "0.8rem" }}>
            {actionError}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "2px solid #e5e7eb" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "0.55rem 1.1rem", border: "none", background: "transparent",
              cursor: "pointer", fontSize: "0.875rem", fontWeight: tab === t ? 700 : 400,
              color: tab === t ? ACCENT : "#6b7280",
              borderBottom: tab === t ? `2px solid ${ACCENT}` : "2px solid transparent",
              marginBottom: "-2px", transition: "color 0.15s",
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Category Tab ── */}
        {tab === "Category" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontWeight: 600, color: "#111827" }}>{categories.length} categories</span>
              <button onClick={() => setModal({ type: "cat-add" })} style={{ padding: "0.4rem 0.9rem", borderRadius: "6px", background: ACCENT, color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                + Add Category
              </button>
            </div>
            {categories.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No categories yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Code</TH><TH>Name</TH><TH right>Seq</TH><TH>Status</TH><TH right>Actions</TH></tr></thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <TD mono>{c.code}</TD>
                      <TD>{c.name}</TD>
                      <TD right>{c.sequenceOrder}</TD>
                      <TD><Badge active={c.isActive} /></TD>
                      <TD right>
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          <ActionBtn onClick={() => setModal({ type: "cat-edit", item: c })}>Edit</ActionBtn>
                          <ActionBtn onClick={() => handleToggle("cat", c.id, c.isActive)}>{c.isActive ? "Deactivate" : "Activate"}</ActionBtn>
                          <ActionBtn danger onClick={() => handleDelete("cat", c.id)}>Delete</ActionBtn>
                        </div>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Scope of Work Tab ── */}
        {tab === "Scope of Work" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontWeight: 600, color: "#111827" }}>{scopes.length} scopes</span>
              <button onClick={() => setModal({ type: "scope-add" })} disabled={categories.length === 0} style={{ padding: "0.4rem 0.9rem", borderRadius: "6px", background: categories.length === 0 ? "#e5e7eb" : ACCENT, color: categories.length === 0 ? "#9ca3af" : "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: categories.length === 0 ? "not-allowed" : "pointer" }}>
                + Add Scope
              </button>
            </div>
            {categories.length === 0 && (
              <div style={{ padding: "1rem 1.25rem", color: "#92400e", background: "#fffbeb", fontSize: "0.8rem" }}>
                Add at least one Category first before creating scopes.
              </div>
            )}
            {scopes.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No scopes yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Code</TH><TH>Name</TH><TH>Category</TH><TH right>Seq</TH><TH>Status</TH><TH right>Actions</TH></tr></thead>
                <tbody>
                  {scopes.map((s) => (
                    <tr key={s.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <TD mono>{s.code}</TD>
                      <TD>{s.name}</TD>
                      <TD><span style={{ fontSize: "0.78rem", padding: "0.1rem 0.45rem", background: "#eff6ff", color: "#1d4ed8", borderRadius: "4px", fontWeight: 600 }}>{catName(s.categoryId)}</span></TD>
                      <TD right>{s.sequenceOrder}</TD>
                      <TD><Badge active={s.isActive} /></TD>
                      <TD right>
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          <ActionBtn onClick={() => setModal({ type: "scope-edit", item: s })}>Edit</ActionBtn>
                          <ActionBtn onClick={() => handleToggle("scope", s.id, s.isActive)}>{s.isActive ? "Deactivate" : "Activate"}</ActionBtn>
                          <ActionBtn danger onClick={() => handleDelete("scope", s.id)}>Delete</ActionBtn>
                        </div>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Activity Tab ── */}
        {tab === "Activity" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontWeight: 600, color: "#111827" }}>{activities.length} activities</span>
              <button onClick={() => setModal({ type: "act-add" })} disabled={scopes.length === 0} style={{ padding: "0.4rem 0.9rem", borderRadius: "6px", background: scopes.length === 0 ? "#e5e7eb" : ACCENT, color: scopes.length === 0 ? "#9ca3af" : "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: scopes.length === 0 ? "not-allowed" : "pointer" }}>
                + Add Activity
              </button>
            </div>
            {scopes.length === 0 && (
              <div style={{ padding: "1rem 1.25rem", color: "#92400e", background: "#fffbeb", fontSize: "0.8rem" }}>
                Add at least one Scope of Work first.
              </div>
            )}
            {activities.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No activities yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Code</TH><TH>Name</TH><TH>Scope</TH><TH right>Days</TH><TH right>Weight %</TH><TH>Status</TH><TH right>Actions</TH></tr></thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <TD mono>{a.code}</TD>
                      <TD>{a.name}</TD>
                      <TD><span style={{ fontSize: "0.78rem", padding: "0.1rem 0.45rem", background: "#f0fdf4", color: "#166534", borderRadius: "4px", fontWeight: 600 }}>{scopeName(a.scopeId)}</span></TD>
                      <TD right>{a.standardDurationDays}</TD>
                      <TD right>{Number(a.weightInScopePct).toFixed(1)}%</TD>
                      <TD><Badge active={a.isActive} /></TD>
                      <TD right>
                        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                          <ActionBtn onClick={() => setModal({ type: "act-edit", item: a })}>Edit</ActionBtn>
                          <ActionBtn onClick={() => handleToggle("act", a.id, a.isActive)}>{a.isActive ? "Deactivate" : "Activate"}</ActionBtn>
                          <ActionBtn danger onClick={() => handleDelete("act", a.id)}>Delete</ActionBtn>
                        </div>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Billing Milestones Tab ── */}
        {tab === "Billing Milestones" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button onClick={() => setModal({ type: "bm-add" })} disabled={categories.length === 0} style={{ padding: "0.4rem 0.9rem", borderRadius: "6px", background: categories.length === 0 ? "#e5e7eb" : ACCENT, color: categories.length === 0 ? "#9ca3af" : "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: categories.length === 0 ? "not-allowed" : "pointer" }}>
                + Add Billing Milestone
              </button>
            </div>

            {categories.map((cat) => {
              const bms = billingMilestones.filter((m) => m.categoryId === cat.id);
              const totalWeight = bms.reduce((s, m) => s + Number(m.weightPct), 0);
              return (
                <div key={cat.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem 1.25rem", background: "#f0f5ff", borderBottom: "1px solid #dbeafe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.9rem" }}>{cat.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.78rem", color: totalWeight === 100 ? "#166534" : totalWeight > 100 ? "#dc2626" : "#92400e", fontWeight: 600 }}>
                        Total weight: {totalWeight.toFixed(1)}%{totalWeight !== 100 && " ⚠"}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{bms.length} milestone{bms.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {bms.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.8rem" }}>No milestones for this category yet.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><TH>Name</TH><TH right>Weight %</TH><TH>Triggers Billing</TH><TH right>Seq</TH><TH>Notes</TH><TH right>Actions</TH></tr></thead>
                      <tbody>
                        {bms.map((m) => (
                          <tr key={m.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                            <TD>{m.name}</TD>
                            <TD right><strong>{Number(m.weightPct).toFixed(1)}%</strong></TD>
                            <TD>
                              <span style={{ fontSize: "0.72rem", padding: "0.1rem 0.45rem", borderRadius: "999px", background: m.triggersBilling ? "#dcfce7" : "#f3f4f6", color: m.triggersBilling ? "#166534" : "#6b7280", fontWeight: 700 }}>
                                {m.triggersBilling ? "Yes" : "No"}
                              </span>
                            </TD>
                            <TD right>{m.sequenceOrder}</TD>
                            <TD><span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{m.notes ?? "—"}</span></TD>
                            <TD right>
                              <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                                <ActionBtn onClick={() => setModal({ type: "bm-edit", item: m })}>Edit</ActionBtn>
                                <ActionBtn danger onClick={() => handleDelete("bm", m.id)}>Delete</ActionBtn>
                              </div>
                            </TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}

            {categories.length === 0 && (
              <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", textAlign: "center", color: "#9ca3af" }}>
                No categories found. Add categories first.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "cat-add"   && <CategoryModal onClose={() => setModal(null)} />}
      {modal?.type === "cat-edit"  && <CategoryModal initial={modal.item} onClose={() => setModal(null)} />}
      {modal?.type === "scope-add" && <ScopeModal categories={categories} onClose={() => setModal(null)} />}
      {modal?.type === "scope-edit"&& <ScopeModal initial={modal.item} categories={categories} onClose={() => setModal(null)} />}
      {modal?.type === "act-add"   && <ActivityModal scopes={scopes} categories={categories} onClose={() => setModal(null)} />}
      {modal?.type === "act-edit"  && <ActivityModal initial={modal.item} scopes={scopes} categories={categories} onClose={() => setModal(null)} />}
      {modal?.type === "bm-add"    && <BillingMilestoneModal categories={categories} onClose={() => setModal(null)} />}
      {modal?.type === "bm-edit"   && <BillingMilestoneModal initial={modal.item} categories={categories} onClose={() => setModal(null)} />}
    </main>
  );
}
