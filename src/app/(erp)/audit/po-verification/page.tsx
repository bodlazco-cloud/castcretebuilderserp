export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  purchaseOrders,
  purchaseOrderItems,
  projects,
  suppliers,
  materials,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const ACCENT = "#0694a2";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:               { bg: "#f3f4f6", color: "#6b7280" },
  AUDIT_REVIEW:        { bg: "#fef9c3", color: "#713f12" },
  BOD_APPROVED:        { bg: "#eff6ff", color: "#1e40af" },
  AWAITING_DELIVERY:   { bg: "#e0f2fe", color: "#0369a1" },
  PARTIALLY_DELIVERED: { bg: "#dbeafe", color: "#1e40af" },
  DELIVERED:           { bg: "#dcfce7", color: "#166534" },
  CANCELLED:           { bg: "#fef2f2", color: "#9ca3af" },
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timer = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise.catch(() => fallback), timer]);
}

function fmt(amount: string | number | null | undefined): string {
  const n = Number(amount ?? 0);
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

type PORow = {
  id: string;
  prId: string | null;
  status: string | null;
  totalAmount: string | null;
  createdAt: Date | null;
  isPrepaid: boolean | null;
  proformaInvoiceUrl: string | null;
  auditReviewedAt: Date | null;
  projectName: string | null;
  supplierName: string | null;
};

type ItemRow = {
  poId: string | null;
  materialName: string | null;
  unit: string | null;
  quantity: string | null;
  unitPrice: string | null;
  totalPrice: string | null;
};

export default async function POVerificationPage() {
  const posQuery = db
    .select({
      id: purchaseOrders.id,
      prId: purchaseOrders.prId,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      createdAt: purchaseOrders.createdAt,
      isPrepaid: purchaseOrders.isPrepaid,
      proformaInvoiceUrl: purchaseOrders.proformaInvoiceUrl,
      auditReviewedAt: purchaseOrders.auditReviewedAt,
      projectName: projects.name,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(100);

  const itemsQuery = db
    .select({
      poId: purchaseOrderItems.poId,
      materialName: materials.name,
      unit: materials.unit,
      quantity: purchaseOrderItems.quantity,
      unitPrice: purchaseOrderItems.unitPrice,
      totalPrice: purchaseOrderItems.totalPrice,
    })
    .from(purchaseOrderItems)
    .leftJoin(materials, eq(purchaseOrderItems.materialId, materials.id));

  const [pos, items]: [PORow[], ItemRow[]] = await Promise.all([
    withTimeout(posQuery as Promise<PORow[]>, 6000, []),
    withTimeout(itemsQuery as Promise<ItemRow[]>, 6000, []),
  ]);

  const itemsByPoId = new Map<string, typeof items>();
  for (const item of items) {
    if (!item.poId) continue;
    if (!itemsByPoId.has(item.poId)) itemsByPoId.set(item.poId, []);
    itemsByPoId.get(item.poId)!.push(item);
  }

  const awaitingAudit = pos.filter((p) => p.status === "AUDIT_REVIEW").length;
  const bodApproved   = pos.filter((p) => p.status === "BOD_APPROVED").length;
  const delivered     = pos.filter((p) => p.status === "DELIVERED").length;
  const totalValue    = pos.reduce((sum, p) => sum + Number(p.totalAmount ?? 0), 0);

  const kpis = [
    { label: "Awaiting Audit",  value: String(awaitingAudit), accent: "#e3a008" },
    { label: "BOD Approved",    value: String(bodApproved),   accent: "#1a56db" },
    { label: "Delivered",       value: String(delivered),     accent: "#057a55" },
    { label: "Total PO Value",  value: `₱${fmt(totalValue)}`, accent: ACCENT    },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        details[open] summary .chevron { transform: rotate(90deg); }
        .chevron { display: inline-block; transition: transform 0.2s; margin-right: 0.4rem; color: #9ca3af; font-size: 0.75rem; }
        details summary { list-style: none; cursor: pointer; }
        details summary::-webkit-details-marker { display: none; }
      `}</style>

      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Audit & Quality
          </a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
            PO Verification
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {pos.length} purchase order{pos.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.4rem" }}>{k.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        {pos.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.95rem" }}>
            No purchase orders found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pos.map((po) => {
              const st = STATUS_STYLE[po.status ?? "DRAFT"] ?? STATUS_STYLE.DRAFT;
              const isAudit = po.status === "AUDIT_REVIEW";
              const lineItems = itemsByPoId.get(po.id) ?? [];

              return (
                <details key={po.id} open={isAudit || undefined} style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: isAudit ? "4px solid #e3a008" : "4px solid transparent", overflow: "hidden" }}>
                  <summary style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", userSelect: "none" }}>
                    <span className="chevron">▶</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.85rem", color: "#111827" }}>
                      #{shortId(po.id)}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>·</span>
                    <span style={{ fontSize: "0.875rem", color: "#374151", fontWeight: 500 }}>
                      {po.projectName ?? "—"}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>·</span>
                    <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                      {po.supplierName ?? "—"}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>·</span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#111827" }}>
                      ₱{fmt(po.totalAmount)}
                    </span>
                    <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, background: st.bg, color: st.color }}>
                      {po.status ?? "DRAFT"}
                    </span>
                    {po.isPrepaid && (
                      <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: "#f0fdf4", color: "#166534" }}>
                        PREPAID
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#9ca3af" }}>
                      {po.createdAt ? new Date(po.createdAt).toLocaleDateString("en-PH") : "—"}
                    </span>
                  </summary>

                  <div style={{ borderTop: "1px solid #f3f4f6", padding: "1rem 1.25rem" }}>
                    {lineItems.length > 0 ? (
                      <div style={{ overflowX: "auto", marginBottom: "0.75rem" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: "500px" }}>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              {["Material", "Unit", "Qty", "Unit Price", "Total"].map((h, i) => (
                                <th key={i} style={{ padding: "0.5rem 0.75rem", textAlign: i >= 2 ? "right" : "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {lineItems.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "0.45rem 0.75rem", color: "#374151" }}>{item.materialName ?? "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem", color: "#6b7280" }}>{item.unit ?? "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem", textAlign: "right", color: "#374151" }}>{Number(item.quantity ?? 0).toLocaleString()}</td>
                                <td style={{ padding: "0.45rem 0.75rem", textAlign: "right", color: "#374151" }}>₱{fmt(item.unitPrice)}</td>
                                <td style={{ padding: "0.45rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#111827" }}>₱{fmt(item.totalPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ margin: "0 0 0.75rem", color: "#9ca3af", fontSize: "0.82rem" }}>No line items.</p>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {po.proformaInvoiceUrl && (
                        <div style={{ fontSize: "0.8rem", color: "#374151" }}>
                          <span style={{ fontWeight: 600, color: "#6b7280" }}>Proforma Invoice: </span>
                          <a href={po.proformaInvoiceUrl} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>
                            {po.proformaInvoiceUrl}
                          </a>
                        </div>
                      )}
                      {po.auditReviewedAt && (
                        <div style={{ fontSize: "0.8rem", color: "#374151" }}>
                          <span style={{ fontWeight: 600, color: "#6b7280" }}>Audit Reviewed: </span>
                          {new Date(po.auditReviewedAt).toLocaleString("en-PH")}
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
