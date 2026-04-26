import {
  pgTable, uuid, varchar, numeric, integer, boolean,
  timestamp, date, text, jsonb,
} from "drizzle-orm/pg-core";
import { users, departments } from "./core";
import { projects } from "./projects";
import { projectUnits, unitMilestones, unitActivities } from "./units";
import { subcontractors } from "./subcontractors";
import { workCategoryEnum, tradeTypeEnum, delayReasonEnum, milestoneDocTypeEnum, approvalStatusEnum } from "./enums";

export const taskAssignments = pgTable("task_assignments", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  projectId:            uuid("project_id").notNull().references(() => projects.id),
  unitId:               uuid("unit_id").notNull().references(() => projectUnits.id),
  subconId:             uuid("subcon_id").notNull().references(() => subcontractors.id),
  category:             workCategoryEnum("category").notNull(),
  workType:             tradeTypeEnum("work_type").notNull(),
  startDate:            date("start_date").notNull(),
  endDate:              date("end_date").notNull(),
  status:               varchar("status", { length: 30 }).notNull().default("DRAFT"),
  capacityCheckPassed:  boolean("capacity_check_passed").notNull().default(false),
  capacityCheckedAt:    timestamp("capacity_checked_at", { withTimezone: true }),
  capacityCheckedBy:    uuid("capacity_checked_by").references(() => users.id),
  issuedBy:             uuid("issued_by").notNull().references(() => users.id),
  issuedAt:             timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyProgressEntries = pgTable("daily_progress_entries", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  projectId:          uuid("project_id").notNull().references(() => projects.id),
  unitId:             uuid("unit_id").notNull().references(() => projectUnits.id),
  taskAssignmentId:   uuid("task_assignment_id").notNull().references(() => taskAssignments.id),
  unitActivityId:     uuid("unit_activity_id").notNull().references(() => unitActivities.id),
  entryDate:          date("entry_date").notNull(),
  status:             varchar("status", { length: 20 }).notNull().default("STARTED"),
  subconId:           uuid("subcon_id").notNull().references(() => subcontractors.id),
  actualManpower:     integer("actual_manpower").notNull().default(0),
  manpowerBreakdown:  jsonb("manpower_breakdown"),
  delayType:          delayReasonEnum("delay_type"),
  issuesDetails:      text("issues_details"),
  docGapFlagged:      boolean("doc_gap_flagged").notNull().default(false),
  fileAttachments:    jsonb("file_attachments"),  // [{url, type, uploaded_at}]
  enteredBy:          uuid("entered_by").notNull().references(() => users.id),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workAccomplishedReports = pgTable("work_accomplished_reports", {
  id:                       uuid("id").primaryKey().defaultRandom(),
  projectId:                uuid("project_id").notNull().references(() => projects.id),
  unitId:                   uuid("unit_id").notNull().references(() => projectUnits.id),
  unitMilestoneId:          uuid("unit_milestone_id").notNull().references(() => unitMilestones.id),
  taskAssignmentId:         uuid("task_assignment_id").notNull().references(() => taskAssignments.id),
  grossAccomplishment:      numeric("gross_accomplishment", { precision: 15, scale: 2 }).notNull(),
  status:                   approvalStatusEnum("status").notNull().default("DRAFT"),
  rejectionReason:          text("rejection_reason"),
  submittedBy:              uuid("submitted_by").notNull().references(() => users.id),
  submittedAt:              timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  accountingVerifiedBy:     uuid("accounting_verified_by").references(() => users.id),
  accountingVerifiedAt:     timestamp("accounting_verified_at", { withTimezone: true }),
  auditVerifiedBy:          uuid("audit_verified_by").references(() => users.id),
  auditVerifiedAt:          timestamp("audit_verified_at", { withTimezone: true }),
  bodApprovedBy:            uuid("bod_approved_by").references(() => users.id),
  bodApprovedAt:            timestamp("bod_approved_at", { withTimezone: true }),
  createdAt:                timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const milestoneDocuments = pgTable("milestone_documents", {
  id:          uuid("id").primaryKey().defaultRandom(),
  warId:       uuid("war_id").notNull().references(() => workAccomplishedReports.id),
  docType:     milestoneDocTypeEnum("doc_type").notNull(),
  sourceDept:  departments.code,               // stored as dept_code enum value
  fileUrl:     text("file_url").notNull(),
  uploadedBy:  uuid("uploaded_by").notNull().references(() => users.id),
  uploadedAt:  timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  isVerified:  boolean("is_verified").notNull().default(false),
  verifiedBy:  uuid("verified_by").references(() => users.id),
  verifiedAt:  timestamp("verified_at", { withTimezone: true }),
  notes:       text("notes"),
});
