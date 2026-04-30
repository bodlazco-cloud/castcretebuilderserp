import {
  pgTable, uuid, varchar, numeric, boolean,
  timestamp, date, text,
} from "drizzle-orm/pg-core";
import { users, costCenters } from "./core";
import { bankTransactionTypeEnum } from "./enums";

export const bankAccounts = pgTable("bank_accounts", {
  id:              uuid("id").primaryKey().defaultRandom(),
  bankName:        varchar("bank_name", { length: 100 }).notNull(),
  accountName:     varchar("account_name", { length: 150 }).notNull(),
  accountNumber:   varchar("account_number", { length: 50 }).notNull().unique(),
  accountType:     varchar("account_type", { length: 30 }).notNull(),
  currency:        varchar("currency", { length: 10 }).notNull().default("PHP"),
  openingBalance:  numeric("opening_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  currentBalance:  numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankTransactions = pgTable("bank_transactions", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  bankAccountId:      uuid("bank_account_id").notNull().references(() => bankAccounts.id),
  transactionDate:    date("transaction_date").notNull(),
  transactionType:    bankTransactionTypeEnum("transaction_type").notNull(),
  amount:             numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description:        text("description").notNull(),
  referenceNumber:    varchar("reference_number", { length: 100 }),
  costCenterId:       uuid("cost_center_id").references(() => costCenters.id),
  sourceDocumentUrl:  text("source_document_url"),
  requiresDualAuth:   boolean("requires_dual_auth").notNull().default(false),
  status:             varchar("status", { length: 20 }).notNull().default("PENDING"),
  enteredBy:          uuid("entered_by").notNull().references(() => users.id),
  firstApprovalBy:    uuid("first_approval_by").references(() => users.id),
  firstApprovalAt:    timestamp("first_approval_at", { withTimezone: true }),
  secondApprovalBy:   uuid("second_approval_by").references(() => users.id),
  secondApprovalAt:   timestamp("second_approval_at", { withTimezone: true }),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankReconciliations = pgTable("bank_reconciliations", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  bankAccountId:       uuid("bank_account_id").notNull().references(() => bankAccounts.id),
  reconciliationDate:  date("reconciliation_date").notNull(),
  statementBalance:    numeric("statement_balance", { precision: 15, scale: 2 }).notNull(),
  bookBalance:         numeric("book_balance", { precision: 15, scale: 2 }).notNull(),
  variance:            numeric("variance", { precision: 15, scale: 2 }).notNull(),
  isReconciled:        boolean("is_reconciled").notNull().default(false),
  notes:               text("notes"),
  reconciledBy:        uuid("reconciled_by").references(() => users.id),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const requestsForPayment = pgTable("requests_for_payment", {
  id:               uuid("id").primaryKey().defaultRandom(),
  bankAccountId:    uuid("bank_account_id").references(() => bankAccounts.id),
  amount:           numeric("amount", { precision: 15, scale: 2 }).notNull(),
  payeeName:        varchar("payee_name", { length: 150 }).notNull(),
  purpose:          text("purpose").notNull(),
  sourceDocumentUrl: text("source_document_url").notNull(),
  costCenterId:     uuid("cost_center_id").references(() => costCenters.id),
  status:           varchar("status", { length: 20 }).notNull().default("PENDING"),
  submittedBy:      uuid("submitted_by").notNull().references(() => users.id),
  firstApprovalBy:  uuid("first_approval_by").references(() => users.id),
  firstApprovalAt:  timestamp("first_approval_at", { withTimezone: true }),
  finalApprovalBy:  uuid("final_approval_by").references(() => users.id),
  finalApprovalAt:  timestamp("final_approval_at", { withTimezone: true }),
  rejectionReason:  text("rejection_reason"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
