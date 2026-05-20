export const dynamic = "force-dynamic";

import { db } from "@/db";
import { mixDesigns, mixDesignBom, materials, projects, premixMaterialLinks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { RecipeBOMClient } from "./RecipeBOMClient";
import { ApprovalBar } from "./ApprovalBar";
import { LinkMaterialForm } from "./LinkMaterialForm";

const ACCENT = "#1a56db";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#374151", label: "Draft" },
  PENDING_REVIEW: { bg: "#fef3c7", color: "#92400e", label: "Pending Review" },
  APPROVED:       { bg: "#ecfdf5", color: "#065f46", label: "Approved — Locked" },
  REJECTED:       { bg: "#fef2f2", color: "#dc2626", label: "Rejected" },
};

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ mixId: string }>;
}) {
  const user = await getAuthUser();
  const { mixId } = await params;

  const [mix] = await db
    .select({
      id:             mixDesigns.id,
      code:           mixDesigns.code,
      name:           mixDesigns.name,
      isActive:       mixDesigns.isActive,
      status:         mixDesigns.status,
      rejectionReason: mixDesigns.rejectionReason,
      submittedAt:    mixDesigns.submittedAt,
      approvedAt:     mixDesigns.approvedAt,
      projName:       projects.name,
      cementBags:     mixDesigns.cementBagsPerM3,
      sandKg:         mixDesigns.sandKgPerM3,
      gravelKg:       mixDesigns.gravelKgPerM3,
      gravelSpec:     mixDesigns.gravelSpec,
      waterLiters:    mixDesigns.waterLitersPerM3,
      admixture:      mixDesigns.admixtureLitersPerM3,
      admixtureType:  mixDesigns.admixtureType,
      createdAt:      mixDesigns.createdAt,
    })
    .from(mixDesigns)
    .leftJoin(projects, eq(mixDesigns.projectId, projects.id))
    .where(eq(mixDesigns.id, mixId))
    .limit(1);

  if (!mix) notFound();

  const bomItems = await db
    .select({
      id:               mixDesignBom.id,
      materialId:       mixDesignBom.materialId,
      requiredQuantity: mixDesignBom.requiredQuantity,
      unitOfMeasure:    mixDesignBom.unitOfMeasure,
      sortOrder:        mixDesignBom.sortOrder,
      notes:            mixDesignBom.notes,
      materialName:     materials.name,
      materialCode:     materials.code,
    })
    .from(mixDesignBom)
    .leftJoin(materials, eq(mixDesignBom.materialId, materials.id))
    .where(eq(mixDesignBom.mixDesignId, mixId))
    .orderBy(asc(mixDesignBom.sortOrder));

  const [allMaterials, linkedMaterialRows] = await Promise.all([
    db
      .select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
      .from(materials)
      .where(eq(materials.isActive, true))
      .orderBy(materials.name),
    db
      .select({
        materialId:   premixMaterialLinks.materialId,
        materialName: materials.name,
        materialCode: materials.code,
      })
      .from(premixMaterialLinks)
      .leftJoin(materials, eq(premixMaterialLinks.materialId, materials.id))
      .where(eq(premixMaterialLinks.mixDesignId, mixId))
      .limit(1),
  ]);

  const linkedMaterial = linkedMaterialRows[0]
    ? {
        materialId:   linkedMaterialRows[0].materialId,
        materialName: linkedMaterialRows[0].materialName ?? "—",
        materialCode: linkedMaterialRows[0].materialCode ?? "",
      }
    : null;

  const statusStyle = STATUS_STYLES[mix.status] ?? STATUS_STYLES["DRAFT"];
  const isLocked = mix.status === "APPROVED" || mix.status === "PENDING_REVIEW";

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "2rem", maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/batching/recipes" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Mix Design Register
          </a>
        </div>

        {/* Mix Profile Card */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Master Mix Profile
                </span>
                <h1 style={{ margin: "0.2rem 0 0.15rem", fontSize: "1.6rem", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                  {mix.code}
                </h1>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>{mix.name}</p>
                {mix.projName && (
                  <p style={{ margin: "0.2rem 0 0", color: "#9ca3af", fontSize: "0.78rem" }}>Project: {mix.projName}</p>
                )}
              </div>

              {/* Status badge */}
              <span style={{
                display: "inline-block", padding: "0.35rem 0.85rem", borderRadius: "999px",
                fontSize: "0.78rem", fontWeight: 700,
                background: statusStyle.bg, color: statusStyle.color,
                whiteSpace: "nowrap", alignSelf: "flex-start",
              }}>
                {statusStyle.label}
              </span>
            </div>

            {/* Rejection banner */}
            {mix.status === "REJECTED" && mix.rejectionReason && (
              <div style={{ marginTop: "0.75rem", padding: "0.65rem 0.85rem", background: "#fef2f2", borderLeft: "3px solid #dc2626", borderRadius: "4px", fontSize: "0.8rem", color: "#dc2626" }}>
                <strong>Rejection reason:</strong> {mix.rejectionReason}
              </div>
            )}
          </div>

          {/* Legacy ratio grid */}
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.65rem" }}>
              Design Ratios (per 1 m³)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.65rem" }}>
              {([
                { label: "Cement", value: `${Number(mix.cementBags).toFixed(3)} bags` },
                { label: "Sand (Fine Aggregate)", value: `${Number(mix.sandKg).toFixed(1)} kg` },
                {
                  label: mix.gravelSpec ? `Gravel — ${mix.gravelSpec}` : "Gravel (Coarse Aggregate)",
                  value: `${Number(mix.gravelKg).toFixed(1)} kg`,
                },
                { label: "Water", value: `${Number(mix.waterLiters).toFixed(1)} L` },
                ...(mix.admixture
                  ? [{ label: mix.admixtureType ? `Admixture — ${mix.admixtureType}` : "Admixture", value: `${Number(mix.admixture).toFixed(3)} L` }]
                  : []),
              ] as { label: string; value: string }[]).map((r) => (
                <div key={r.label} style={{ padding: "0.65rem 0.85rem", background: "#f9fafb", borderRadius: "7px", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.15rem" }}>{r.label}</div>
                  <div style={{ fontWeight: 700, color: "#111827", fontFamily: "monospace", fontSize: "0.92rem" }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Approval action bar (client component) */}
        <ApprovalBar
          mixId={mix.id}
          mixCode={mix.code}
          status={mix.status}
          userId={user?.id ?? ""}
        />

        {/* Planning BOM Material Link */}
        <LinkMaterialForm
          mixId={mix.id}
          linkedMaterial={linkedMaterial}
          allMaterials={allMaterials}
        />

        {/* Recipe BOM (locked when APPROVED or PENDING_REVIEW) */}
        <RecipeBOMClient
          mixId={mix.id}
          mixCode={mix.code}
          isLocked={isLocked}
          lockedReason={
            mix.status === "APPROVED"
              ? "This mix design is approved and locked. Clone it as a new version to propose changes."
              : mix.status === "PENDING_REVIEW"
              ? "This mix design is under review and cannot be edited until a decision is made."
              : undefined
          }
          initialItems={bomItems.map((b) => ({
            id:               b.id,
            materialId:       b.materialId ?? "",
            materialName:     b.materialName ?? "—",
            materialCode:     b.materialCode ?? "",
            requiredQuantity: b.requiredQuantity ?? "0",
            unitOfMeasure:    b.unitOfMeasure,
            notes:            b.notes,
          }))}
          allMaterials={allMaterials}
        />

        {/* Lock Protocol notice */}
        <div style={{
          marginTop: "1.25rem", padding: "0.85rem 1rem",
          background: "#eff6ff", borderRadius: "7px",
          borderLeft: `3px solid ${ACCENT}`,
          fontSize: "0.78rem", color: "#1e40af",
        }}>
          <strong>Sequential Lock Protocol:</strong> Modifications to locked Mix Design recipes require
          an authorized Admin-level bypass and trigger auto-recalculation across all pending
          internal production queues.
        </div>
      </div>
    </main>
  );
}
