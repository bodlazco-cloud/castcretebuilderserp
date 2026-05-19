export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  internalPurchaseOrders, mixDesigns, projects, projectUnits,
  ipoRawMaterialRequirements, batchingPlantPRFlags, materials,
} from "@/db/schema";
import { purchaseRequisitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { IPODetailClient } from "./IPODetailClient";

const ACCENT = "#1a56db";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING:       { bg: "#fef3c7", color: "#92400e" },
  ACCEPTED:      { bg: "#eff6ff", color: "#1e40af" },
  IN_PRODUCTION: { bg: "#e0f2fe", color: "#0369a1" },
  DELIVERED:     { bg: "#ecfdf5", color: "#065f46" },
  BILLED:        { bg: "#f3e8ff", color: "#6b21a8" },
};

const STATUS_STEPS = ["PENDING", "ACCEPTED", "IN_PRODUCTION", "DELIVERED", "BILLED"];

export default async function IPODetailPage({
  params,
}: {
  params: Promise<{ ipoId: string }>;
}) {
  const user = await getAuthUser();
  const { ipoId } = await params;

  const [ipo] = await db
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
      mixStatus:         mixDesigns.status,
      projName:          projects.name,
      projId:            projects.id,
      unitCode:          projectUnits.unitCode,
    })
    .from(internalPurchaseOrders)
    .leftJoin(mixDesigns, eq(internalPurchaseOrders.mixDesignId, mixDesigns.id))
    .leftJoin(projects, eq(internalPurchaseOrders.projectId, projects.id))
    .leftJoin(projectUnits, eq(internalPurchaseOrders.unitId, projectUnits.id))
    .where(eq(internalPurchaseOrders.id, ipoId))
    .limit(1);

  if (!ipo) notFound();

  const [requirements, prFlag] = await Promise.all([
    db
      .select({
        id:            ipoRawMaterialRequirements.id,
        materialId:    ipoRawMaterialRequirements.materialId,
        materialName:  materials.name,
        materialCode:  materials.code,
        requiredQty:   ipoRawMaterialRequirements.requiredQty,
        unitOfMeasure: ipoRawMaterialRequirements.unitOfMeasure,
        prItemId:      ipoRawMaterialRequirements.prItemId,
      })
      .from(ipoRawMaterialRequirements)
      .leftJoin(materials, eq(ipoRawMaterialRequirements.materialId, materials.id))
      .where(eq(ipoRawMaterialRequirements.ipoId, ipoId)),
    db
      .select({ prId: batchingPlantPRFlags.prId, receivingLocation: batchingPlantPRFlags.receivingLocation })
      .from(batchingPlantPRFlags)
      .where(eq(batchingPlantPRFlags.ipoId, ipoId))
      .limit(1),
  ]);

  const statusStyle = STATUS_STYLES[ipo.status] ?? STATUS_STYLES["PENDING"];
  const currentStepIdx = STATUS_STEPS.indexOf(ipo.status);
  const volume = Number(ipo.requestedVolumeM3);
  const rate = ipo.internalRatePerM3 ? Number(ipo.internalRatePerM3) : null;
  const totalValue = rate ? volume * rate : null;
  const prFlagData = prFlag[0] ?? null;
  const isExploded = requirements.length > 0;
  const hasPR = !!prFlagData;

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "2rem", maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/batching/ipo" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← IPO Queue
          </a>
        </div>

        {/* Header card */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Internal Purchase Order
              </span>
              <h1 style={{ margin: "0.2rem 0 0.15rem", fontSize: "1.6rem", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                {ipo.ipoNumber}
              </h1>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
                {ipo.projName} · Unit: {ipo.unitCode ?? "—"}
              </p>
            </div>
            <span style={{
              display: "inline-block", padding: "0.35rem 0.9rem", borderRadius: "999px",
              fontSize: "0.8rem", fontWeight: 700,
              background: statusStyle.bg, color: statusStyle.color,
              alignSelf: "flex-start",
            }}>
              {ipo.status.replace("_", " ")}
            </span>
          </div>

          {/* Status pipeline */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "1.25rem", overflowX: "auto" }}>
            {STATUS_STEPS.map((step, i) => {
              const done = i < currentStepIdx;
              const active = i === currentStepIdx;
              const s = STATUS_STYLES[step]!;
              return (
                <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STATUS_STEPS.length - 1 ? 1 : "none" }}>
                  <div style={{
                    padding: "0.3rem 0.65rem", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700,
                    whiteSpace: "nowrap",
                    background: active ? s.bg : done ? "#ecfdf5" : "#f3f4f6",
                    color: active ? s.color : done ? "#057a55" : "#9ca3af",
                    border: active ? `1.5px solid ${s.color}` : "none",
                  }}>
                    {done ? "✓ " : ""}{step.replace("_", " ")}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: "1px", background: done ? "#a7f3d0" : "#e5e7eb", minWidth: "16px" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
            {[
              { label: "Mix Design", value: `${ipo.mixCode ?? "—"} — ${ipo.mixName ?? ""}` },
              { label: "Requested Volume", value: `${volume.toFixed(2)} m³` },
              { label: "Internal Rate", value: rate ? `₱${rate.toLocaleString("en-PH", { minimumFractionDigits: 2 })} / m³` : "—" },
              { label: "Total Value", value: totalValue ? `₱${totalValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—" },
              { label: "Triggered By", value: ipo.triggeredBy ?? "Manual" },
              { label: "Created", value: ipo.createdAt ? new Date(ipo.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" }) : "—" },
            ].map((item) => (
              <div key={item.label} style={{ padding: "0.65rem 0.85rem", background: "#f9fafb", borderRadius: "7px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginBottom: "0.15rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</div>
                <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.82rem" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {ipo.notes && (
            <div style={{ marginTop: "0.85rem", padding: "0.65rem 0.85rem", background: "#f9fafb", borderRadius: "6px", fontSize: "0.82rem", color: "#6b7280" }}>
              <strong style={{ color: "#374151" }}>Notes:</strong> {ipo.notes}
            </div>
          )}
        </div>

        {/* Raw Material Requirements + actions (client) */}
        <IPODetailClient
          ipoId={ipoId}
          ipoStatus={ipo.status}
          userId={user?.id ?? ""}
          isExploded={isExploded}
          hasPR={hasPR}
          prId={prFlagData?.prId ?? null}
          initialRequirements={requirements.map((r) => ({
            id:            r.id,
            materialName:  r.materialName ?? "—",
            materialCode:  r.materialCode ?? "",
            requiredQty:   Number(r.requiredQty),
            unitOfMeasure: r.unitOfMeasure,
            prItemId:      r.prItemId ?? null,
          }))}
        />
      </div>
    </main>
  );
}
