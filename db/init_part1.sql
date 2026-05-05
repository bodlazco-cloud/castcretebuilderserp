-- ════════════════════════════════════════════════════════════════
-- Castcrete Builders ERP — Full Schema Init (Idempotent)
-- Generated from Drizzle TypeScript schema (source of truth)
-- Safe to re-run: all types and tables use IF NOT EXISTS guards
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$ BEGIN
  CREATE TYPE "public"."approval_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'PENDING_AUDIT', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."bank_transaction_type" AS ENUM('DEBIT', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."change_order_type" AS ENUM('ADD', 'MODIFY', 'REMOVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."cost_center_type" AS ENUM('PROJECT', 'BATCHING', 'FLEET', 'HQ');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."delay_reason" AS ENUM('WEATHER', 'MATERIAL_DELAY', 'MANPOWER_SHORTAGE', 'EQUIPMENT_BREAKDOWN', 'DESIGN_CHANGE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."dept_code" AS ENUM('PLANNING', 'AUDIT', 'CONSTRUCTION', 'PROCUREMENT', 'BATCHING', 'MOTORPOOL', 'FINANCE', 'HR', 'ADMIN', 'BOD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."fix_or_flip" AS ENUM('FIX', 'FLIP', 'MONITOR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."inventory_source" AS ENUM('SUPPLIER', 'DEVELOPER_OSM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."material_movement_type" AS ENUM('RECEIPT', 'ISSUANCE', 'TRANSFER', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."milestone_doc_type" AS ENUM('WAR_SIGNED', 'MILESTONE_PHOTOS', 'MATERIAL_TRANSFER_SLIPS', 'OSM_ACKNOWLEDGMENT', 'SUBCON_BILLING_INVOICE', 'QUALITY_CLEARANCE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ntp_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'BOD_APPROVED', 'ACTIVE', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."payment_flow_status" AS ENUM('DRAFT', 'PREPARED', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."payroll_status" AS ENUM('DRAFT', 'PROCESSING', 'APPROVED', 'RELEASED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."performance_grade" AS ENUM('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."po_status" AS ENUM('DRAFT', 'AUDIT_REVIEW', 'BOD_APPROVED', 'PREPAID_REQUIRED', 'AWAITING_DELIVERY', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."punch_list_status" AS ENUM('OPEN', 'IN_PROGRESS', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."resource_forecast_status" AS ENUM('PENDING_PR', 'PR_CREATED', 'PO_ISSUED', 'ISSUED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."resource_type" AS ENUM('MATERIAL', 'EMPLOYEE', 'MACHINE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."trade_type" AS ENUM('STRUCTURAL', 'ARCHITECTURAL', 'BOTH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."transaction_type" AS ENUM('INFLOW', 'OUTFLOW', 'INTERNAL_TRANSFER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."unit_type" AS ENUM('BEG', 'REG', 'END');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."work_category" AS ENUM('STRUCTURAL', 'ARCHITECTURAL', 'TURNOVER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "admin_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" jsonb NOT NULL,
	"version" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"dept_id" uuid NOT NULL,
	"type" "cost_center_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cost_centers_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "dept_code" NOT NULL,
	"name" varchar(100) NOT NULL,
	"head_employee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(200) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"dept_id" uuid,
	"role" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
CREATE TABLE IF NOT EXISTS "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"block_name" varchar(50) NOT NULL,
	"total_lots" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "developers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"contact_info" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"developer_id" uuid NOT NULL,
	"contract_value" numeric(15, 2) NOT NULL,
	"developer_advance" numeric(15, 2) DEFAULT '63750000.00' NOT NULL,
	"advance_recovered" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"target_units_per_month" integer DEFAULT 120 NOT NULL,
	"min_operating_cash_buffer" numeric(15, 2) DEFAULT '5000000.00' NOT NULL,
	"status" varchar(30) DEFAULT 'BIDDING' NOT NULL,
	"ntp_document_url" text,
	"ntp_uploaded_at" timestamp with time zone,
	"ntp_uploaded_by" uuid,
	"bod_approved_at" timestamp with time zone,
	"bod_approved_by" uuid,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "activity_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "work_category" NOT NULL,
	"scope_code" varchar(100) NOT NULL,
	"scope_name" varchar(150) NOT NULL,
	"activity_code" varchar(100) NOT NULL,
	"activity_name" varchar(150) NOT NULL,
	"standard_duration_days" integer NOT NULL,
	"weight_in_scope_pct" numeric(5, 2) NOT NULL,
	"sequence_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "bom_standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_def_id" uuid NOT NULL,
	"unit_model" varchar(50) NOT NULL,
	"unit_type" "unit_type" NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity_per_unit" numeric(15, 4) NOT NULL,
	"base_rate_php" numeric(15, 2),
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "developer_rate_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"activity_def_id" uuid NOT NULL,
	"gross_rate_per_unit" numeric(15, 2) NOT NULL,
	"retention_pct" numeric(5, 4) DEFAULT '0.10' NOT NULL,
	"dp_recoupment_pct" numeric(5, 4) DEFAULT '0.10' NOT NULL,
	"tax_pct" numeric(5, 4) DEFAULT '0.00' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "material_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"old_price" numeric(15, 2) NOT NULL,
	"new_price" numeric(15, 2) NOT NULL,
	"version" integer NOT NULL,
	"changed_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"effective_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "material_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_suppliers_material_id_supplier_id_unique" UNIQUE("material_id","supplier_id")
);
CREATE TABLE IF NOT EXISTS "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"unit" varchar(30) NOT NULL,
	"category" varchar(50) NOT NULL,
	"admin_price" numeric(15, 2) NOT NULL,
	"price_version" integer DEFAULT 1 NOT NULL,
	"preferred_supplier_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "milestone_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" "work_category" NOT NULL,
	"sequence_order" integer NOT NULL,
	"triggers_billing" boolean DEFAULT false NOT NULL,
	"weight_pct" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "project_activity_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"activity_def_id" uuid NOT NULL,
	"completion_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_project_activity_progress" UNIQUE("project_id","activity_def_id")
);
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"contact_info" uuid,
	"preferred_materials" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "subcontractor_advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcon_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"advance_amount" numeric(15, 2) NOT NULL,
	"recoupment_pct" numeric(5, 4) NOT NULL,
	"amount_recovered" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"is_fully_recovered" boolean DEFAULT false NOT NULL,
	"issued_date" date NOT NULL,
	"issued_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "subcontractor_capacity_matrix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcon_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_model" varchar(50),
	"work_type" "trade_type" NOT NULL,
	"rated_capacity" integer NOT NULL,
	"capacity_weight" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "subcontractor_performance_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcon_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"schedule_variance_score" numeric(5, 2) NOT NULL,
	"material_variance_score" numeric(5, 2) NOT NULL,
	"quality_rework_score" numeric(5, 2) NOT NULL,
	"safety_compliance_score" numeric(5, 2) NOT NULL,
	"weighted_total" numeric(5, 2),
	"grade" "performance_grade" NOT NULL,
	"computed_by" uuid,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "subcontractor_rate_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcon_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"activity_def_id" uuid NOT NULL,
	"rate_per_unit" numeric(15, 2) NOT NULL,
	"retention_pct" numeric(5, 4) DEFAULT '0.10' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "subcontractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"contact_info" jsonb,
	"trade_types" "trade_type"[] NOT NULL,
	"default_max_active_units" integer NOT NULL,
	"manpower_benchmark" numeric(5, 2) NOT NULL,
	"performance_grade" "performance_grade" DEFAULT 'A' NOT NULL,
	"performance_score" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"stop_assignment" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subcontractors_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "eot_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_assignment_id" uuid,
	"unit_activity_id" uuid NOT NULL,
	"reason" "delay_reason" NOT NULL,
	"reason_detail" text,
	"original_end_date" date NOT NULL,
	"requested_end_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "project_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"lot_number" varchar(20) NOT NULL,
	"unit_code" varchar(50) NOT NULL,
	"unit_model" varchar(50) NOT NULL,
	"contract_price" numeric(15, 2),
	"current_category" "work_category" DEFAULT 'STRUCTURAL' NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"turned_over_at" timestamp with time zone,
	"turnover_cost" numeric(15, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_units_unit_code_unique" UNIQUE("unit_code")
);
CREATE TABLE IF NOT EXISTS "unit_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"task_assignment_id" uuid,
	"activity_def_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"planned_start" date,
	"planned_end" date,
	"actual_start" date,
	"actual_end" date,
	"schedule_variance_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "unit_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"milestone_def_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "unit_turnovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"turnover_date" date NOT NULL,
	"cip_cost" numeric(15, 2) NOT NULL,
	"contract_price" numeric(15, 2) NOT NULL,
	"unit_code" varchar(50) NOT NULL,
	"notes" text,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "inventory_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"mrr_id" uuid NOT NULL,
	"source_type" "inventory_source" NOT NULL,
	"quantity_received" numeric(15, 4) NOT NULL,
	"quantity_remaining" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"shadow_price" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_ledger_batch_id_unique" UNIQUE("batch_id")
);
CREATE TABLE IF NOT EXISTS "inventory_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"quantity_on_hand" numeric(15, 4) DEFAULT '0' NOT NULL,
	"quantity_reserved" numeric(15, 4) DEFAULT '0' NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "material_movement_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movement_type" "material_movement_type" NOT NULL,
	"reference_type" varchar(30) NOT NULL,
	"reference_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2),
	"notes" text,
	"photo_evidence_url" text,
	"performed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "material_receiving_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid,
	"project_id" uuid NOT NULL,
	"source_type" "inventory_source" NOT NULL,
	"supplier_id" uuid,
	"received_date" date NOT NULL,
	"received_by" uuid NOT NULL,
	"photo_evidence_url" text,
	"notes" text,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "material_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"is_osm" boolean DEFAULT false NOT NULL,
	"shadow_price" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"signed_by_user" uuid,
	"transfer_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "mrr_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mrr_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity_received" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"shadow_price" numeric(15, 2) DEFAULT '0.00' NOT NULL
);
CREATE TABLE IF NOT EXISTS "osm_deduction_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"total_osm_value" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"amount_applied" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"amount_pending" numeric(15, 2),
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "po_price_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"po_item_id" uuid,
	"original_price" numeric(15, 2) NOT NULL,
	"requested_price" numeric(15, 2) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"total_price" numeric(15, 2) NOT NULL
);
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" "po_status" DEFAULT 'DRAFT' NOT NULL,
	"is_prepaid" boolean DEFAULT false NOT NULL,
	"is_osm" boolean DEFAULT false NOT NULL,
	"proforma_invoice_url" text,
	"total_amount" numeric(15, 2) NOT NULL,
	"requires_dual_auth" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_status" varchar(20) DEFAULT 'PENDING_REVIEW' NOT NULL,
	"audit_reviewed_by" uuid,
	"audit_reviewed_at" timestamp with time zone,
	"bod_approved_by" uuid,
	"bod_approved_at" timestamp with time zone,
	"delivered_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "purchase_requisition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity_required" numeric(15, 4) NOT NULL,
	"quantity_in_stock" numeric(15, 4) DEFAULT '0' NOT NULL,
	"quantity_to_order" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL
);
CREATE TABLE IF NOT EXISTS "purchase_requisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid,
	"task_assignment_id" uuid,
	"activity_def_id" uuid,
	"status" "approval_status" DEFAULT 'DRAFT' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "daily_progress_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"task_assignment_id" uuid NOT NULL,
	"unit_activity_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'STARTED' NOT NULL,
	"subcon_id" uuid NOT NULL,
	"actual_manpower" integer DEFAULT 0 NOT NULL,
	"manpower_breakdown" jsonb,
	"delay_type" "delay_reason",
	"issues_details" text,
	"doc_gap_flagged" boolean DEFAULT false NOT NULL,
	"file_attachments" jsonb,
	"entered_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "milestone_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"war_id" uuid NOT NULL,
	"doc_type" "milestone_doc_type" NOT NULL,
	"source_dept" "dept_code" NOT NULL,
	"file_url" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"notes" text
);
CREATE TABLE IF NOT EXISTS "task_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"subcon_id" uuid NOT NULL,
	"category" "work_category" NOT NULL,
	"work_type" "trade_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "ntp_status" DEFAULT 'DRAFT' NOT NULL,
	"capacity_check_passed" boolean DEFAULT false NOT NULL,
	"capacity_checked_at" timestamp with time zone,
	"capacity_checked_by" uuid,
	"issued_by" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "work_accomplished_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"unit_milestone_id" uuid NOT NULL,
	"task_assignment_id" uuid NOT NULL,
	"gross_accomplishment" numeric(15, 2) NOT NULL,
	"status" "approval_status" DEFAULT 'DRAFT' NOT NULL,
	"rejection_reason" text,
	"audit_remarks" text,
	"submitted_by" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accounting_verified_by" uuid,
	"accounting_verified_at" timestamp with time zone,
	"audit_verified_by" uuid,
	"audit_verified_at" timestamp with time zone,
	"bod_approved_by" uuid,
	"bod_approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "resource_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ntp_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"bom_standard_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"forecast_qty" numeric(15, 4) NOT NULL,
	"actual_issued_qty" numeric(15, 4) DEFAULT '0' NOT NULL,
	"status" "resource_forecast_status" DEFAULT 'PENDING_PR' NOT NULL,
	"pr_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qty_variance_check" CHECK ("resource_forecasts"."actual_issued_qty" <= "resource_forecasts"."forecast_qty" * 1.10)
);
CREATE TABLE IF NOT EXISTS "batching_internal_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_receipt_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"volume_m3" numeric(10, 4) NOT NULL,
	"internal_rate_per_m3" numeric(15, 2) NOT NULL,
	"total_internal_revenue" numeric(15, 2),
	"transaction_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "batching_production_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"mix_design_id" uuid NOT NULL,
	"batch_date" date NOT NULL,
	"shift" varchar(5) NOT NULL,
	"cement_used_bags" numeric(10, 4) NOT NULL,
	"sand_used_kg" numeric(10, 4) NOT NULL,
	"gravel_used_kg" numeric(10, 4) NOT NULL,
	"volume_produced_m3" numeric(10, 4) NOT NULL,
	"theoretical_yield_m3" numeric(10, 4) NOT NULL,
	"yield_variance_pct" numeric(7, 4),
	"is_production_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"operator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "concrete_delivery_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"production_log_id" uuid,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"mix_design_id" uuid,
	"truck_id" uuid,
	"volume_dispatched_m3" numeric(10, 4) NOT NULL,
	"dispatched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_by" uuid NOT NULL
);
CREATE TABLE IF NOT EXISTS "concrete_delivery_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_note_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"volume_received_m3" numeric(10, 4) NOT NULL,
	"volume_variance_m3" numeric(10, 4),
	"is_delivery_flagged" boolean DEFAULT false NOT NULL,
	"received_by" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concrete_delivery_receipts_delivery_note_id_unique" UNIQUE("delivery_note_id")
);
CREATE TABLE IF NOT EXISTS "mix_designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"cement_bags_per_m3" numeric(8, 4) NOT NULL,
	"sand_kg_per_m3" numeric(10, 4) NOT NULL,
	"gravel_kg_per_m3" numeric(10, 4) NOT NULL,
	"water_liters_per_m3" numeric(8, 4) NOT NULL,
	"internal_rate_per_m3" numeric(15, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mix_designs_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" varchar(50) NOT NULL,
	"make" varchar(100),
	"model" varchar(100),
	"year" integer,
	"purchase_value" numeric(15, 2),
	"daily_rental_rate" numeric(15, 2) NOT NULL,
	"internal_hourly_rate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"fuel_standard_liters_per_hour" numeric(8, 4) NOT NULL,
	"total_engine_hours" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'AVAILABLE' NOT NULL,
	"is_flagged_for_flip" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "equipment_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid,
	"cost_center_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"assigned_date" date NOT NULL,
	"returned_date" date,
	"days_rented" integer,
	"daily_rate" numeric(15, 2) NOT NULL,
	"total_rental_income" numeric(15, 2),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "equipment_daily_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"check_date" date NOT NULL,
	"oil_ok" boolean NOT NULL,
	"fuel_ok" boolean NOT NULL,
	"hydraulics_ok" boolean NOT NULL,
	"other_checks" jsonb,
	"all_passed" boolean NOT NULL,
	"equipment_locked" boolean DEFAULT false NOT NULL,
	"operator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
