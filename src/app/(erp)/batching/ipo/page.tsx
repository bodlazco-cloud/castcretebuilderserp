export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  internalPurchaseOrders, mixDesigns, projects, projectUnits, users,
} from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { CreateIPOForm } from "./CreateIPOForm";

const ACCENT = "#1a56db";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING:       { bg: "#fef3c7", color: "#92400e" },
  ACCEPTED:      { bg: "#eff6ff", color: "#1e40af" },
  IN_PRODUCTION: { bg: "#e0f2fe", color: "#0369a1" },
  DELIVERED:     { bg: "#ecfdf5", color: "#065f46" },
  BILLED:        { bg: "#f3e8ff", color: "#6b21a8" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.6rem",
      borderRadius: "999px",
      fontSize: "0.7rem",
      fontWeight: 700,
      background: s.bg,
      color: s.color,
      whiteSpace: "nowrap",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

export default async function IPOPage() {
  const user = await getAuthUser();

  const [kpiRows, ipoRows, projectRows, mixDesignRows, unitRows] = await Promise.all([
    db
      .select({ status: internalPurchaseOrders.status, cnt: count() })
      .from(internalPurchaseOrders)
      .groupBy(internalPurchaseOrders.status),
    db
      .select({
        id:                internalPurchaseOrders.id,
        ipoNumber:         internalPurchaseOrders.ipoNumber,
        status:            internalPurchaseOrders.status,
        requestedVolumeM3: internalPurchaseOrders.requestedVolumeM3,
        internalRatePerM3: internalPurchaseOrders.internalRatePerM3,
        triggeredBy:       internalPurchaseOrders.triggeredBy,
        notes:             internalPurchaseOrders.notes,
        createdAt:         internalPurchaseOrders.createdAt,
        mixCode:           mixDesigns.code,
        mixName:           mixDesigns.name,
        projName:          projects.name,
        unitLabel:         projectUnits.unitLabel,
      })
      .from(internalPurchaseOrders)
      .leftJoin(mixDesigns, eq(internalPurchaseOrders.mixDesignId, mixDesigns.id))
      .leftJoin(projects, eq(internalPurchaseOrders.projectId, projects.id))
      .leftJoin(projectUnits, eq(internalPurchaseOrders.unitId, projectUnits.id))
      .orderBy(desc(internalPurchaseOrders.createdAt))
      .limit(50),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
    db
      .select({ id: mixDesigns.id, code: mixDesigns.code, name: mixDesigns.name })
      .from(mixDesigns)
      .where(eq(mixDesigns.isActive, true))
      .orderBy(mixDesigns.code),
    db
      .select({ id: projectUnits.id, unitLabel: projectUnits.unitLabel, projectId: projectUnits.projectId })
      .from(projectUnits)
      .orderBy(projectUnits.unitLabel),
  ]);

  const byStatus = Object.fromEntries(kpiRows.map((r) => [r.status, Number(r.cnt)]));

  const kpis = [
    { label: "Pending", value: byStatus["PENDING"] ?? 0, color: "#92400e", bg: "#fef3c7" },
    { label: "Accepted", value: byStatus["ACCEPTED"] ?? 0, color: "#1e40af", bg: "#eff6ff" },
    { label: "In Production", value: byStatus["IN_PRODUCTION"] ?? 0, color: "#0369a1", bg: "#e0f2fe" },
    { label: "Delivered", value: byStatus["DELIVERED"] ?? 0, color: "#065f46", bg: "#ecfdf5" },
    { label: "Billed", value: byStatus["BILLED"] ?? 0, color: "#6b21a8", bg: "#f3e8ff" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "2rem", maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Batching Plant
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
          <div>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Batching Plant
            </span>
            <h1 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Internal Purchase Orders
            </h1>
            <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>
              Zero-trust production queue — every pour requires an approved IPO.
            </p>
          </div>
          <CreateIPOForm
            projects={projectRows}
            mixDesigns={mixDesignRows}
            units={unitRows}
            userId={user?.id ?? ""}
          />
        </div>

        {/* KPI Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1.75rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              padding: "0.6rem 1rem",
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              display: "flex", alignItems: "center", gap: "0.65rem",
            }}>
              <span style={{
                display: "inline-block", minWidth: "1.75rem",
                padding: "0.15rem 0.5rem", borderRadius: "999px",
                background: k.bg, color: k.color,
                fontSize: "0.85rem", fontWeight: 700, textAlign: "center",
              }}>
                {k.value}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 500 }}>{k.label}</span>
            </div>
          ))}
        </div>

        {/* IPO Table */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#374151" }}>IPO Queue</h2>
          </div>
          {ipoRows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
              No internal purchase orders yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["IPO #", "Status", "Project", "Unit", "Mix Design", "Volume (m³)", "Rate / m³", "Triggered By", "Date"].map((h, i) => (
                      <th key={i} style={{
                        padding: "0.65rem 1rem", textAlign: i === 5 || i === 6 ? "right" : "left",
                        fontWeight: 600, color: "#374151", whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ipoRows.map((row, i) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 700, color: ACCENT }}>
                        {row.ipoNumber}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <StatusPill status={row.status} />
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{row.projName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{row.unitLabel ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.8rem", color: "#374151" }}>{row.mixCode ?? "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{row.mixName ?? ""}</div>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>
                        {Number(row.requestedVolumeM3).toFixed(2)}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                        {row.internalRatePerM3 ? `₱${Number(row.internalRatePerM3).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#9ca3af", fontSize: "0.75rem" }}>
                        {row.triggeredBy ?? "Manual"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Accounting ledger note */}
        <div style={{
          marginTop: "1.25rem", padding: "0.85rem 1rem",
          background: "#eff6ff", borderRadius: "7px",
          borderLeft: `3px solid ${ACCENT}`,
          fontSize: "0.78rem", color: "#1e40af",
        }}>
          <strong>Ledger Reconciliation:</strong> When billed, IPOs credit the Batching Plant Internal Revenue account
          and debit the Project Cost Center. The corporate P&amp;L elimination module nets these to zero —
          preventing artificial revenue inflation while maintaining accurate field-level job costs.
        </div>
      </div>
    </main>
  );
}
