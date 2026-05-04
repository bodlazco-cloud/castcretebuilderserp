"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSupplier, toggleSupplierActive } from "@/actions/master-list";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.5rem 0.75rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
};

export function EditSupplierForm({
  id, initialName, isActive,
}: {
  id: string;
  initialName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateSupplier(id, { name });
      if (result.success) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleToggle() {
    startToggle(async () => {
      await toggleSupplierActive(id, !isActive);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {error && (
          <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>
        )}
        {saved && (
          <div style={{ padding: "0.6rem 0.85rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", color: "#166534", fontSize: "0.8rem" }}>Saved successfully.</div>
        )}
        <label>
          <span style={labelStyle}>Supplier Name *</span>
          <input type="text" required value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} style={inputStyle} />
        </label>
        <div>
          <button type="submit" disabled={isPending} style={{
            padding: "0.5rem 1rem", borderRadius: "6px",
            background: isPending ? "#fca5a5" : "#dc2626",
            color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
          }}>{isPending ? "Saving…" : "Save Changes"}</button>
        </div>
      </form>

      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>Status</div>
        <button onClick={handleToggle} disabled={isToggling} style={{
          padding: "0.5rem 1rem", borderRadius: "6px",
          background: isActive ? "#fef2f2" : "#f0fdf4",
          color: isActive ? "#b91c1c" : "#166534",
          border: `1px solid ${isActive ? "#fecaca" : "#86efac"}`,
          fontSize: "0.8rem", fontWeight: 600,
          cursor: isToggling ? "not-allowed" : "pointer",
        }}>
          {isToggling ? "…" : isActive ? "Deactivate Supplier" : "Reactivate Supplier"}
        </button>
      </div>
    </div>
  );
}
