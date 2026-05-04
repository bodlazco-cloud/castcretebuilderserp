import {
  pgTable, uuid, varchar, numeric, boolean, integer,
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

export const corporateLoans = pgTable("corporate_loans", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  lenderName:            varchar("lender_name", { length: 150 }).notNull(),
  loanType:              varchar("loan_type", { length: 100 }),          // e.g., Equipment Loan, Working Capital
  principalAmount:       numeric("principal_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate:          numeric("interest_rate", { precision: 5, scale: 2 }).notNull(),
  tenorMonths:           integer("tenor_months").notNull(),
  startDate:             date("start_date").notNull(),
  maturityDate:          date("maturity_date").notNull(),                 // start_date + tenor_months; stored to avoid recalculation
  monthlyAmortization:   numeric("monthly_amortization", { precision: 15, scale: 2 }).notNull(),
  outstandingBalance:    numeric("outstanding_balance", { precision: 15, scale: 2 }).notNull(),
  disbursementAccountId: uuid("disbursement_account_id").references(() => bankAccounts.id),
  status:                varchar("status", { length: 20 }).notNull().default("ACTIVE"),  // ACTIVE, FULLY_PAID, RESTRUCTURED
  notes:                 text("notes"),
  createdBy:             uuid("created_by").notNull().references(() => users.id),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loanPayments = pgTable("loan_payments", {
  id:               uuid("id").primaryKey().defaultRandom(),
  loanId:           uuid("loan_id").notNull().references(() => corporateLoans.id),
  paymentDate:      date("payment_date").notNull(),
  principalPaid:    numeric("principal_paid", { precision: 15, scale: 2 }).notNull(),
  interestPaid:     numeric("interest_paid", { precision: 15, scale: 2 }).notNull(),
  totalPaid:        numeric("total_paid", { precision: 15, scale: 2 }).notNull(),  // principalPaid + interestPaid
  bankAccountId:    uuid("bank_account_id").references(() => bankAccounts.id),
  referenceNumber:  varchar("reference_number", { length: 100 }),
  status:           varchar("status", { length: 20 }).notNull().default("POSTED"),
  recordedBy:       uuid("recorded_by").notNull().references(() => users.id),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Bank Reconciliation ──────────────────────────────────────────────────────

export const bankStatementImports = pgTable("bank_statement_imports", {
  id:             uuid("id").primaryKey().defaultRandom(),
  bankAccountId:  uuid("bank_account_id").notNull().references(() => bankAccounts.id),
  bankFormat:     varchar("bank_format", { length: 20 }).notNull(),   // BDO | BPI | METROBANK | GENERIC
  fileName:       varchar("file_name", { length: 255 }),
  periodStart:    date("period_start").notNull(),
  periodEnd:      date("period_end").notNull(),
  openingBalance: numeric("opening_balance", { precision: 15, scale: 2 }).notNull(),
  closingBalance: numeric("closing_balance", { precision: 15, scale: 2 }).notNull(),
  lineCount:      integer("line_count").notNull(),
  status:         varchar("status", { length: 20 }).notNull().default("PENDING"),  // PENDING | FINALIZED
  importedBy:     uuid("imported_by").notNull().references(() => users.id),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankStatementLines = pgTable("bank_statement_lines", {
  id:              uuid("id").primaryKey().defaultRandom(),
  importId:        uuid("import_id").notNull().references(() => bankStatementImports.id),
  bankAccountId:   uuid("bank_account_id").notNull().references(() => bankAccounts.id),
  transactionDate: date("transaction_date").notNull(),
  valueDate:       date("value_date"),
  description:     text("description").notNull(),
  referenceNumber: varchar("reference_number", { length: 100 }),
  debitAmount:     numeric("debit_amount",  { precision: 15, scale: 2 }).notNull().default("0"),
  creditAmount:    numeric("credit_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  runningBalance:  numeric("running_balance", { precision: 15, scale: 2 }),
  isMatched:       boolean("is_matched").notNull().default(false),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankReconciliationItems = pgTable("bank_reconciliation_items", {
  id:                uuid("id").primaryKey().defaultRandom(),
  importId:          uuid("import_id").notNull().references(() => bankStatementImports.id),
  statementLineId:   uuid("statement_line_id").references(() => bankStatementLines.id),  // null = book-only
  erpTransactionId:  uuid("erp_transaction_id").references(() => bankTransactions.id),   // null = statement-only
  matchType:         varchar("match_type", { length: 20 }).notNull(),  // MATCHED | STATEMENT_ONLY | BOOK_ONLY
  statementAmount:   numeric("statement_amount", { precision: 15, scale: 2 }),
  erpAmount:         numeric("erp_amount",        { precision: 15, scale: 2 }),
  variance:          numeric("variance",          { precision: 15, scale: 2 }),
  matchedBy:         uuid("matched_by").references(() => users.id),
  matchedAt:         timestamp("matched_at", { withTimezone: true }),
  actionNote:        text("action_note"),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
