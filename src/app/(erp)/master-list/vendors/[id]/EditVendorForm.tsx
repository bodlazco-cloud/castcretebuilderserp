"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSupplier } from "@/actions/master-list";

type Vendor = {
  id: string; name: string;
  contactPerson: string | null; phone: string | null;
  email: string | null; address: string | null;
};

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function EditVendorForm({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSupplier({
        id:            vendor.id,
        name:          fd.get("name") as string,
        contactPerson: (fd.get("contactPerson") as string) || undefined,
        phone:         (fd.get("phone") as string) || undefined,
        email:         (fd.get("email") as string) || undefined,
        address:       (fd.get("address") as string) || undefined,
      });
      if (result.success) { setOpen(false); router.refresh(); }
      else setError(result.error ?? "Error saving.");
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "0.5rem 1rem", borderRadius: "6px",
          background: open ? "#f3f4f6" : "#374151",
          color: open ? "#374151" : "#fff",
          border: open ? "1px solid #d1d5db" : "none",
          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        {open ? "Cancel" : "Edit Vendor"}
      </button>

      {open && (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginTop: "1rem" }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit Vendor Details</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label>
              <span style={labelStyle}>Vendor Name *</span>
              <input name="name" required defaultValue={vendor.name} style={inputStyle} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>
                <span style={labelStyle}>Contact Person</span>
                <input name="contactPerson" defaultValue={vendor.contactPerson ?? ""} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Phone</span>
                <input name="phone" defaultValue={vendor.phone ?? ""} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Email</span>
                <input name="email" type="email" defaultValue={vendor.email ?? ""} style={inputStyle} />
              </label>
            </div>
            <label>
              <span style={labelStyle}>Address</span>
              <textarea name="address" rows={2} defaultValue={vendor.address ?? ""} style={{ ...inputStyle, resize: "vertical" }} />
            </label>
            {error && (
              <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={isPending} style={{
                padding: "0.55rem 1.5rem", borderRadius: "6px", background: isPending ? "#9ca3af" : "#374151",
                color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
              }}>
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
