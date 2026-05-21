export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import {
  concreteDeliveryNotes, concreteDeliveryReceipts,
  batchingProductionLogs, mixDesigns, projects, projectUnits,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignReceiptForm } from "./SignReceiptForm";

const ACCENT = "#1a56db";

export default async function SignReceiptPage({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const user = await getAuthUser();

  const [note] = await db
    .select({
      id:                 concreteDeliveryNotes.id,
      volumeDispatchedM3: concreteDeliveryNotes.volumeDispatchedM3,
      dispatchedAt:       concreteDeliveryNotes.dispatchedAt,
      productionLogId:    concreteDeliveryNotes.productionLogId,
      projectName:        projects.name,
      unitCode:           projectUnits.unitCode,
      unitId:             concreteDeliveryNotes.unitId,
      mixCode:            mixDesigns.code,
      mixName:            mixDesigns.name,
      batchDate:          batchingProductionLogs.batchDate,
      shift:              batchingProductionLogs.shift,
      internalRatePerM3:  mixDesigns.cementBagsPerM3, // placeholder — actual rate from IPO
    })
    .from(concreteDeliveryNotes)
    .leftJoin(batchingProductionLogs, eq(concreteDeliveryNotes.productionLogId, batchingProductionLogs.id))
    .leftJoin(mixDesigns, eq(batchingProductionLogs.mixDesignId, mixDesigns.id))
    .leftJoin(projects, eq(concreteDeliveryNotes.projectId, projects.id))
    .leftJoin(projectUnits, eq(concreteDeliveryNotes.unitId, projectUnits.id))
    .where(eq(concreteDeliveryNotes.id, noteId))
    .limit(1);

  if (!note) return notFound();

  // Check if already signed
  const [existing] = await db
    .select({ id: concreteDeliveryReceipts.id })
    .from(concreteDeliveryReceipts)
    .where(eq(concreteDeliveryReceipts.deliveryNoteId, noteId))
    .limit(1);

  const volDispatched = Number(note.volumeDispatchedM3);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching/deliver" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Pending Deliveries</a>
        </div>

        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>Sign Delivery Receipt</h1>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
          Site engineer confirms volume received. Signing triggers IDB billing and raw material inventory drawdown.
        </p>

        {/* Delivery note summary */}
        <div style={{
          background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          padding: "1.25rem", marginBottom: "1.25rem",
        }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Delivery Note Details
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1.5rem", fontSize: "0.83rem" }}>
            {[
              ["Project", note.projectName ?? "—"],
              ["Unit", note.unitCode ?? "—"],
              ["Mix Design", `${note.mixCode ?? ""} ${note.mixName ?? ""}`],
              ["Batch Date / Shift", `${note.batchDate ?? "—"} ${note.shift ?? ""}`],
              ["Dispatched At", new Date(note.dispatchedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })],
              ["Volume Dispatched", `${volDispatched.toFixed(2)} m³`],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ color: "#9ca3af", fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.1rem" }}>{label}</div>
                <div style={{ color: "#111827", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {existing ? (
          <div style={{
            padding: "1.25rem", background: "#ecfdf5", border: "1px solid #a7f3d0",
            borderRadius: "10px", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✓</div>
            <p style={{ margin: 0, fontWeight: 600, color: "#065f46" }}>This delivery has already been signed off.</p>
            <p style={{ margin: "0.5rem 0 1rem", fontSize: "0.82rem", color: "#047857" }}>
              IDB billing and inventory drawdown were processed automatically.
            </p>
            <a href="/batching/internal-sales" style={{
              padding: "0.45rem 0.9rem", background: ACCENT, color: "#fff",
              borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>
              View Internal Sales →
            </a>
          </div>
        ) : (
          <div style={{
            background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            padding: "1.25rem",
          }}>
            <SignReceiptForm
              deliveryNoteId={noteId}
              unitId={note.unitId}
              volumeDispatchedM3={volDispatched}
              userId={user?.id ?? ""}
            />
          </div>
        )}
      </div>
    </main>
  );
}
