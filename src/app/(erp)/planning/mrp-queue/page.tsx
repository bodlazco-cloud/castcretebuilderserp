export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, ne, count } from "drizzle-orm";

const ACCENT = "#1a56db";

const STATUS_CONFIG = {
  ORDER:      { label: "Order Now",  bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  LOW:        { label: "Low Stock",  bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  SUFFICIENT: { label: "Sufficient", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
} as const;

type MrpStatus = keyof typeof STATUS_CONFIG;

type MrpLine = {
  materialId:        string;
  matCode:           string;
  matName:           string;
  matUnit:           string;
  matAdminPrice:     number;
  preferredSupplier: string | null;
  grossRequired:     number;
  onHand:            number;
  reserved:          number;
  available:         number;
  netNeeded:         number;
  estCost:           number;
  status:            MrpStatus;
};

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.85rem",
  textAlign: "left",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
  background: "#f9fafb",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.85rem",
  fontSize: "0.82rem",
  color: "#111827",
  borderBottom: "1px solid #f3f4f6",
  whiteSpace: "nowrap",
};

function fmt(n: number, decimals = 4) {
  return n.toLocaleString("en-PH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCost(n: number) {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function MrpQueuePage() {
  await getAuthUser();

  type ProjectRow = { id: string; name: string };
  let projectRows: ProjectRow[] = [];
  let mrpByProject = new Map<string, { name: string; lines: MrpLine[] }>();
  let dbError: string | null = null;

  try {
    // 1. Active projects
    projectRows = await db
      .select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects)
      .where(eq(schema.projects.status, "ACTIVE"))
      .orderBy(schema.projects.name);

    // 2. Active BOM standards with activity + material
    const bomRows = await db
      .select({
        activityDefId:       schema.bomStandards.activityDefId,
        unitModel:           schema.bomStandards.unitModel,
        unitType:            schema.bomStandards.unitType,
        qtyPerUnit:          schema.bomStandards.quantityPerUnit,
        projectId:           schema.activityDefinitions.projectId,
        materialId:          schema.bomStandards.materialId,
        matCode:             schema.materials.code,
        matName:             schema.materials.name,
        matUnit:             schema.materials.unit,
        matAdminPrice:       schema.materials.adminPrice,
        preferredSupplierId: schema.materials.preferredSupplierId,
      })
      .from(schema.bomStandards)
      .innerJoin(schema.activityDefinitions, eq(schema.bomStandards.activityDefId, schema.activityDefinitions.id))
      .innerJoin(schema.materials, eq(schema.bomStandards.materialId, schema.materials.id))
      .where(eq(schema.bomStandards.isActive, true));

    // 3. Unit counts by (projectId, unitModel, unitType) — exclude turned-over
    const unitCountRows = await db
      .select({
        projectId: schema.projectUnits.projectId,
        unitModel:  schema.projectUnits.unitModel,
        unitType:   schema.projectUnits.unitType,
        unitCount:  count(),
      })
      .from(schema.projectUnits)
      .where(ne(schema.projectUnits.status, "TURNED_OVER"))
      .groupBy(
        schema.projectUnits.projectId,
        schema.projectUnits.unitModel,
        schema.projectUnits.unitType,
      );

    // 4. Inventory stock by (projectId, materialId)
    const stockRows = await db
      .select({
        projectId:        schema.inventoryStock.projectId,
        materialId:       schema.inventoryStock.materialId,
        quantityOnHand:   schema.inventoryStock.quantityOnHand,
        quantityReserved: schema.inventoryStock.quantityReserved,
      })
      .from(schema.inventoryStock);

    // 5. Supplier names
    const supplierRows = await db
      .select({ id: schema.suppliers.id, name: schema.suppliers.name })
      .from(schema.suppliers)
      .where(eq(schema.suppliers.isActive, true));

    // ── Build lookup maps ──────────────────────────────────────────────────────
    const unitCountMap = new Map<string, number>();
    for (const uc of unitCountRows) {
      unitCountMap.set(`${uc.projectId}::${uc.unitModel}::${uc.unitType}`, Number(uc.unitCount));
    }

    const stockMap = new Map<string, { onHand: number; reserved: number }>();
    for (const s of stockRows) {
      const key = `${s.projectId}::${s.materialId}`;
      const existing = stockMap.get(key) ?? { onHand: 0, reserved: 0 };
      stockMap.set(key, {
        onHand:   existing.onHand   + Number(s.quantityOnHand),
        reserved: existing.reserved + Number(s.quantityReserved),
      });
    }

    const supplierMap = new Map<string, string>();
    for (const s of supplierRows) supplierMap.set(s.id, s.name);

    // ── Compute gross requirements per (projectId, materialId) ─────────────────
    const activeProjectIds = new Set(projectRows.map((p) => p.id));
    const grossMap = new Map<string, MrpLine>();

    for (const bom of bomRows) {
      if (!activeProjectIds.has(bom.projectId)) continue;
      const unitCount = unitCountMap.get(`${bom.projectId}::${bom.unitModel}::${bom.unitType}`) ?? 0;
      if (unitCount === 0) continue;

      const gross = Number(bom.qtyPerUnit) * unitCount;
      const key = `${bom.projectId}::${bom.materialId}`;

      if (!grossMap.has(key)) {
        grossMap.set(key, {
          materialId:        bom.materialId,
          matCode:           bom.matCode,
          matName:           bom.matName,
          matUnit:           bom.matUnit,
          matAdminPrice:     Number(bom.matAdminPrice),
          preferredSupplier: bom.preferredSupplierId ? (supplierMap.get(bom.preferredSupplierId) ?? null) : null,
          grossRequired:     0,
          onHand:            0,
          reserved:          0,
          available:         0,
          netNeeded:         0,
          estCost:           0,
          status:            "SUFFICIENT",
        });
      }
      grossMap.get(key)!.grossRequired += gross;
    }

    // ── Apply inventory, derive net/status ────────────────────────────────────
    for (const [key, line] of grossMap) {
      const stock = stockMap.get(key) ?? { onHand: 0, reserved: 0 };
      line.onHand    = stock.onHand;
      line.reserved  = stock.reserved;
      line.available = Math.max(0, stock.onHand - stock.reserved);
      line.netNeeded = Math.max(0, line.grossRequired - line.available);
      line.estCost   = line.netNeeded * line.matAdminPrice;
      line.status    = line.netNeeded > 0
        ? "ORDER"
        : line.available < line.grossRequired * 0.2
          ? "LOW"
          : "SUFFICIENT";
    }

    // ── Group by project ───────────────────────────────────────────────────────
    for (const proj of projectRows) {
      mrpByProject.set(proj.id, { name: proj.name, lines: [] });
    }

    const statusOrder: Record<MrpStatus, number> = { ORDER: 0, LOW: 1, SUFFICIENT: 2 };
    for (const [key, line] of grossMap) {
      const projId = key.split("::")[0];
      if (mrpByProject.has(projId)) {
        mrpByProject.get(projId)!.lines.push(line);
      }
    }
    for (const proj of mrpByProject.values()) {
      proj.lines.sort((a, b) =>
        statusOrder[a.status] !== statusOrder[b.status]
          ? statusOrder[a.status] - statusOrder[b.status]
          : a.matCode.localeCompare(b.matCode),
      );
    }

    // Remove projects with no BOM lines
    for (const [pid, proj] of mrpByProject) {
      if (proj.lines.length === 0) mrpByProject.delete(pid);
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database query failed.";
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const allLines = Array.from(mrpByProject.values()).flatMap((p) => p.lines);
  const totalMaterials = allLines.length;
  const orderCount     = allLines.filter((l) => l.status === "ORDER").length;
  const lowCount       = allLines.filter((l) => l.status === "LOW").length;
  const totalEstCost   = allLines.reduce((s, l) => s + l.estCost, 0);

  const kpis = [
    { label: "Materials in Queue",  value: totalMaterials.toLocaleString(),              accent: ACCENT   },
    { label: "Need to Order",       value: orderCount.toLocaleString(),                   accent: "#b91c1c" },
    { label: "Low Stock",           value: lowCount.toLocaleString(),                     accent: "#92400e" },
    { label: "Est. Procurement Cost", value: `PHP ${fmtCost(totalEstCost)}`,              accent: "#166534" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>

        {/* Back link */}
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Planning & Engineering
          </a>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>MRP Queue</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Material requirements aggregated from BOM standards across active projects
            </p>
          </div>
          <a
            href="/planning/bom/new"
            style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px",
              background: "#fff", color: ACCENT, fontSize: "0.875rem",
              fontWeight: 600, textDecoration: "none", border: `1px solid ${ACCENT}`,
            }}
          >
            Update BOM
          </a>
        </div>

        {/* DB Error */}
        {dbError && (
          <div style={{
            padding: "1rem 1.25rem", marginBottom: "1.5rem", borderRadius: "8px",
            background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "0.875rem",
          }}>
            <strong>Database error:</strong> {dbError}
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${kpi.accent}`,
            }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.4rem" }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {(Object.entries(STATUS_CONFIG) as [MrpStatus, typeof STATUS_CONFIG[MrpStatus]][]).map(([key, cfg]) => (
            <span key={key} style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              padding: "0.25rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            }}>
              {cfg.label}
            </span>
          ))}
          <span style={{ fontSize: "0.75rem", color: "#9ca3af", alignSelf: "center", marginLeft: "0.25rem" }}>
            · LOW = available {"<"} 20% of gross requirement
          </span>
        </div>

        {/* No data */}
        {!dbError && mrpByProject.size === 0 && (
          <div style={{
            padding: "3rem", background: "#fff", borderRadius: "8px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af",
          }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No MRP data yet</div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem" }}>
              To generate the queue, make sure active projects have units registered and BOM standards defined.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <a href="/master-list/projects" style={{ color: ACCENT, fontSize: "0.875rem" }}>Add project units →</a>
              <a href="/planning/bom/new" style={{ color: ACCENT, fontSize: "0.875rem" }}>Add BOM standards →</a>
            </div>
          </div>
        )}

        {/* MRP tables by project */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {Array.from(mrpByProject.values()).map((proj) => {
            const projOrderCount = proj.lines.filter((l) => l.status === "ORDER").length;
            const projEstCost    = proj.lines.reduce((s, l) => s + l.estCost, 0);

            return (
              <div key={proj.name} style={{
                background: "#fff", borderRadius: "8px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden",
              }}>
                {/* Project header bar */}
                <div style={{
                  padding: "0.85rem 1.25rem",
                  background: projOrderCount > 0 ? "#fef2f2" : "#f0f5ff",
                  borderBottom: `1px solid ${projOrderCount > 0 ? "#fecaca" : "#dbeafe"}`,
                  display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
                }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e3a8a" }}>{proj.name}</span>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {proj.lines.length} material{proj.lines.length !== 1 ? "s" : ""}
                  </span>
                  {projOrderCount > 0 && (
                    <span style={{
                      padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem",
                      fontWeight: 700, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca",
                    }}>
                      {projOrderCount} to order
                    </span>
                  )}
                  {projEstCost > 0 && (
                    <span style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>
                      Est. PHP {fmtCost(projEstCost)}
                    </span>
                  )}
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: "900px" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Code</th>
                        <th style={thStyle}>Material</th>
                        <th style={thStyle}>Unit</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Gross Required</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>On Hand</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Reserved</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Available</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Net Needed</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Est. Cost (PHP)</th>
                        <th style={thStyle}>Supplier</th>
                        <th style={thStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proj.lines.map((line) => {
                        const sc = STATUS_CONFIG[line.status];
                        return (
                          <tr key={line.materialId} style={{
                            background: line.status === "ORDER" ? "#fffafa" : "transparent",
                          }}>
                            <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 600, fontSize: "0.78rem", color: "#374151" }}>
                              {line.matCode}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 500, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {line.matName}
                            </td>
                            <td style={{ ...tdStyle, color: "#6b7280" }}>{line.matUnit}</td>
                            <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>{fmt(line.grossRequired)}</td>
                            <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: line.onHand === 0 ? "#9ca3af" : "#111827" }}>
                              {fmt(line.onHand)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: line.reserved === 0 ? "#9ca3af" : "#111827" }}>
                              {fmt(line.reserved)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: line.available === 0 ? "#9ca3af" : "#166534" }}>
                              {fmt(line.available)}
                            </td>
                            <td style={{
                              ...tdStyle, textAlign: "right", fontFamily: "monospace",
                              fontWeight: line.netNeeded > 0 ? 700 : 400,
                              color: line.netNeeded > 0 ? "#b91c1c" : "#9ca3af",
                            }}>
                              {line.netNeeded > 0 ? fmt(line.netNeeded) : "—"}
                            </td>
                            <td style={{
                              ...tdStyle, textAlign: "right", fontFamily: "monospace",
                              fontWeight: line.estCost > 0 ? 700 : 400,
                              color: line.estCost > 0 ? "#b91c1c" : "#9ca3af",
                            }}>
                              {line.estCost > 0 ? fmtCost(line.estCost) : "—"}
                            </td>
                            <td style={{ ...tdStyle, color: "#6b7280", fontSize: "0.75rem", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {line.preferredSupplier ?? <span style={{ color: "#d1d5db" }}>—</span>}
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px",
                                fontSize: "0.7rem", fontWeight: 700,
                                background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                                whiteSpace: "nowrap",
                              }}>
                                {sc.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Help text */}
        {mrpByProject.size > 0 && (
          <p style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "#9ca3af", textAlign: "center" }}>
            Gross Required = BOM qty per unit × active unit count per model/type · Available = On Hand − Reserved
            · Net Needed = max(0, Gross − Available) · Est. Cost uses admin price from Materials Master
          </p>
        )}

      </div>
    </main>
  );
}
