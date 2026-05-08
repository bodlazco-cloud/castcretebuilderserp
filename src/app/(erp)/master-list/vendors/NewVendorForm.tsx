"use client";

import { useState, useTransition } from "react";
import { createSupplier } from "@/actions/master-list";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function NewVendorForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSupplier({
        name,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        contactPerson: contactPerson || undefined,
      });
      if (result.success) {
        router.push(`/master-list/vendors/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <label>
        <span style={labelStyle}>Vendor / Supplier Name *</span>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Holcim Philippines, Inc." style={inputStyle} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Contact Person</span>
          <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
            placeholder="e.g. Juan Dela Cruz" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Phone</span>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+63 9XX XXX XXXX" style={inputStyle} />
        </label>
      </div>

      <label>
        <span style={labelStyle}>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="vendor@example.com" style={inputStyle} />
      </label>

      <label>
        <span style={labelStyle}>Address</span>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="Complete business address" rows={2}
          style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/master-list/vendors" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#a5b4fc" : "#6366f1",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Vendor"}
        </button>
      </div>
    </form>
  );
}
