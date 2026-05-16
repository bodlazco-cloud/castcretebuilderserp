export const dynamic = "force-dynamic";
import { db } from "@/db";
import { suppliers, materials, materialSuppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { EditVendorForm } from "./EditVendorForm";
import VendorPriceList from "./VendorPriceList";

const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [vendor] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id));

  if (!vendor) notFound();

  const [priceRows, allMaterials] = await Promise.all([
    db
      .select({
        id:              materialSuppliers.id,
        materialId:      materialSuppliers.materialId,
        materialCode:    materials.code,
        materialName:    materials.name,
        unitPrice:       materialSuppliers.unitPrice,
        uom:             materialSuppliers.uom,
        minimumQuantity: materialSuppliers.minimumQuantity,
        effectiveDate:   materialSuppliers.effectiveDate,
        notes:           materialSuppliers.notes,
        isCurrent:       materialSuppliers.isCurrent,
      })
      .from(materialSuppliers)
      .innerJoin(materials, eq(materialSuppliers.materialId, materials.id))
      .where(eq(materialSuppliers.supplierId, id))
      .orderBy(materials.code),

    db
      .select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
      .from(materials)
      .where(eq(materials.isActive, true))
      .orderBy(materials.code),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1000px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/vendors" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Vendors / Suppliers</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{vendor.name}</h1>
            <span style={{
              display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
              background: vendor.isActive ? "#dcfce7" : "#f3f4f6", color: vendor.isActive ? "#166534" : "#6b7280",
            }}>{vendor.isActive ? "Active" : "Inactive"}</span>
          </div>
          <EditVendorForm vendor={{ id: vendor.id, name: vendor.name, contactPerson: vendor.contactPerson ?? null, phone: vendor.phone ?? null, email: vendor.email ?? null, address: vendor.address ?? null }} />
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            {vendor.contactPerson && (
              <div><div style={LABEL}>Contact Person</div><div style={VALUE}>{vendor.contactPerson}</div></div>
            )}
            {vendor.phone && (
              <div><div style={LABEL}>Phone</div><div style={VALUE}>{vendor.phone}</div></div>
            )}
            {vendor.email && (
              <div><div style={LABEL}>Email</div>
                <a href={`mailto:${vendor.email}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{vendor.email}</a>
              </div>
            )}
            {vendor.address && (
              <div style={{ gridColumn: "span 3" }}><div style={LABEL}>Address</div><div style={VALUE}>{vendor.address}</div></div>
            )}
            <div><div style={LABEL}>Vendor ID</div><div style={{ ...VALUE, fontFamily: "monospace", fontSize: "0.8rem" }}>{vendor.id}</div></div>
            <div><div style={LABEL}>Added</div><div style={VALUE}>{new Date(vendor.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
          </div>
        </div>

        <VendorPriceList
          vendorId={id}
          rows={priceRows.map(r => ({
            ...r,
            unitPrice:       r.unitPrice ?? null,
            uom:             r.uom ?? null,
            minimumQuantity: r.minimumQuantity ?? null,
            effectiveDate:   r.effectiveDate ?? null,
            notes:           r.notes ?? null,
            isCurrent:       r.isCurrent,
          }))}
          allMaterials={allMaterials}
        />
      </div>
    </main>
  );
}
