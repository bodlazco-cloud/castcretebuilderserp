export const dynamic = "force-dynamic";

import { db } from "@/db";
import { mixDesigns, mixDesignBom, materials, projects } from "@/db/schema";
import { eq, count, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import Link from "next/link";
import { AddMixDesignForm } from "./AddMixDesignForm";

const ACCENT = "#1a56db";

function StatusPill({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.55rem",
      borderRadius: "999px",
      fontSize: "0.7rem",
      fontWeight: 700,
      background: active ? "#ecfdf5" : "#f3f4f6",
      color: active ? "#057a55" : "#9ca3af",
      letterSpacing: "0.03em",
    }}>
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}

export default async function RecipesPage() {
  const user = await getAuthUser();

  const [projectRows, mixRows, bomCountRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
    db
      .select({
        id:          mixDesigns.id,
        code:        mixDesigns.code,
        name:        mixDesigns.name,
        isActive:    mixDesigns.isActive,
        createdAt:   mixDesigns.createdAt,
        projectId:   mixDesigns.projectId,
        projName:    projects.name,
      })
      .from(mixDesigns)
      .leftJoin(projects, eq(mixDesigns.projectId, projects.id))
      .orderBy(asc(mixDesigns.code)),
    db
      .select({ mixDesignId: mixDesignBom.mixDesignId, cnt: count() })
      .from(mixDesignBom)
      .groupBy(mixDesignBom.mixDesignId),
  ]);

  const bomCountMap = new Map(bomCountRows.map((r) => [r.mixDesignId, Number(r.cnt)]));

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "2rem", maxWidth: "1100px" }}>
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
              Mix Design Recipe Register
            </h1>
            <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>
              Define and manage raw material recipes per 1 m³ for each concrete mix design.
            </p>
          </div>
          <AddMixDesignForm projects={projectRows} userId={user?.id ?? ""} />
        </div>

        {mixRows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No mix designs yet. Create one to start building recipe BOMs.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {mixRows.map((mix) => {
              const ingredients = bomCountMap.get(mix.id) ?? 0;
              return (
                <Link
                  key={mix.id}
                  href={`/batching/recipes/${mix.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    background: "#fff",
                    borderRadius: "10px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    cursor: "pointer",
                    borderLeft: `4px solid ${mix.isActive ? ACCENT : "#d1d5db"}`,
                    transition: "box-shadow 0.15s",
                  }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                          {mix.code}
                        </span>
                        <StatusPill active={mix.isActive} />
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>{mix.name}</div>
                      {mix.projName && (
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.2rem" }}>
                          Project: {mix.projName}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: ingredients > 0 ? "#111827" : "#d1d5db" }}>
                          {ingredients}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af", whiteSpace: "nowrap" }}>
                          {ingredients === 1 ? "Ingredient" : "Ingredients"}
                        </div>
                      </div>
                      <span style={{ color: ACCENT, fontSize: "1.1rem", fontWeight: 300 }}>→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
