export const dynamic = "force-dynamic";

import { db } from "@/db";
import { purchaseOrders, suppliers, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
  } catch {
    return fallback;
  }
}

export default async function VendorSummaryPage() {
  const rows = await safe(
    () =>
      db
        .select({
          poId: purchaseOrders.id,
          supplierId: purchaseOrders.supplierId,
          projectId: purchaseOrders.projectId,
          status: purchaseOrders.status,
          totalAmount: purchaseOrders.totalAmount,
          createdAt: purchaseOrders.createdAt,
          supplierName: suppliers.name,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
          projectName: projects.name,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
        .orderBy(desc(purchaseOrders.createdAt)),
    []
  );

  type SupplierGroup = {
    supplierId: string;
    supplierName: string;
    contactPerson: string | null;
    phone: string | null;
    totalPOs: number;
    totalSpend: number;
    deliveredSpend: number;
    pendingSpend: number;
    projectCounts: Record<string, { name: string; count: number }>;
  };

  const grouped: Record<string, SupplierGroup> = {};

  for (const r of rows) {
    const sid = r.supplierId ?? "unknown";
    if (!grouped[sid]) {
      grouped[sid] = {
        supplierId: sid,
        supplierName: r.supplierName ?? "Unknown Supplier",
        contactPerson: r.contactPerson ?? null,
        phone: r.phone ?? null,
        totalPOs: 0,
        totalSpend: 0,
        deliveredSpend: 0,
        pendingSpend: 0,
        projectCounts: {},
      };
    }
    const g = grouped[sid];
    const amount = Number(r.totalAmount ?? 0);
    g.totalPOs += 1;
    g.totalSpend += amount;
    if (r.status === "DELIVERED") g.deliveredSpend += amount;
    else if (r.status !== "CANCELLED") g.pendingSpend += amount;
    const pid = r.projectId ?? "unknown";
    if (!g.projectCounts[pid]) g.projectCounts[pid] = { name: r.projectName ?? "Unknown", count: 0 };
    g.projectCounts[pid].count += 1;
  }

  const vendorList = Object.values(grouped).sort((a, b) => b.totalSpend - a.totalSpend);

  const totalVendors = vendorList.length;
  const totalPOSpend = vendorList.reduce((s, v) => s + v.totalSpend, 0);
  const totalDeliveredSpend = vendorList.reduce((s, v) => s + v.deliveredSpend, 0);

  const php = (n: number) =>
    "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

  const accent = "#057a55";

  const kpiCard = (label: string, value: string) => (
    <div
      style={{
        flex: "1 1 0",
        minWidth: "180px",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        padding: "1.1rem 1.25rem",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
    </div>
  );

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: accent, textDecoration: "none" }}>← Finance &amp; Accounting</a>
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Vendor Summary</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Procurement spend per supplier across all purchase orders.</p>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {kpiCard("Total Vendors Used", String(totalVendors))}
          {kpiCard("Total PO Spend", php(totalPOSpend))}
          {kpiCard("Delivered Spend", php(totalDeliveredSpend))}
        </div>

        {vendorList.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              padding: "3rem",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: "0.95rem",
            }}
          >
            No purchase orders found.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.855rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Supplier", "Contact", "Total POs", "Total Spend", "Delivered", "Pending", "Top Project"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.7rem 0.9rem",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendorList.map((v) => {
                  const topProject = Object.values(v.projectCounts).sort((a, b) => b.count - a.count)[0];
                  return (
                    <tr key={v.supplierId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.7rem 0.9rem" }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>{v.supplierName}</div>
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", color: "#374151", whiteSpace: "nowrap" }}>
                        {v.contactPerson ? (
                          <div>
                            <div>{v.contactPerson}</div>
                            {v.phone && <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{v.phone}</div>}
                          </div>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", fontWeight: 700, color: "#111827", textAlign: "right" }}>
                        {v.totalPOs}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", fontWeight: 700, color: "#111827", whiteSpace: "nowrap", textAlign: "right" }}>
                        {php(v.totalSpend)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", color: accent, fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}>
                        {php(v.deliveredSpend)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", color: v.pendingSpend > 0 ? "#d97706" : "#9ca3af", fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}>
                        {v.pendingSpend > 0 ? php(v.pendingSpend) : "—"}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", color: "#374151" }}>
                        {topProject ? (
                          <span>
                            {topProject.name}
                            <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "0.3rem" }}>({topProject.count})</span>
                          </span>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
