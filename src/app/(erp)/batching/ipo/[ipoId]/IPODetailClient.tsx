"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { explodeIPORequirements, generateBatchingPlantPR, updateIPOStatus } from "@/actions/batching-bom";

const ACCENT = "#1a56db";

interface Requirement {
  id: string;
  materialName: string;
  materialCode: string;
  requiredQty: number;
  unitOfMeasure: string;
  prItemId: string | null;
}

interface Props {
  ipoId: string;
  ipoStatus: string;
  userId: string;
  isExploded: boolean;
  hasPR: boolean;
  prId: string | null;
  initialRequirements: Requirement[];
}

const STATUS_NEXT: Record<string, string> = {
  PENDING:       "ACCEPTED",
  ACCEPTED:      "IN_PRODUCTION",
  IN_PRODUCTION: "DELIVERED",
  DELIVERED:     "BILLED",
};

const STATUS_ACTION_LABEL: Record<string, string> = {
  PENDING:       "Accept IPO",
  ACCEPTED:      "Start Production",
  IN_PRODUCTION: "Mark Delivered",
  DELIVERED:     "Mark Billed",
};

export function IPODetailClient({
  ipoId, ipoStatus, userId, isExploded, hasPR, prId, initialRequirements,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [exploded, setExploded] = useState(isExploded);
  const [prGenerated, setPrGenerated] = useState(hasPR);
  const [currentPrId, setCurrentPrId] = useState(prId);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function handleExplode() {
    startTransition(async () => {
      setError(null);
      const res = await explodeIPORequirements(ipoId);
      if (res.success) {
        setRequirements(res.items.map((item, i) => ({
          id: String(i),
          materialName: item.materialName,
          materialCode: "",
          requiredQty: item.requiredQty,
          unitOfMeasure: item.unitOfMeasure,
          prItemId: null,
        })));
        setExploded(true);
        flash("BOM exploded successfully.");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleGeneratePR() {
    startTransition(async () => {
      setError(null);
      const res = await generateBatchingPlantPR(ipoId, userId);
      if (res.success) {
        setPrGenerated(true);
        setCurrentPrId(res.prId);
        flash(`Purchase Requisition created (DRAFT). Purchasing team has been notified.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleAdvanceStatus() {
    const nextStatus = STATUS_NEXT[ipoStatus];
    if (!nextStatus) return;
    startTransition(async () => {
      setError(null);
      const res = await updateIPOStatus({
        id: ipoId,
        status: nextStatus as "PENDING" | "ACCEPTED" | "IN_PRODUCTION" | "DELIVERED" | "BILLED",
        acceptedBy: nextStatus === "ACCEPTED" ? userId : undefined,
      });
      if (res.success) {
        flash(`Status updated to ${nextStatus.replace("_", " ")}.`);
        router.refresh();
      } else {
        setError(res.error ?? "Failed to update status.");
      }
    });
  }

  const nextStatus = STATUS_NEXT[ipoStatus];
  const actionLabel = STATUS_ACTION_LABEL[ipoStatus];
  const isBilled = ipoStatus === "BILLED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Status messages */}
      {successMsg && (
        <div style={{ padding: "0.75rem 1rem", background: "#ecfdf5", color: "#065f46", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", color: "#dc2626", borderRadius: "8px", fontSize: "0.82rem" }}>
          {error}
        </div>
      )}

      {/* Action toolbar */}
      {!isBilled && (
        <div style={{
          background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.8rem", color: "#6b7280", flex: 1 }}>IPO Actions</span>

          {/* 1. Explode BOM */}
          {!exploded && (
            <button
              disabled={isPending}
              onClick={handleExplode}
              style={{
                padding: "0.45rem 0.9rem", background: "#f59e0b", color: "#fff",
                border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Exploding…" : "⚗️ Explode BOM"}
            </button>
          )}

          {/* 2. Generate PR */}
          {exploded && !prGenerated && (
            <button
              disabled={isPending}
              onClick={handleGeneratePR}
              style={{
                padding: "0.45rem 0.9rem", background: ACCENT, color: "#fff",
                border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Generating…" : "📋 Generate Batching Plant PR"}
            </button>
          )}

          {/* PR link */}
          {prGenerated && currentPrId && (
            <span style={{
              padding: "0.35rem 0.75rem", background: "#ecfdf5", color: "#065f46",
              borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600,
            }}>
              ✓ PR Generated — visible in Procurement
            </span>
          )}

          {/* 3. Advance status */}
          {nextStatus && actionLabel && (
            <button
              disabled={isPending}
              onClick={handleAdvanceStatus}
              style={{
                padding: "0.45rem 0.9rem", background: "#111827", color: "#fff",
                border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Updating…" : `→ ${actionLabel}`}
            </button>
          )}
        </div>
      )}

      {/* Raw Material Requirements */}
      <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>
              Raw Material Requirements
            </h3>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
              {exploded
                ? "Exploded from Recipe BOM × requested volume. These become Batching Plant PR line items."
                : 'Click "Explode BOM" to calculate raw material quantities from the mix design recipe.'}
            </p>
          </div>
          {exploded && (
            <button
              disabled={isPending}
              onClick={handleExplode}
              title="Re-calculate from recipe BOM"
              style={{
                padding: "0.3rem 0.65rem", background: "transparent",
                border: "1px solid #d1d5db", borderRadius: "6px",
                fontSize: "0.72rem", color: "#6b7280", cursor: "pointer",
              }}
            >
              ↺ Recalculate
            </button>
          )}
        </div>

        {requirements.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
            No requirements yet. Explode the BOM to generate raw material quantities.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Material Code", "Material Name", "Required Qty", "UOM", "PR Status"].map((h, i) => (
                    <th key={i} style={{
                      padding: "0.65rem 1rem", fontWeight: 600, color: "#374151",
                      textAlign: i === 2 ? "right" : "left", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requirements.map((req, i) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: ACCENT, fontSize: "0.78rem" }}>
                      {req.materialCode || "—"}
                    </td>
                    <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>
                      {req.materialName}
                    </td>
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>
                      {req.requiredQty.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{req.unitOfMeasure}</td>
                    <td style={{ padding: "0.65rem 1rem" }}>
                      {req.prItemId ? (
                        <span style={{ padding: "0.15rem 0.45rem", background: "#ecfdf5", color: "#057a55", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>
                          ON PR
                        </span>
                      ) : (
                        <span style={{ color: "#d1d5db", fontSize: "0.72rem" }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Receiving note */}
        {prGenerated && (
          <div style={{ padding: "0.75rem 1.5rem", background: "#eff6ff", borderTop: "1px solid #f3f4f6", fontSize: "0.75rem", color: "#1e40af" }}>
            <strong>Delivery Instruction:</strong> All raw materials on this PR must be received and signed off at the
            <strong> Batching Plant warehouse</strong>, not the construction site. The MRR receiving location is tagged BATCHING_PLANT.
          </div>
        )}
      </div>

      {/* Ledger note when billed */}
      {isBilled && (
        <div style={{
          padding: "0.85rem 1rem", background: "#f3e8ff", borderRadius: "7px",
          borderLeft: "3px solid #7c3aed", fontSize: "0.78rem", color: "#6b21a8",
        }}>
          <strong>IDB Posted:</strong> Project Cost Center debited · Batching Plant Internal Revenue credited.
          This transaction is captured in the corporate P&amp;L elimination module — net internal transfer = ₱0.
        </div>
      )}
    </div>
  );
}
