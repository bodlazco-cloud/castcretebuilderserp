import { pgEnum } from "drizzle-orm/pg-core";

export const deptCodeEnum = pgEnum("dept_code", [
  "PLANNING", "AUDIT", "CONSTRUCTION", "PROCUREMENT",
  "BATCHING", "MOTORPOOL", "FINANCE", "HR", "ADMIN", "BOD",
]);

export const costCenterTypeEnum = pgEnum("cost_center_type", [
  "PROJECT", "BATCHING", "FLEET", "HQ",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "DRAFT", "PENDING_REVIEW", "PENDING_AUDIT",
  "READY_FOR_APPROVAL", "APPROVED", "REJECTED", "CANCELLED",
]);

export const workCategoryEnum = pgEnum("work_category", [
  "STRUCTURAL", "ARCHITECTURAL", "TURNOVER",
]);

export const tradeTypeEnum = pgEnum("trade_type", [
  "STRUCTURAL", "ARCHITECTURAL", "BOTH",
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "MATERIAL", "EMPLOYEE", "MACHINE",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "INFLOW", "OUTFLOW", "INTERNAL_TRANSFER",
]);

export const inventorySourceEnum = pgEnum("inventory_source", [
  "SUPPLIER", "DEVELOPER_OSM",
]);

export const poStatusEnum = pgEnum("po_status", [
  "DRAFT", "AUDIT_REVIEW", "BOD_APPROVED", "PREPAID_REQUIRED",
  "AWAITING_DELIVERY", "PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED",
]);

export const performanceGradeEnum = pgEnum("performance_grade", ["A", "B", "C"]);

export const fixOrFlipEnum = pgEnum("fix_or_flip", ["FIX", "FLIP", "MONITOR"]);

export const delayReasonEnum = pgEnum("delay_reason", [
  "WEATHER", "MATERIAL_DELAY", "MANPOWER_SHORTAGE",
  "EQUIPMENT_BREAKDOWN", "DESIGN_CHANGE", "OTHER",
]);

export const milestoneDocTypeEnum = pgEnum("milestone_doc_type", [
  "WAR_SIGNED", "MILESTONE_PHOTOS", "MATERIAL_TRANSFER_SLIPS",
  "OSM_ACKNOWLEDGMENT", "SUBCON_BILLING_INVOICE", "QUALITY_CLEARANCE",
]);

export const unitTypeEnum = pgEnum("unit_type", ["BEG", "MID", "END", "SHOP"]);

export const changeOrderTypeEnum = pgEnum("change_order_type", ["ADD", "MODIFY", "REMOVE"]);

export const payrollStatusEnum = pgEnum("payroll_status", ["DRAFT", "PROCESSING", "APPROVED", "RELEASED", "REJECTED"]);

export const bankTransactionTypeEnum = pgEnum("bank_transaction_type", ["DEBIT", "CREDIT"]);

export const punchListStatusEnum = pgEnum("punch_list_status", ["OPEN", "IN_PROGRESS", "CLOSED"]);

// NTP lifecycle: DRAFT → PENDING_REVIEW (Planning) → ACTIVE (triggers resource forecast + auto-PR) → COMPLETED
export const ntpStatusEnum = pgEnum("ntp_status", [
  "DRAFT", "PENDING_REVIEW", "BOD_APPROVED", "ACTIVE", "COMPLETED",
]);

// Resource forecast lifecycle driven by the Chain of Necessity
export const resourceForecastStatusEnum = pgEnum("resource_forecast_status", [
  "PENDING_PR", "PR_CREATED", "PO_ISSUED", "ISSUED",
]);

// Explicit payment flow for Finance module (DRAFT → PREPARED → RELEASED)
export const paymentFlowStatusEnum = pgEnum("payment_flow_status", [
  "DRAFT", "PREPARED", "RELEASED",
]);

// Full audit trail for all stock movements
export const materialMovementTypeEnum = pgEnum("material_movement_type", [
  "RECEIPT", "ISSUANCE", "TRANSFER", "ADJUSTMENT",
]);
