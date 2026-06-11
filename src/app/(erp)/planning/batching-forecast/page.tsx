export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  resourceForecasts, masterBomEntries, materials, projectUnits, projects,
} from "@/db/schema";
import { premixMaterialLinks, mixDesignBom, mixDesigns } from "@/db/schema/batching";
import { eq, desc } from "drizzle-orm";
import { ApproveForecastButton } from "./ApproveForecastButton";
import { canReviewForecast, isAdminOrBod } from "@/lib/supabase-server";

function safe<T>(p: Promise<T>, fallback: T, ms = 10000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_APPROVAL:     { bg: "#fef9c3", color: "#713f12",  label: "Pending Mgr Review" },
  PENDING_BOD_APPROVAL: { bg: "#eff6ff", color: "#1e40af",  label: "Pending BOD" },
  PENDING_PR:       { bg: "#fef2f2", color: "#b91c1c",  label: "Pending PR" },
  PR_CREATED:       { bg: "#eff6ff", color: "#1e40af",  label: "PR Created" },
  PO_ISSUED:        { bg: "#dbeafe", color: "#1e40af",  label: "PO Issued" },
  ISSUED:           { bg: "#dcfce7", color: "#166534",  label: "Issued" },
};

export default async function BatchingForecastPage() {
  const [canReview, canBodApprove] = await Promise.all([
    canReviewForecast().catch(() => false),
    isAdminOrBod().catch(() => false),
  ]);

  const [rows, premixLinks, rawMaterialBom] = await Promise.all([
    safe(
      db.select({
        id:           resourceForecasts.id,
        grossQty:     resourceForecasts.grossQuantity,
        consumed:     resourceForecasts.quantityConsumed,
        status:       resourceForecasts.status,
        projectId:    resourceForecasts.projectId,
        unitCode:     projectUnits.unitCode,
        unitModel:    projectUnits.unitModel,
        matName:      materials.name,
        matUnit:      materials.unit,
        matId:        materials.id,
        projectName:  projects.name,
      })
        .from(resourceForecasts)
        .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
        .leftJoin(materials,        eq(masterBomEntries.materialId,        materials.id))
        .leftJoin(projectUnits,     eq(resourceForecasts.unitId,           projectUnits.id))
        .leftJoin(projects,         eq(resourceForecasts.projectId,        projects.id))
        .where(eq(resourceForecasts.forecastType, "CONCRETE"))
        .orderBy(desc(resourceForecasts.createdAt)),
      [] as {
        id: string; grossQty: string; consumed: string; status: string; projectId: string | null;
        unitCode: string | null; unitModel: string | null; matName: string | null; matUnit: string | null; matId: string | null; projectName: string | null;
      }[],
    ),
    safe(
      db.select({
        materialId: premixMaterialLinks.materialId,
        mixDesignId: premixMaterialLinks.mixDesignId,
      }).from(premixMaterialLinks),
      [] as { materialId: string; mixDesignId: string }[],
    ),
    safe(
      db.select({
        mixDesignId: mixDesignBom.mixDesignId,
        materialId: mixDesignBom.materialId,
        requiredQty: mixDesignBom.requiredQuantity,
        uom: mixDesignBom.unitOfMeasure,
        matName: materials.name,
      })
        .from(mixDesignBom)
        .leftJoin(materials, eq(mixDesignBom.materialId, materials.id)),
      [] as { mixDesignId: string; materialId: string; requiredQty: string; uom: string; matName: string | null }[],
    ),
  ]);

  const totalGross          = rows.reduce((a, r) => a + Number(r.grossQty), 0);
  const totalIssued         = rows.filter((r) => r.status === "ISSUED").reduce((a, r) => a + Number(r.grossQty), 0);
  const totalPendingApproval    = rows.filter((r) => r.status === "PENDING_APPROVAL").length;
  const totalPendingBodApproval = rows.filter((r) => r.status === "PENDING_BOD_APPROVAL").length;
  const totalPendingPr          = rows.filter((r) => r.status === "PENDING_PR").length;

  const premixLinkMap = new Map<string, string>();
  for (const link of premixLinks) {
    premixLinkMap.set(link.materialId, link.mixDesignId);
  }

  type RawMaterialReq = { projectId: string; mixDesignId: string; materialId: string; matName: string | null; uom: string; requiredQty: number };
  const rawMaterialReqs: RawMaterialReq[] = [];
  for (const row of rows) {
    const concreteMixDesignId = row.matId ? premixLinkMap.get(row.matId) : null;
    if (!concreteMixDesignId || !row.projectId) continue;

    const relatedBom = rawMaterialBom.filter((b) => b.mixDesignId === concreteMixDesignId);
    const concreteVolume = Number(row.grossQty);

    for (const bom of relatedBom) {
      rawMaterialReqs.push({
        projectId: row.projectId,
        mixDesignId: concreteMixDesignId,
        materialId: bom.materialId,
        matName: bom.matName,
        uom: bom.uom,
        requiredQty: Number(bom.requiredQty) * concreteVolume,
      });
    }
  }

  type AggregatedRawMat = { projectId: string; materialId: string; matName: string | null; uom: string; totalRequired: number };
  const rawMatAggregateMap = new Map<string, AggregatedRawMat>();
  for (const req of rawMaterialReqs) {
    const key = `${req.projectId}:${req.materialId}`;
    if (rawMatAggregateMap.has(key)) {
      const existing = rawMatAggregateMap.get(key)!;
      existing.totalRequired += req.requiredQty;
    } else {
      rawMatAggregateMap.set(key, {
        projectId: req.projectId,
        materialId: req.materialId,
        matName: req.matName,
        uom: req.uom,
        totalRequired: req.requiredQty,
      });
    }
  }
  const aggregatedRawMaterials = Array.from(rawMatAggregateMap.values());

  const projectToRawMats = new Map<string, AggregatedRawMat[]>();
  for (const mat of aggregatedRawMaterials) {
    const projList = projectToRawMats.get(mat.projectId) ?? [];
    projList.push(mat);
    projectToRawMats.set(mat.projectId, projList);
  }

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  const kpis = [
    { label: "Pending Mgr Review", value: totalPendingApproval,    sub: "awaiting Planning Mgr", accent: "#e3a008" },
    { label: "Pending BOD",        value: totalPendingBodApproval, sub: "awaiting BOD approval", accent: "#1a56db" },
    { label: "Total Volume",     value: totalGross.toLocaleString("en-PH", { maximumFractionDigits: 2 }),                          sub: "gross m³",                 accent: "#0694a2" },
    { label: "Issued Volume",    value: totalIssued.toLocaleString("en-PH", { maximumFractionDigits: 2 }),                         sub: "m³ issued",                accent: "#057a55" },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
              ← Planning &amp; Engineering
            </a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Batching Forecast</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Concrete volume requirements from NTP-activated BOM entries. Planning must approve before PR can be raised.
          </p>
        </div>

        {totalPendingApproval > 0 && (
          <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", fontSize: "0.82rem", color: "#713f12", fontWeight: 600 }}>
            ⚠ {totalPendingApproval} concrete forecast line{totalPendingApproval !== 1 ? "s" : ""} pending Planning approval.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ ...card, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Concrete Forecast Lines
            </p>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              No concrete forecast lines yet. Approve BOM entries with concrete materials, then activate NTPs.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Project", "Unit Code", "Concrete Mix / Material", "Unit", "Gross Volume", "Consumed", "Remaining", "Status", "Action"].map((h) => (
                      <th key={h} style={{
                        background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
                        fontSize: "0.75rem", fontWeight: 600, color: "#6b7280",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "0.75rem 1rem", textAlign: "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const gross     = Number(row.grossQty);
                    const consumed  = Number(row.consumed);
                    const remaining = gross - consumed;
                    const s = STATUS_BADGE[row.status] ?? { bg: "#f3f4f6", color: "#6b7280", label: row.status };
                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{row.projectName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>{row.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{row.matName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{row.matUnit ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontWeight: 600 }}>{gross.toLocaleString("en-PH", { maximumFractionDigits: 4 })}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#9ca3af" }}>{consumed.toLocaleString("en-PH", { maximumFractionDigits: 4 })}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: remaining <= 0 ? "#057a55" : "#111827" }}>
                          {remaining.toLocaleString("en-PH", { maximumFractionDigits: 4 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", minWidth: "100px" }}>
                          {(row.status === "PENDING_APPROVAL" || row.status === "PENDING_BOD_APPROVAL") && (
                            <ApproveForecastButton forecastId={row.id} status={row.status} canReview={canReview} canBodApprove={canBodApprove} />
                          )}
                          {!["PENDING_APPROVAL", "PENDING_BOD_APPROVAL"].includes(row.status) && (
                            <span style={{ color: "#d1d5db", fontSize: "0.78rem" }}>—</span>
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

        <div style={{ marginTop: "2rem", background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280", margin: 0 }}>
              Raw Materials Required for Concrete Mixes
            </p>
            <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0.3rem 0 0", fontWeight: 400 }}>
              Calculated from mix design specifications for premix materials in active forecasts
            </p>
          </div>
          {aggregatedRawMaterials.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              No raw materials to display. Ensure concrete forecasts are linked to premix materials via Batching Plant recipes.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Project", "Raw Material", "Unit", "Total Required", ""].map((h) => (
                      <th key={h} style={{
                        background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
                        fontSize: "0.75rem", fontWeight: 600, color: "#6b7280",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "0.75rem 1rem", textAlign: "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aggregatedRawMaterials.map((mat, idx) => {
                    const projName = rows.find((r) => r.projectId === mat.projectId)?.projectName ?? "—";
                    return (
                      <tr key={`${mat.projectId}:${mat.materialId}:${idx}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 600 }}>{projName}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{mat.matName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{mat.uom}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontWeight: 600 }}>
                          {mat.totalRequired.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
