export const dynamic = "force-dynamic";

import { db } from "@/db";
import { phaseCategories, phaseScopes, phaseActivities } from "@/db/schema/phases";
import { masterBomEntries } from "@/db/schema";
import { eq, count } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

type CategoryRow = { id: string; code: string; name: string; sequenceOrder: number };
type ScopeRow    = { id: string; categoryId: string; code: string; name: string; sequenceOrder: number };
type ActivityRow = { id: string; scopeId: string; code: string; name: string; standardDurationDays: number; weightInScopePct: string; sequenceOrder: number };
type BomCountRow = { phaseScopeId: string | null; cnt: number };

export default async function ScopeOfWorkPage() {
  const [categories, scopes, activities, bomCounts] = await Promise.all([
    safe(
      db.select({ id: phaseCategories.id, code: phaseCategories.code, name: phaseCategories.name, sequenceOrder: phaseCategories.sequenceOrder })
        .from(phaseCategories)
        .where(eq(phaseCategories.isActive, true))
        .orderBy(phaseCategories.sequenceOrder),
      [] as CategoryRow[],
    ),
    safe(
      db.select({ id: phaseScopes.id, categoryId: phaseScopes.categoryId, code: phaseScopes.code, name: phaseScopes.name, sequenceOrder: phaseScopes.sequenceOrder })
        .from(phaseScopes)
        .where(eq(phaseScopes.isActive, true))
        .orderBy(phaseScopes.sequenceOrder),
      [] as ScopeRow[],
    ),
    safe(
      db.select({
          id: phaseActivities.id, scopeId: phaseActivities.scopeId,
          code: phaseActivities.code, name: phaseActivities.name,
          standardDurationDays: phaseActivities.standardDurationDays,
          weightInScopePct: phaseActivities.weightInScopePct,
          sequenceOrder: phaseActivities.sequenceOrder,
        })
        .from(phaseActivities)
        .where(eq(phaseActivities.isActive, true))
        .orderBy(phaseActivities.sequenceOrder),
      [] as ActivityRow[],
    ),
    safe(
      db.select({ phaseScopeId: masterBomEntries.phaseScopeId, cnt: count() })
        .from(masterBomEntries)
        .where(eq(masterBomEntries.isActive, true))
        .groupBy(masterBomEntries.phaseScopeId),
      [] as BomCountRow[],
    ),
  ]);

  const bomByScope = new Map(bomCounts.map((r) => [r.phaseScopeId ?? "", Number(r.cnt)]));
  const activitiesByScope = new Map<string, ActivityRow[]>();
  for (const act of activities) {
    if (!activitiesByScope.has(act.scopeId)) activitiesByScope.set(act.scopeId, []);
    activitiesByScope.get(act.scopeId)!.push(act);
  }
  const scopesByCategory = new Map<string, ScopeRow[]>();
  for (const sc of scopes) {
    if (!scopesByCategory.has(sc.categoryId)) scopesByCategory.set(sc.categoryId, []);
    scopesByCategory.get(sc.categoryId)!.push(sc);
  }

  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <style>{`
        details.sow-cat > summary { list-style: none; cursor: pointer; }
        details.sow-cat > summary::-webkit-details-marker { display: none; }
        details.sow-cat > summary .sow-chevron { transition: transform 0.2s; display: inline-block; }
        details.sow-cat[open] > summary .sow-chevron { transform: rotate(180deg); }
      `}</style>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Planning &amp; Engineering</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Scope of Work</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Phase categories, scopes, and activities used in BOM entry and construction tracking.
            Managed in <a href="/admin/construction-phases" style={{ color: "#1a56db", textDecoration: "none" }}>Admin → Construction Phases</a>.
          </p>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Phase Categories", value: categories.length, accent: "#7e3af2" },
            { label: "Scopes of Work",  value: scopes.length,     accent: "#1a56db" },
            { label: "Activities",       value: activities.length, accent: "#057a55" },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: "1.1rem 1.4rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginTop: "0.3rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {categories.length === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>No construction phases configured yet.</p>
            <a href="/admin/construction-phases" style={{ color: "#1a56db", fontSize: "0.875rem" }}>Configure in Admin →</a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {categories.map((cat) => {
              const catScopes = scopesByCategory.get(cat.id) ?? [];
              const catActivities = catScopes.flatMap((s) => activitiesByScope.get(s.id) ?? []);
              const catBomCount  = catScopes.reduce((sum, s) => sum + (bomByScope.get(s.id) ?? 0), 0);
              return (
                <details key={cat.id} className="sow-cat" open style={{ ...card, overflow: "hidden" }}>
                  <summary>
                    <div style={{ padding: "0.8rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span className="sow-chevron" style={{ color: "#9ca3af", fontSize: "0.8rem" }}>▾</span>
                      <span style={{ fontFamily: "monospace", background: "#ede9fe", color: "#5b21b6", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>{cat.code}</span>
                      <span style={{ fontWeight: 700, color: "#111827" }}>{cat.name}</span>
                      <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{catScopes.length} scope{catScopes.length !== 1 ? "s" : ""} · {catActivities.length} activit{catActivities.length !== 1 ? "ies" : "y"}</span>
                      {catBomCount > 0 && (
                        <span style={{ fontSize: "0.72rem", background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>
                          {catBomCount} BOM lines
                        </span>
                      )}
                    </div>
                  </summary>

                  <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {catScopes.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: "0.82rem", margin: 0 }}>No scopes in this category.</p>
                    ) : catScopes.map((scope) => {
                      const acts = activitiesByScope.get(scope.id) ?? [];
                      const scopeBomCount = bomByScope.get(scope.id) ?? 0;
                      const totalWeight = acts.reduce((s, a) => s + Number(a.weightInScopePct), 0);
                      return (
                        <div key={scope.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                          {/* Scope header */}
                          <div style={{ padding: "0.65rem 1rem", background: "#fafafa", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>{scope.code}</span>
                            <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem" }}>{scope.name}</span>
                            <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{acts.length} activit{acts.length !== 1 ? "ies" : "y"}</span>
                            {scopeBomCount > 0 && (
                              <span style={{ fontSize: "0.68rem", background: "#d1fae5", color: "#065f46", padding: "0.1rem 0.4rem", borderRadius: "999px", fontWeight: 600 }}>
                                {scopeBomCount} BOM
                              </span>
                            )}
                            <a href={`/planning/bom/new`} style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#1a56db", fontWeight: 600, textDecoration: "none" }}>+ BOM Entry →</a>
                          </div>
                          {/* Activity rows */}
                          {acts.length > 0 && (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                              <thead>
                                <tr>
                                  {["Activity Code", "Activity Name", "Duration (days)", "Weight in Scope (%)"].map((h) => (
                                    <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6", padding: "0.5rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {acts.map((act, idx) => (
                                  <tr key={act.id} style={{ borderBottom: idx < acts.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                                    <td style={{ padding: "0.5rem 1rem", fontFamily: "monospace", color: "#374151", fontWeight: 600 }}>{act.code}</td>
                                    <td style={{ padding: "0.5rem 1rem", color: "#111827" }}>{act.name}</td>
                                    <td style={{ padding: "0.5rem 1rem", color: "#6b7280", textAlign: "center" }}>{act.standardDurationDays}d</td>
                                    <td style={{ padding: "0.5rem 1rem", textAlign: "center" }}>
                                      <span style={{ fontFamily: "monospace", color: Number(act.weightInScopePct) > 0 ? "#374151" : "#d1d5db" }}>
                                        {Number(act.weightInScopePct).toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {acts.length > 1 && (
                                  <tr>
                                    <td colSpan={2} style={{ padding: "0.4rem 1rem", color: "#9ca3af", fontSize: "0.72rem", fontStyle: "italic" }}>Total scope weight</td>
                                    <td />
                                    <td style={{ padding: "0.4rem 1rem", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: Math.abs(totalWeight - 100) < 0.1 ? "#057a55" : "#e3a008" }}>
                                      {totalWeight.toFixed(1)}%
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })}
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
