"use server";

import { db } from "@/db";
import {
  bomStandards, materials, inventoryStock,
  purchaseRequisitions, purchaseRequisitionItems,
  purchaseOrders, purchaseOrderItems,
  poPriceChangeRequests, suppliers,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE II — Auto-populate PO from Master BOM
//
// Flow:
//   1. Planning triggers a Budget Request for a unit + activity.
//   2. System reads the Master BOM for that unit model / activity.
//   3. Net quantity = BOM qty - stock on hand.
//   4. PR is auto-created (Procurement CANNOT edit price or quantity).
//   5. PO is auto-populated from the approved PR.
//
// Constraint: Price = Admin-fixed (materials.admin_price).
//             Quantity = Planning-fixed (BOM standard minus stock).
// ═══════════════════════════════════════════════════════════════════════════════

const AutoGeneratePrSchema = z.object({
  projectId:      z.string().uuid(),
  unitId:         z.string().uuid(),
  unitModel:      z.string().min(1),
  activityCode:   z.string().min(1),
  category:       z.enum(["STRUCTURAL", "ARCHITECTURAL", "TURNOVER"]),
  taskAssignmentId: z.string().uuid().optional(),
  requestedBy:    z.string().uuid(),
});

export type AutoGeneratePrResult =
  | { success: true; prId: string; itemCount: number; totalAmount: string }
  | { success: false; error: string };

/**
 * Auto-generates a Purchase Requisition from the Master BOM for a given
 * unit model + activity, netting out existing stock on hand.
 */
export async function autoGeneratePurchaseRequisition(
  input: z.infer<typeof AutoGeneratePrSchema>,
): Promise<AutoGeneratePrResult> {
  const parsed = AutoGeneratePrSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { projectId, unitId, unitModel, activityCode, category, taskAssignmentId, requestedBy } =
    parsed.data;

  // ── 1. Fetch BOM standard for this unit model + activity ──────────────────
  const bomItems = await db
    .select({
      materialId:      bomStandards.materialId,
      quantityPerUnit: bomStandards.quantityPerUnit,
      adminPrice:      materials.adminPrice,
      materialCode:    materials.code,
    })
    .from(bomStandards)
    .innerJoin(materials, eq(materials.id, bomStandards.materialId))
    .where(
      and(
        eq(bomStandards.projectId, projectId),
        eq(bomStandards.unitModel, unitModel),
        eq(bomStandards.activityCode, activityCode),
        eq(bomStandards.category, category as any),
        eq(bomStandards.isActive, true),
        eq(materials.isActive, true),
      ),
    );

  if (bomItems.length === 0) {
    return { success: false, error: `No active BOM found for model '${unitModel}', activity '${activityCode}'.` };
  }

  // ── 2. Fetch current stock for each material ──────────────────────────────
  const materialIds = bomItems.map((b) => b.materialId);
  const stockRows = await db
    .select({ materialId: inventoryStock.materialId, quantityOnHand: inventoryStock.quantityOnHand })
    .from(inventoryStock)
    .where(
      and(
        eq(inventoryStock.projectId, projectId),
        sql`${inventoryStock.materialId} = ANY(${materialIds})`,
      ),
    );

  const stockMap = new Map(stockRows.map((s) => [s.materialId, Number(s.quantityOnHand)]));

  // ── 3. Compute net quantities (BOM required - stock on hand) ──────────────
  const requisitionItems = bomItems
    .map((item) => {
      const required = Number(item.quantityPerUnit);
      const inStock  = stockMap.get(item.materialId) ?? 0;
      const toOrder  = Math.max(0, required - inStock);
      return { ...item, required, inStock, toOrder };
    })
    .filter((item) => item.toOrder > 0);  // skip fully-stocked items

  if (requisitionItems.length === 0) {
    return { success: false, error: "All materials are sufficiently stocked. No PR needed." };
  }

  // ── 4. Create the PR (Planning-owned; Procurement read-only) ──────────────
  const [pr] = await db
    .insert(purchaseRequisitions)
    .values({
      projectId,
      unitId,
      taskAssignmentId: taskAssignmentId ?? null,
      status: "DRAFT",
      requestedBy,
    })
    .returning({ id: purchaseRequisitions.id });

  // ── 5. Insert line items with locked price + quantity ─────────────────────
  await db.insert(purchaseRequisitionItems).values(
    requisitionItems.map((item) => ({
      prId:             pr.id,
      materialId:       item.materialId,
      quantityRequired: String(item.required),
      quantityInStock:  String(item.inStock),
      quantityToOrder:  String(item.toOrder),
      unitPrice:        item.adminPrice,   // Admin-fixed; cannot be changed
    })),
  );

  const totalAmount = requisitionItems.reduce(
    (sum, item) => sum + item.toOrder * Number(item.adminPrice),
    0,
  );

  revalidatePath(`/projects/${projectId}/procurement`);
  return {
    success: true,
    prId: pr.id,
    itemCount: requisitionItems.length,
    totalAmount: totalAmount.toFixed(2),
  };
}

// ─── Promote approved PR → Draft PO ──────────────────────────────────────────
const CreatePoFromPrSchema = z.object({
  prId:       z.string().uuid(),
  supplierId: z.string().uuid(),
  createdBy:  z.string().uuid(),
  isPrepaid:  z.boolean().default(false),
});

export type CreatePoResult =
  | { success: true; poId: string }
  | { success: false; error: string };

/**
 * Auto-populates a Draft PO from an approved PR.
 * Procurement can only choose the supplier — price and quantity are locked.
 */
export async function createPoFromApprovedPr(
  input: z.infer<typeof CreatePoFromPrSchema>,
): Promise<CreatePoResult> {
  const parsed = CreatePoFromPrSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const { prId, supplierId, createdBy, isPrepaid } = parsed.data;

  // ── Verify PR is approved ─────────────────────────────────────────────────
  const [pr] = await db
    .select({ status: purchaseRequisitions.status, projectId: purchaseRequisitions.projectId })
    .from(purchaseRequisitions)
    .where(eq(purchaseRequisitions.id, prId))
    .limit(1);

  if (!pr) return { success: false, error: "PR not found." };
  if (pr.status !== "APPROVED") {
    return { success: false, error: `PR must be in APPROVED status to create a PO. Current: '${pr.status}'.` };
  }

  // ── Fetch PR line items ───────────────────────────────────────────────────
  const prItems = await db
    .select()
    .from(purchaseRequisitionItems)
    .where(eq(purchaseRequisitionItems.prId, prId));

  if (prItems.length === 0) return { success: false, error: "PR has no line items." };

  const totalAmount = prItems.reduce(
    (sum, item) => sum + Number(item.quantityToOrder) * Number(item.unitPrice),
    0,
  );

  // ── Create the PO ─────────────────────────────────────────────────────────
  const [po] = await db
    .insert(purchaseOrders)
    .values({
      prId,
      projectId: pr.projectId!,
      supplierId,
      status: isPrepaid ? "PREPAID_REQUIRED" : "DRAFT",
      isPrepaid,
      totalAmount: String(totalAmount),
      createdBy,
    })
    .returning({ id: purchaseOrders.id });

  // ── Copy line items — price and qty are locked from the PR ────────────────
  await db.insert(purchaseOrderItems).values(
    prItems.map((item) => ({
      poId:       po.id,
      materialId: item.materialId,
      quantity:   item.quantityToOrder,   // Planning-fixed
      unitPrice:  item.unitPrice,          // Admin-fixed
      totalPrice: String(Number(item.quantityToOrder) * Number(item.unitPrice)),
    })),
  );

  // ── Mark PR as converted ──────────────────────────────────────────────────
  await db
    .update(purchaseRequisitions)
    .set({ status: "APPROVED" })   // stays APPROVED; PO status tracks from here
    .where(eq(purchaseRequisitions.id, prId));

  revalidatePath(`/projects/${pr.projectId}/procurement`);
  return { success: true, poId: po.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PO PRICE CHANGE REQUEST
// Procurement requests a one-time price deviation; manager approves/rejects.
// On approval the PO item unit_price is updated to the requested price.
// ═══════════════════════════════════════════════════════════════════════════════

const RequestPriceChangeSchema = z.object({
  poId:           z.string().uuid(),
  poItemId:       z.string().uuid().optional(),
  originalPrice:  z.number().positive(),
  requestedPrice: z.number().positive(),
  reason:         z.string().min(10),
  requestedBy:    z.string().uuid(),
});

export type RequestPriceChangeResult =
  | { success: true; requestId: string }
  | { success: false; error: string };

export async function requestPriceChange(
  input: z.infer<typeof RequestPriceChangeSchema>,
): Promise<RequestPriceChangeResult> {
  const parsed = RequestPriceChangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const [po] = await db
    .select({ status: purchaseOrders.status })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, d.poId))
    .limit(1);

  if (!po) return { success: false, error: "PO not found." };
  if (!["DRAFT", "AUDIT_REVIEW"].includes(po.status)) {
    return { success: false, error: "Price changes can only be requested on DRAFT or AUDIT_REVIEW POs." };
  }

  const [req] = await db
    .insert(poPriceChangeRequests)
    .values({
      poId:           d.poId,
      poItemId:       d.poItemId ?? null,
      originalPrice:  String(d.originalPrice),
      requestedPrice: String(d.requestedPrice),
      reason:         d.reason,
      requestedBy:    d.requestedBy,
    })
    .returning({ id: poPriceChangeRequests.id });

  revalidatePath("/procurement");
  return { success: true, requestId: req.id };
}

const ApprovePriceChangeSchema = z.object({
  requestId:  z.string().uuid(),
  approvedBy: z.string().uuid(),
  approve:    z.boolean(),
  rejectionReason: z.string().optional(),
});

export type ApprovePriceChangeResult =
  | { success: true }
  | { success: false; error: string };

export async function approvePriceChange(
  input: z.infer<typeof ApprovePriceChangeSchema>,
): Promise<ApprovePriceChangeResult> {
  const parsed = ApprovePriceChangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };
  const d = parsed.data;

  const [req] = await db
    .select()
    .from(poPriceChangeRequests)
    .where(eq(poPriceChangeRequests.id, d.requestId))
    .limit(1);

  if (!req) return { success: false, error: "Request not found." };
  if (req.status !== "PENDING") return { success: false, error: "Request is no longer pending." };

  if (d.approve) {
    await db
      .update(poPriceChangeRequests)
      .set({ status: "APPROVED", approvedBy: d.approvedBy, approvedAt: new Date() })
      .where(eq(poPriceChangeRequests.id, d.requestId));

    // Apply the new price to the PO item if a specific item was targeted
    if (req.poItemId) {
      await db
        .update(purchaseOrderItems)
        .set({ unitPrice: req.requestedPrice })
        .where(eq(purchaseOrderItems.id, req.poItemId));
    }
  } else {
    await db
      .update(poPriceChangeRequests)
      .set({
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: d.rejectionReason ?? null,
      })
      .where(eq(poPriceChangeRequests.id, d.requestId));
  }

  revalidatePath("/procurement");
  return { success: true };
}
