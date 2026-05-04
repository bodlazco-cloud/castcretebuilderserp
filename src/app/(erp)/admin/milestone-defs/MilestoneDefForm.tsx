"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMilestoneDefinition, updateMilestoneDefinition } from "@/actions/master-list";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

type Initial = {
  name: string;
  category: "STRUCTURAL" | "ARCHITECTURAL" | "TURNOVER";
  sequenceOrder: number;
  triggersBilling: boolean;
  weightPct: string;
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; id: string; initial: Initial };

export function MilestoneDefForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const init: Initial = props.mode === "edit" ? props.initial : {
    name: "", category: "STRUCTURAL", sequenceOrder: 1, triggersBilling: false, weightPct: "0.00",
  };

  const [name, setName]                     = useState(init.name);
  const [category, setCategory]             = useState<"STRUCTURAL" | "ARCHITECTURAL" | "TURNOVER">(init.category);
  const [sequenceOrder, setSequenceOrder]   = useState(String(init.sequenceOrder));
  const [triggersBilling, setTriggersBilling] = useState(init.triggersBilling);
  const [weightPct, setWeightPct]           = useState(Number(init.weightPct).toFixed(2));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name, category,
      sequenceOrder: Number(sequenceOrder),
      triggersBilling,
      weightPct: Number(weightPct),
    };
    startTransition(async () => {
      const result = props.mode === "edit"
        ? await updateMilestoneDefinition(props.id, payload)
        : await createMilestoneDefinition(payload);
      if (result.success) {
        router.push(props.mode === "edit" ? `/admin/milestone-defs/${props.id}` : "/admin/milestone-defs");
      } else {
        setError(result.error);
      }
    });
  }

  const backHref = props.mode === "edit" ? `/admin/milestone-defs/${props.id}` : "/admin/milestone-defs";

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <label>
        <span style={labelStyle}>Milestone Name *</span>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Foundation Complete" style={inputStyle} />
      </label>

      <label>
        <span style={labelStyle}>Category *</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} style={inputStyle}>
          <option value="STRUCTURAL">STRUCTURAL</option>
          <option value="ARCHITECTURAL">ARCHITECTURAL</option>
          <option value="TURNOVER">TURNOVER</option>
        </select>
        <span style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem", display: "block" }}>
          Determines which project category this milestone applies to and drives billing triggers.
        </span>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Weight (%) *</span>
          <input type="number" required min="0" max="100" step="0.01" value={weightPct}
            onChange={(e) => setWeightPct(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem", display: "block" }}>
            % completion this milestone represents in its category.
          </span>
        </label>
        <label>
          <span style={labelStyle}>Sequence Order *</span>
          <input type="number" required min="1" step="1" value={sequenceOrder}
            onChange={(e) => setSequenceOrder(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={triggersBilling}
          onChange={(e) => setTriggersBilling(e.target.checked)}
          style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
        />
        <div>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Triggers Billing</span>
          <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
            When this milestone is reached, an invoice can be submitted to the developer.
          </div>
        </div>
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb" }}>
        <a href={backHref} style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#c4b5fd" : "#7e3af2",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : props.mode === "edit" ? "Save Changes" : "Create Milestone"}
        </button>
      </div>
    </form>
  );
}
