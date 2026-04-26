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
