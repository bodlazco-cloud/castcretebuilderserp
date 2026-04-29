"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEquipment } from "@/actions/motorpool";

const ACCENT = "#d97706";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const EQUIPMENT_TYPES = [
  "TRANSIT MIXER", "CONCRETE PUMP", "DUMP TRUCK", "BACKHOE",
  "FORKLIFT", "GENERATOR", "COMPACTOR", "WATER TRUCK",
  "BOOM TRUCK", "CRANE", "GRADER", "OTHER",
];

export function AddEquipmentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addEquipment({
        code:                      fd.get("code") as string,
        name:                      fd.get("name") as string,
        type:                      fd.get("type") as string,
        make:                      (fd.get("make") as string) || undefined,
        model:                     (fd.get("model") as string) || undefined,
        year:                      fd.get("year") ? Number(fd.get("year")) : undefined,
        purchaseValue:             fd.get("purchaseValue") ? Number(fd.get("purchaseValue")) : undefined,
        dailyRentalRate:           Number(fd.get("dailyRentalRate")),
        fuelStandardLitersPerHour: Number(fd.get("fuelStandardLitersPerHour")),
      });
      if (result.success) {
        router.push("/motorpool");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{
          padding: "0.85rem 1rem", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
        }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Equipment Code *</span>
          <input name="code" required style={inputStyle} placeholder="EQ-001" />
        </label>
        <label>
          <span style={labelStyle}>Equipment Name *</span>
          <input name="name" required style={inputStyle} placeholder="Transit Mixer #1" />
        </label>
      </div>

      <label>
        <span style={labelStyle}>Equipment Type *</span>
        <select name="type" required style={inputStyle}>
          {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Make / Brand</span>
          <input name="make" style={inputStyle} placeholder="HINO, Sinotruk…" />
        </label>
        <label>
          <span style={labelStyle}>Model</span>
          <input name="model" style={inputStyle} placeholder="Model number" />
        </label>
        <label>
          <span style={labelStyle}>Year</span>
          <input name="year" type="number" min="1950" max="2100" style={inputStyle} placeholder="2020" />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Purchase Value (PHP)</span>
          <input name="purchaseValue" type="number" min="0" step="0.01" style={inputStyle} placeholder="0.00" />
        </label>
        <label>
          <span style={labelStyle}>Daily Rental Rate (PHP) *</span>
          <input name="dailyRentalRate" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
        </label>
        <label>
          <span style={labelStyle}>Fuel Standard (L/hr) *</span>
          <input name="fuelStandardLitersPerHour" type="number" min="0" step="0.01" required style={inputStyle} placeholder="8.00" />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/motorpool" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#fcd34d" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Add Equipment"}
        </button>
      </div>
    </form>
  );
}
