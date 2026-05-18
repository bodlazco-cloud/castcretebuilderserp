export const dynamic = "force-dynamic";

import { db } from "@/db";
import { mixDesigns, mixDesignBom, materials, projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { RecipeBOMClient } from "./RecipeBOMClient";

const ACCENT = "#1a56db";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ mixId: string }>;
}) {
  await getAuthUser();
  const { mixId } = await params;

  const [mix] = await db
    .select({
      id:          mixDesigns.id,
      code:        mixDesigns.code,
      name:        mixDesigns.name,
      isActive:    mixDesigns.isActive,
      projName:    projects.name,
      cementBags:  mixDesigns.cementBagsPerM3,
      sandKg:      mixDesigns.sandKgPerM3,
      gravelKg:    mixDesigns.gravelKgPerM3,
      waterLiters: mixDesigns.waterLitersPerM3,
      createdAt:   mixDesigns.createdAt,
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
      materialUnit:     materials.unit,
    })
    .from(mixDesignBom)
    .leftJoin(materials, eq(mixDesignBom.materialId, materials.id))
    .where(eq(mixDesignBom.mixDesignId, mixId))
    .orderBy(asc(mixDesignBom.sortOrder));

  const allMaterials = await db
    .select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
    .from(materials)
    .where(eq(materials.isActive, true))
    .orderBy(materials.name);

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
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Master Mix Profile
            </span>
            <h1 style={{ margin: "0.2rem 0 0.15rem", fontSize: "1.6rem", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
              {mix.code}
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>{mix.name}</p>
            {mix.projName && (
              <p style={{ margin: "0.2rem 0 0", color: "#9ca3af", fontSize: "0.78rem" }}>
                Project: {mix.projName}
              </p>
            )}
          </div>

          {/* Legacy ratio grid */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.65rem" }}>
              Design Ratios (per 1 m³)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.65rem" }}>
              {[
                { label: "Cement", value: `${Number(mix.cementBags).toFixed(3)} bags` },
                { label: "Sand", value: `${Number(mix.sandKg).toFixed(1)} kg` },
                { label: "Gravel", value: `${Number(mix.gravelKg).toFixed(1)} kg` },
                { label: "Water", value: `${Number(mix.waterLiters).toFixed(1)} L` },
              ].map((r) => (
                <div key={r.label} style={{ padding: "0.65rem 0.85rem", background: "#f9fafb", borderRadius: "7px", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.15rem" }}>{r.label}</div>
                  <div style={{ fontWeight: 700, color: "#111827", fontFamily: "monospace", fontSize: "0.92rem" }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recipe BOM (client-side for add/delete) */}
        <RecipeBOMClient
          mixId={mix.id}
          mixCode={mix.code}
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
