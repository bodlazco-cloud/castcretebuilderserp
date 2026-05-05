CREATE TYPE "public"."approval_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'PENDING_AUDIT', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."bank_transaction_type" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."change_order_type" AS ENUM('ADD', 'MODIFY', 'REMOVE');--> statement-breakpoint
CREATE TYPE "public"."cost_center_type" AS ENUM('PROJECT', 'BATCHING', 'FLEET', 'HQ');--> statement-breakpoint
CREATE TYPE "public"."delay_reason" AS ENUM('WEATHER', 'MATERIAL_DELAY', 'MANPOWER_SHORTAGE', 'EQUIPMENT_BREAKDOWN', 'DESIGN_CHANGE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."dept_code" AS ENUM('PLANNING', 'AUDIT', 'CONSTRUCTION', 'PROCUREMENT', 'BATCHING', 'MOTORPOOL', 'FINANCE', 'HR', 'ADMIN', 'BOD');--> statement-breakpoint
CREATE TYPE "public"."fix_or_flip" AS ENUM('FIX', 'FLIP', 'MONITOR');--> statement-breakpoint
CREATE TYPE "public"."inventory_source" AS ENUM('SUPPLIER', 'DEVELOPER_OSM');--> statement-breakpoint
CREATE TYPE "public"."material_movement_type" AS ENUM('RECEIPT', 'ISSUANCE', 'TRANSFER', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."milestone_doc_type" AS ENUM('WAR_SIGNED', 'MILESTONE_PHOTOS', 'MATERIAL_TRANSFER_SLIPS', 'OSM_ACKNOWLEDGMENT', 'SUBCON_BILLING_INVOICE', 'QUALITY_CLEARANCE');--> statement-breakpoint
CREATE TYPE "public"."ntp_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'BOD_APPROVED', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."payment_flow_status" AS ENUM('DRAFT', 'PREPARED', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."payroll_status" AS ENUM('DRAFT', 'PROCESSING', 'APPROVED', 'RELEASED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."performance_grade" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."po_status" AS ENUM('DRAFT', 'AUDIT_REVIEW', 'BOD_APPROVED', 'PREPAID_REQUIRED', 'AWAITING_DELIVERY', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."punch_list_status" AS ENUM('OPEN', 'IN_PROGRESS', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."resource_forecast_status" AS ENUM('PENDING_PR', 'PR_CREATED', 'PO_ISSUED', 'ISSUED');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('MATERIAL', 'EMPLOYEE', 'MACHINE');--> statement-breakpoint
CREATE TYPE "public"."trade_type" AS ENUM('STRUCTURAL', 'ARCHITECTURAL', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('INFLOW', 'OUTFLOW', 'INTERNAL_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('BEG', 'REG', 'END');--> statement-breakpoint
CREATE TYPE "public"."work_category" AS ENUM('STRUCTURAL', 'ARCHITECTURAL', 'TURNOVER');--> statement-breakpoint
CREATE TABLE "admin_settings" (
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
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"dept_id" uuid NOT NULL,
	"type" "cost_center_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cost_centers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "dept_code" NOT NULL,
	"name" varchar(100) NOT NULL,
	"head_employee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
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
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"block_name" varchar(50) NOT NULL,
	"total_lots" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "developers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"contact_info" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
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
--> statement-breakpoint
CREATE TABLE "activity_definitions" (
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
--> statement-breakpoint
CREATE TABLE "bom_standards" (
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
--> statement-breakpoint
CREATE TABLE "developer_rate_cards" (
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
--> statement-breakpoint
CREATE TABLE "material_price_history" (
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
--> statement-breakpoint
CREATE TABLE "material_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_suppliers_material_id_supplier_id_unique" UNIQUE("material_id","supplier_id")
);
--> statement-breakpoint
CREATE TABLE "materials" (
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
--> statement-breakpoint
CREATE TABLE "milestone_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" "work_category" NOT NULL,
	"sequence_order" integer NOT NULL,
	"triggers_billing" boolean DEFAULT false NOT NULL,
	"weight_pct" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_activity_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"activity_def_id" uuid NOT NULL,
	"completion_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_project_activity_progress" UNIQUE("project_id","activity_def_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"contact_info" uuid,
	"preferred_materials" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcontractor_advances" (
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
--> statement-breakpoint
CREATE TABLE "subcontractor_capacity_matrix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcon_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_model" varchar(50),
	"work_type" "trade_type" NOT NULL,
	"rated_capacity" integer NOT NULL,
	"capacity_weight" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcontractor_performance_ratings" (
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
--> statement-breakpoint
CREATE TABLE "subcontractor_rate_cards" (
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
--> statement-breakpoint
CREATE TABLE "subcontractors" (
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
--> statement-breakpoint
CREATE TABLE "eot_requests" (
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
--> statement-breakpoint
CREATE TABLE "project_units" (
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
--> statement-breakpoint
CREATE TABLE "unit_activities" (
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
--> statement-breakpoint
CREATE TABLE "unit_milestones" (
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
--> statement-breakpoint
CREATE TABLE "unit_turnovers" (
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
--> statement-breakpoint
CREATE TABLE "inventory_ledger" (
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
--> statement-breakpoint
CREATE TABLE "inventory_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"quantity_on_hand" numeric(15, 4) DEFAULT '0' NOT NULL,
	"quantity_reserved" numeric(15, 4) DEFAULT '0' NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_movement_logs" (
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
--> statement-breakpoint
CREATE TABLE "material_receiving_reports" (
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
--> statement-breakpoint
CREATE TABLE "material_transfers" (
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
--> statement-breakpoint
CREATE TABLE "mrr_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mrr_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity_received" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"shadow_price" numeric(15, 2) DEFAULT '0.00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "osm_deduction_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"total_osm_value" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"amount_applied" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"amount_pending" numeric(15, 2),
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_price_change_requests" (
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
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"total_price" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
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
--> statement-breakpoint
CREATE TABLE "purchase_requisition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity_required" numeric(15, 4) NOT NULL,
	"quantity_in_stock" numeric(15, 4) DEFAULT '0' NOT NULL,
	"quantity_to_order" numeric(15, 4) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requisitions" (
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
--> statement-breakpoint
CREATE TABLE "daily_progress_entries" (
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
--> statement-breakpoint
CREATE TABLE "milestone_documents" (
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
--> statement-breakpoint
CREATE TABLE "task_assignments" (
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
--> statement-breakpoint
CREATE TABLE "work_accomplished_reports" (
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
--> statement-breakpoint
CREATE TABLE "resource_forecasts" (
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
--> statement-breakpoint
CREATE TABLE "batching_internal_sales" (
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
--> statement-breakpoint
CREATE TABLE "batching_production_logs" (
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
--> statement-breakpoint
CREATE TABLE "concrete_delivery_notes" (
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
--> statement-breakpoint
CREATE TABLE "concrete_delivery_receipts" (
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
--> statement-breakpoint
CREATE TABLE "mix_designs" (
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
--> statement-breakpoint
CREATE TABLE "equipment" (
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
--> statement-breakpoint
CREATE TABLE "equipment_assignments" (
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
--> statement-breakpoint
CREATE TABLE "equipment_daily_checklists" (
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
--> statement-breakpoint
CREATE TABLE "fix_or_flip_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"assessment_date" date NOT NULL,
	"cumulative_maintenance_cost_12mo" numeric(15, 2) NOT NULL,
	"annual_rental_income" numeric(15, 2) NOT NULL,
	"efficiency_ratio" numeric(8, 4) NOT NULL,
	"total_engine_hours" numeric(10, 2) NOT NULL,
	"monthly_downtime_days" integer NOT NULL,
	"fuel_efficiency_variance_pct" numeric(7, 4) NOT NULL,
	"consecutive_months_over_50pct" integer DEFAULT 0 NOT NULL,
	"recommendation" "fix_or_flip" NOT NULL,
	"is_triggered" boolean DEFAULT false NOT NULL,
	"assessed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_internal_billing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"billing_date" date NOT NULL,
	"hours_used" numeric(5, 2) NOT NULL,
	"rate_snapshot" numeric(12, 2) NOT NULL,
	"total_charge" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"certified_by" uuid,
	"certified_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fuel_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"engine_hours_start" numeric(10, 2) NOT NULL,
	"engine_hours_end" numeric(10, 2) NOT NULL,
	"engine_hours_total" numeric(10, 2),
	"fuel_consumed_liters" numeric(10, 4) NOT NULL,
	"fuel_efficiency_actual" numeric(8, 4),
	"fuel_standard_liters_per_hour" numeric(8, 4) NOT NULL,
	"efficiency_variance_pct" numeric(7, 4),
	"is_flagged" boolean DEFAULT false NOT NULL,
	"operator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"maintenance_type" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"parts_cost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"labor_cost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(15, 2),
	"downtime_days" integer DEFAULT 0 NOT NULL,
	"maintenance_date" date NOT NULL,
	"completed_date" date,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_time_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"unit_id" uuid,
	"cost_center_id" uuid NOT NULL,
	"time_in" time,
	"time_out" time,
	"hours_worked" numeric(5, 2),
	"overtime_hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"file_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"employee_code" varchar(50) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"dept_id" uuid NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"position" varchar(100) NOT NULL,
	"employment_type" varchar(20) NOT NULL,
	"daily_rate" numeric(12, 2) NOT NULL,
	"sss_contribution" numeric(10, 2) DEFAULT '0' NOT NULL,
	"philhealth_contribution" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pagibig_contribution" numeric(10, 2) DEFAULT '0' NOT NULL,
	"hire_date" date NOT NULL,
	"tin_number" varchar(20),
	"bank_name" varchar(100),
	"bank_account_number" varchar(50),
	"bank_account_name" varchar(150),
	"separation_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "leave_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type" varchar(30) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days_count" numeric(5, 0),
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"days_worked" numeric(5, 2) DEFAULT '0' NOT NULL,
	"overtime_hours" numeric(7, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(12, 2) NOT NULL,
	"tax_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sss_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"philhealth_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pagibig_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(10, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_flow_projections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"projection_date" date NOT NULL,
	"period_days" numeric(3, 0) NOT NULL,
	"current_bank_balance" numeric(15, 2) NOT NULL,
	"verified_receivables" numeric(15, 2) NOT NULL,
	"approved_payables" numeric(15, 2) NOT NULL,
	"projected_material_outflow" numeric(15, 2) NOT NULL,
	"projected_labor_outflow" numeric(15, 2) NOT NULL,
	"projected_inflow" numeric(15, 2) NOT NULL,
	"net_gap" numeric(15, 2),
	"is_below_buffer" boolean DEFAULT false NOT NULL,
	"alert_sent" boolean DEFAULT false NOT NULL,
	"alert_sent_at" timestamp with time zone,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "developer_advance_tracker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"total_advance" numeric(15, 2) DEFAULT '63750000.00' NOT NULL,
	"total_recovered" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"remaining_balance" numeric(15, 2),
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "developer_advance_tracker_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "financial_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"dept_id" uuid NOT NULL,
	"unit_id" uuid,
	"resource_type" "resource_type" NOT NULL,
	"resource_id" uuid NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"is_external" boolean DEFAULT true NOT NULL,
	"transaction_date" date NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"war_id" uuid NOT NULL,
	"unit_milestone_id" uuid NOT NULL,
	"gross_accomplishment" numeric(15, 2) NOT NULL,
	"less_dp_recovery" numeric(15, 2) DEFAULT '0' NOT NULL,
	"less_osm_deduction" numeric(15, 2) DEFAULT '0' NOT NULL,
	"less_retention" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_amount_due" numeric(15, 2),
	"status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"collected_at" timestamp with time zone,
	"collection_amount" numeric(15, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"requires_bod_approval" boolean DEFAULT false NOT NULL,
	"requires_dual_auth" boolean DEFAULT false NOT NULL,
	"bank_account_id" uuid,
	"supporting_doc_url" text,
	"status" "approval_status" DEFAULT 'DRAFT' NOT NULL,
	"payment_status" "payment_flow_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"prepared_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"authorized_by" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"subcon_id" uuid NOT NULL,
	"war_id" uuid NOT NULL,
	"gross_amount" numeric(15, 2) NOT NULL,
	"less_advance_recoupment" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(15, 2),
	"status" "approval_status" DEFAULT 'DRAFT' NOT NULL,
	"rejection_reason" text,
	"audit_verified_by" uuid,
	"audit_verified_at" timestamp with time zone,
	"bod_approved_by" uuid,
	"bod_approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"po_id" uuid,
	"payable_id" uuid,
	"voucher_id" uuid,
	"request_type" varchar(30) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"released_by" uuid,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_order_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"bom_standard_id" uuid,
	"activity_def_id" uuid,
	"unit_model" varchar(50),
	"unit_type" "unit_type",
	"material_id" uuid,
	"change_type" "change_order_type" NOT NULL,
	"old_quantity" numeric(15, 4),
	"new_quantity" numeric(15, 4),
	"reason" text NOT NULL,
	"attachment_urls" jsonb,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"requested_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batching_manpower_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_date" date NOT NULL,
	"employee_id" uuid NOT NULL,
	"shift" varchar(10) NOT NULL,
	"hours_worked" numeric(5, 2) NOT NULL,
	"overtime_hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_manpower_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid,
	"log_date" date NOT NULL,
	"activity_def_id" uuid,
	"subcon_id" uuid,
	"subcon_headcount" integer DEFAULT 0 NOT NULL,
	"direct_staff_count" integer DEFAULT 0 NOT NULL,
	"committed_headcount" integer,
	"is_no_show_flagged" boolean DEFAULT false NOT NULL,
	"labor_cost_php" numeric(15, 2) DEFAULT '0' NOT NULL,
	"remarks" text,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_manpower_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_date" date NOT NULL,
	"employee_id" uuid NOT NULL,
	"equipment_id" uuid,
	"hours_worked" numeric(5, 2) NOT NULL,
	"overtime_hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"days_worked" numeric(5, 2) NOT NULL,
	"overtime_hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(12, 2) NOT NULL,
	"sss_regular_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sss_mpf_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"philhealth_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pagibig_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_withheld" numeric(10, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(10, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "payroll_status" DEFAULT 'DRAFT' NOT NULL,
	"total_gross" numeric(15, 2),
	"total_deductions" numeric(15, 2),
	"total_net" numeric(15, 2),
	"dtr_verified" boolean DEFAULT false NOT NULL,
	"processed_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_by" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_note" text,
	"released_by" uuid,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"account_name" varchar(150) NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"account_type" varchar(30) NOT NULL,
	"currency" varchar(10) DEFAULT 'PHP' NOT NULL,
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"statement_line_id" uuid,
	"erp_transaction_id" uuid,
	"match_type" varchar(20) NOT NULL,
	"statement_amount" numeric(15, 2),
	"erp_amount" numeric(15, 2),
	"variance" numeric(15, 2),
	"matched_by" uuid,
	"matched_at" timestamp with time zone,
	"action_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"reconciliation_date" date NOT NULL,
	"statement_balance" numeric(15, 2) NOT NULL,
	"book_balance" numeric(15, 2) NOT NULL,
	"variance" numeric(15, 2) NOT NULL,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"notes" text,
	"reconciled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_statement_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"bank_format" varchar(20) NOT NULL,
	"file_name" varchar(255),
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"opening_balance" numeric(15, 2) NOT NULL,
	"closing_balance" numeric(15, 2) NOT NULL,
	"line_count" integer NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"imported_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_statement_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"transaction_date" date NOT NULL,
	"value_date" date,
	"description" text NOT NULL,
	"reference_number" varchar(100),
	"debit_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"running_balance" numeric(15, 2),
	"is_matched" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"transaction_date" date NOT NULL,
	"transaction_type" "bank_transaction_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text NOT NULL,
	"reference_number" varchar(100),
	"cost_center_id" uuid,
	"source_document_url" text,
	"requires_dual_auth" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"entered_by" uuid NOT NULL,
	"first_approval_by" uuid,
	"first_approval_at" timestamp with time zone,
	"second_approval_by" uuid,
	"second_approval_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lender_name" varchar(150) NOT NULL,
	"loan_type" varchar(100),
	"principal_amount" numeric(15, 2) NOT NULL,
	"interest_rate" numeric(5, 2) NOT NULL,
	"tenor_months" integer NOT NULL,
	"start_date" date NOT NULL,
	"maturity_date" date NOT NULL,
	"monthly_amortization" numeric(15, 2) NOT NULL,
	"outstanding_balance" numeric(15, 2) NOT NULL,
	"disbursement_account_id" uuid,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"payment_date" date NOT NULL,
	"principal_paid" numeric(15, 2) NOT NULL,
	"interest_paid" numeric(15, 2) NOT NULL,
	"total_paid" numeric(15, 2) NOT NULL,
	"bank_account_id" uuid,
	"reference_number" varchar(100),
	"status" varchar(20) DEFAULT 'POSTED' NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests_for_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"payee_name" varchar(150) NOT NULL,
	"purpose" text NOT NULL,
	"source_document_url" text NOT NULL,
	"cost_center_id" uuid,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"submitted_by" uuid NOT NULL,
	"first_approval_by" uuid,
	"first_approval_at" timestamp with time zone,
	"final_approval_by" uuid,
	"final_approval_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punch_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"unit_id" uuid,
	"item" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"status" "punch_list_status" DEFAULT 'OPEN' NOT NULL,
	"assigned_to" uuid,
	"due_date" date,
	"attachment_urls" jsonb,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turnover_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"turnover_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"certificate_url" text,
	"inspected_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtual_inventory_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"total_bulk_qty" numeric(12, 2) DEFAULT '0' NOT NULL,
	"allocated_qty" numeric(12, 2) DEFAULT '0' NOT NULL,
	"remaining_qty" numeric(12, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_inventory_material_project" UNIQUE("material_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_dept_id_departments_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dept_id_departments_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_developer_id_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_ntp_uploaded_by_users_id_fk" FOREIGN KEY ("ntp_uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_bod_approved_by_users_id_fk" FOREIGN KEY ("bod_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_standards" ADD CONSTRAINT "bom_standards_activity_def_id_activity_definitions_id_fk" FOREIGN KEY ("activity_def_id") REFERENCES "public"."activity_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_standards" ADD CONSTRAINT "bom_standards_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_standards" ADD CONSTRAINT "bom_standards_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_rate_cards" ADD CONSTRAINT "developer_rate_cards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_rate_cards" ADD CONSTRAINT "developer_rate_cards_activity_def_id_activity_definitions_id_fk" FOREIGN KEY ("activity_def_id") REFERENCES "public"."activity_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_rate_cards" ADD CONSTRAINT "developer_rate_cards_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_price_history" ADD CONSTRAINT "material_price_history_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_price_history" ADD CONSTRAINT "material_price_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_price_history" ADD CONSTRAINT "material_price_history_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_suppliers" ADD CONSTRAINT "material_suppliers_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_suppliers" ADD CONSTRAINT "material_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_preferred_supplier_id_suppliers_id_fk" FOREIGN KEY ("preferred_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_progress" ADD CONSTRAINT "project_activity_progress_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_progress" ADD CONSTRAINT "project_activity_progress_activity_def_id_activity_definitions_id_fk" FOREIGN KEY ("activity_def_id") REFERENCES "public"."activity_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_progress" ADD CONSTRAINT "project_activity_progress_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_advances" ADD CONSTRAINT "subcontractor_advances_subcon_id_subcontractors_id_fk" FOREIGN KEY ("subcon_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_advances" ADD CONSTRAINT "subcontractor_advances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_advances" ADD CONSTRAINT "subcontractor_advances_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_capacity_matrix" ADD CONSTRAINT "subcontractor_capacity_matrix_subcon_id_subcontractors_id_fk" FOREIGN KEY ("subcon_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_capacity_matrix" ADD CONSTRAINT "subcontractor_capacity_matrix_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_performance_ratings" ADD CONSTRAINT "subcontractor_performance_ratings_subcon_id_subcontractors_id_fk" FOREIGN KEY ("subcon_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_performance_ratings" ADD CONSTRAINT "subcontractor_performance_ratings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_performance_ratings" ADD CONSTRAINT "subcontractor_performance_ratings_computed_by_users_id_fk" FOREIGN KEY ("computed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_rate_cards" ADD CONSTRAINT "subcontractor_rate_cards_subcon_id_subcontractors_id_fk" FOREIGN KEY ("subcon_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_rate_cards" ADD CONSTRAINT "subcontractor_rate_cards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_rate_cards" ADD CONSTRAINT "subcontractor_rate_cards_activity_def_id_activity_definitions_id_fk" FOREIGN KEY ("activity_def_id") REFERENCES "public"."activity_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_rate_cards" ADD CONSTRAINT "subcontractor_rate_cards_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eot_requests" ADD CONSTRAINT "eot_requests_unit_activity_id_unit_activities_id_fk" FOREIGN KEY ("unit_activity_id") REFERENCES "public"."unit_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eot_requests" ADD CONSTRAINT "eot_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eot_requests" ADD CONSTRAINT "eot_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_units" ADD CONSTRAINT "project_units_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_units" ADD CONSTRAINT "project_units_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_activities" ADD CONSTRAINT "unit_activities_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_activities" ADD CONSTRAINT "unit_activities_activity_def_id_activity_definitions_id_fk" FOREIGN KEY ("activity_def_id") REFERENCES "public"."activity_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_milestones" ADD CONSTRAINT "unit_milestones_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_milestones" ADD CONSTRAINT "unit_milestones_milestone_def_id_milestone_definitions_id_fk" FOREIGN KEY ("milestone_def_id") REFERENCES "public"."milestone_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_milestones" ADD CONSTRAINT "unit_milestones_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_turnovers" ADD CONSTRAINT "unit_turnovers_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_turnovers" ADD CONSTRAINT "unit_turnovers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_turnovers" ADD CONSTRAINT "unit_turnovers_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_mrr_id_material_receiving_reports_id_fk" FOREIGN KEY ("mrr_id") REFERENCES "public"."material_receiving_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_movement_logs" ADD CONSTRAINT "material_movement_logs_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_movement_logs" ADD CONSTRAINT "material_movement_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_movement_logs" ADD CONSTRAINT "material_movement_logs_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_movement_logs" ADD CONSTRAINT "material_movement_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_receiving_reports" ADD CONSTRAINT "material_receiving_reports_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_receiving_reports" ADD CONSTRAINT "material_receiving_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_receiving_reports" ADD CONSTRAINT "material_receiving_reports_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_receiving_reports" ADD CONSTRAINT "material_receiving_reports_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_batch_id_inventory_ledger_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_ledger"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_signed_by_user_users_id_fk" FOREIGN KEY ("signed_by_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_transfers" ADD CONSTRAINT "material_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mrr_items" ADD CONSTRAINT "mrr_items_mrr_id_material_receiving_reports_id_fk" FOREIGN KEY ("mrr_id") REFERENCES "public"."material_receiving_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mrr_items" ADD CONSTRAINT "mrr_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osm_deduction_buckets" ADD CONSTRAINT "osm_deduction_buckets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osm_deduction_buckets" ADD CONSTRAINT "osm_deduction_buckets_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_price_change_requests" ADD CONSTRAINT "po_price_change_requests_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_price_change_requests" ADD CONSTRAINT "po_price_change_requests_po_item_id_purchase_order_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_price_change_requests" ADD CONSTRAINT "po_price_change_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_price_change_requests" ADD CONSTRAINT "po_price_change_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_audit_reviewed_by_users_id_fk" FOREIGN KEY ("audit_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_bod_approved_by_users_id_fk" FOREIGN KEY ("bod_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_activity_def_id_activity_definitions_id_fk" FOREIGN KEY ("activity_def_id") REFERENCES "public"."activity_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress_entries" ADD CONSTRAINT "daily_progress_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress_entries" ADD CONSTRAINT "daily_progress_entries_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress_entries" ADD CONSTRAINT "daily_progress_entries_task_assignment_id_task_assignments_id_fk" FOREIGN KEY ("task_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress_entries" ADD CONSTRAINT "daily_progress_entries_unit_activity_id_unit_activities_id_fk" FOREIGN KEY ("unit_activity_id") REFERENCES "public"."unit_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress_entries" ADD CONSTRAINT "daily_progress_entries_subcon_id_subcontractors_id_fk" FOREIGN KEY ("subcon_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress_entries" ADD CONSTRAINT "daily_progress_entries_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_documents" ADD CONSTRAINT "milestone_documents_war_id_work_accomplished_reports_id_fk" FOREIGN KEY ("war_id") REFERENCES "public"."work_accomplished_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_documents" ADD CONSTRAINT "milestone_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_documents" ADD CONSTRAINT "milestone_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_subcon_id_subcontractors_id_fk" FOREIGN KEY ("subcon_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_capacity_checked_by_users_id_fk" FOREIGN KEY ("capacity_checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_accomplished_reports" ADD CONSTRAINT "work_accomplished_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_accomplished_reports" ADD CONSTRAINT "work_accomplished_reports_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_accomplished_reports" ADD CONSTRAINT "work_accomplished_reports_unit_milestone_id_unit_milestones_id_fk" FOREIGN KEY ("unit_milestone_id") REFERENCES "public"."unit_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_accomplished_reports" ADD CONSTRAINT "work_accomplished_reports_task_assignment_id_task_assignments_id_fk" FOREIGN KEY ("task_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_accomplished_reports" ADD CONSTRAINT "work_accomplished_reports_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_accomplished_reports" ADD CONSTRAINT "work_accomplished_reports_accounting_verified_by_users_id_fk" FOREIGN KEY ("accounting_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_accomplished_reports" ADD CONSTRAINT "work_accomplished_reports_audit_verified_by_users_id_fk" FOREIGN KEY ("audit_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_accomplished_reports" ADD CONSTRAINT "work_accomplished_reports_bod_approved_by_users_id_fk" FOREIGN KEY ("bod_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_ntp_id_task_assignments_id_fk" FOREIGN KEY ("ntp_id") REFERENCES "public"."task_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_bom_standard_id_bom_standards_id_fk" FOREIGN KEY ("bom_standard_id") REFERENCES "public"."bom_standards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_internal_sales" ADD CONSTRAINT "batching_internal_sales_delivery_receipt_id_concrete_delivery_receipts_id_fk" FOREIGN KEY ("delivery_receipt_id") REFERENCES "public"."concrete_delivery_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_internal_sales" ADD CONSTRAINT "batching_internal_sales_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_internal_sales" ADD CONSTRAINT "batching_internal_sales_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_production_logs" ADD CONSTRAINT "batching_production_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_production_logs" ADD CONSTRAINT "batching_production_logs_mix_design_id_mix_designs_id_fk" FOREIGN KEY ("mix_design_id") REFERENCES "public"."mix_designs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_production_logs" ADD CONSTRAINT "batching_production_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_notes" ADD CONSTRAINT "concrete_delivery_notes_production_log_id_batching_production_logs_id_fk" FOREIGN KEY ("production_log_id") REFERENCES "public"."batching_production_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_notes" ADD CONSTRAINT "concrete_delivery_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_notes" ADD CONSTRAINT "concrete_delivery_notes_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_notes" ADD CONSTRAINT "concrete_delivery_notes_mix_design_id_mix_designs_id_fk" FOREIGN KEY ("mix_design_id") REFERENCES "public"."mix_designs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_notes" ADD CONSTRAINT "concrete_delivery_notes_truck_id_equipment_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_notes" ADD CONSTRAINT "concrete_delivery_notes_dispatched_by_users_id_fk" FOREIGN KEY ("dispatched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_receipts" ADD CONSTRAINT "concrete_delivery_receipts_delivery_note_id_concrete_delivery_notes_id_fk" FOREIGN KEY ("delivery_note_id") REFERENCES "public"."concrete_delivery_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_receipts" ADD CONSTRAINT "concrete_delivery_receipts_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concrete_delivery_receipts" ADD CONSTRAINT "concrete_delivery_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mix_designs" ADD CONSTRAINT "mix_designs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mix_designs" ADD CONSTRAINT "mix_designs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mix_designs" ADD CONSTRAINT "mix_designs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_daily_checklists" ADD CONSTRAINT "equipment_daily_checklists_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_daily_checklists" ADD CONSTRAINT "equipment_daily_checklists_assignment_id_equipment_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."equipment_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_daily_checklists" ADD CONSTRAINT "equipment_daily_checklists_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fix_or_flip_assessments" ADD CONSTRAINT "fix_or_flip_assessments_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fix_or_flip_assessments" ADD CONSTRAINT "fix_or_flip_assessments_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_internal_billing" ADD CONSTRAINT "fleet_internal_billing_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_internal_billing" ADD CONSTRAINT "fleet_internal_billing_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_internal_billing" ADD CONSTRAINT "fleet_internal_billing_certified_by_users_id_fk" FOREIGN KEY ("certified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_internal_billing" ADD CONSTRAINT "fleet_internal_billing_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_assignment_id_equipment_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."equipment_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_time_records" ADD CONSTRAINT "daily_time_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_time_records" ADD CONSTRAINT "daily_time_records_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_time_records" ADD CONSTRAINT "daily_time_records_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_time_records" ADD CONSTRAINT "daily_time_records_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_dept_id_departments_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_schedules" ADD CONSTRAINT "leave_schedules_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_schedules" ADD CONSTRAINT "leave_schedules_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_flow_projections" ADD CONSTRAINT "cash_flow_projections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_advance_tracker" ADD CONSTRAINT "developer_advance_tracker_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_dept_id_departments_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_war_id_work_accomplished_reports_id_fk" FOREIGN KEY ("war_id") REFERENCES "public"."work_accomplished_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_unit_milestone_id_unit_milestones_id_fk" FOREIGN KEY ("unit_milestone_id") REFERENCES "public"."unit_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_vouchers" ADD CONSTRAINT "manual_vouchers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_vouchers" ADD CONSTRAINT "manual_vouchers_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_vouchers" ADD CONSTRAINT "manual_vouchers_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_vouchers" ADD CONSTRAINT "manual_vouchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_vouchers" ADD CONSTRAINT "manual_vouchers_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_vouchers" ADD CONSTRAINT "manual_vouchers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_vouchers" ADD CONSTRAINT "manual_vouchers_authorized_by_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_subcon_id_subcontractors_id_fk" FOREIGN KEY ("subcon_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_war_id_work_accomplished_reports_id_fk" FOREIGN KEY ("war_id") REFERENCES "public"."work_accomplished_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_audit_verified_by_users_id_fk" FOREIGN KEY ("audit_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payables" ADD CONSTRAINT "payables_bod_approved_by_users_id_fk" FOREIGN KEY ("bod_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_payable_id_payables_id_fk" FOREIGN KEY ("payable_id") REFERENCES "public"."payables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_voucher_id_manual_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."manual_vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_requests" ADD CONSTRAINT "change_order_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_requests" ADD CONSTRAINT "change_order_requests_bom_standard_id_bom_standards_id_fk" FOREIGN KEY ("bom_standard_id") REFERENCES "public"."bom_standards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_requests" ADD CONSTRAINT "change_order_requests_activity_def_id_activity_definitions_id_fk" FOREIGN KEY ("activity_def_id") REFERENCES "public"."activity_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_requests" ADD CONSTRAINT "change_order_requests_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_requests" ADD CONSTRAINT "change_order_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_requests" ADD CONSTRAINT "change_order_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_manpower_logs" ADD CONSTRAINT "batching_manpower_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_manpower_logs" ADD CONSTRAINT "batching_manpower_logs_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batching_manpower_logs" ADD CONSTRAINT "batching_manpower_logs_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_manpower_logs" ADD CONSTRAINT "construction_manpower_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_manpower_logs" ADD CONSTRAINT "construction_manpower_logs_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_manpower_logs" ADD CONSTRAINT "construction_manpower_logs_activity_def_id_activity_definitions_id_fk" FOREIGN KEY ("activity_def_id") REFERENCES "public"."activity_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_manpower_logs" ADD CONSTRAINT "construction_manpower_logs_subcon_id_subcontractors_id_fk" FOREIGN KEY ("subcon_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_manpower_logs" ADD CONSTRAINT "construction_manpower_logs_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_manpower_logs" ADD CONSTRAINT "fleet_manpower_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_manpower_logs" ADD CONSTRAINT "fleet_manpower_logs_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_manpower_logs" ADD CONSTRAINT "fleet_manpower_logs_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_manpower_logs" ADD CONSTRAINT "fleet_manpower_logs_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_items" ADD CONSTRAINT "bank_reconciliation_items_import_id_bank_statement_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."bank_statement_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_items" ADD CONSTRAINT "bank_reconciliation_items_statement_line_id_bank_statement_lines_id_fk" FOREIGN KEY ("statement_line_id") REFERENCES "public"."bank_statement_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_items" ADD CONSTRAINT "bank_reconciliation_items_erp_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("erp_transaction_id") REFERENCES "public"."bank_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_items" ADD CONSTRAINT "bank_reconciliation_items_matched_by_users_id_fk" FOREIGN KEY ("matched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_reconciled_by_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_import_id_bank_statement_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."bank_statement_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_first_approval_by_users_id_fk" FOREIGN KEY ("first_approval_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_second_approval_by_users_id_fk" FOREIGN KEY ("second_approval_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_loans" ADD CONSTRAINT "corporate_loans_disbursement_account_id_bank_accounts_id_fk" FOREIGN KEY ("disbursement_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_loans" ADD CONSTRAINT "corporate_loans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_corporate_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."corporate_loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests_for_payment" ADD CONSTRAINT "requests_for_payment_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests_for_payment" ADD CONSTRAINT "requests_for_payment_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests_for_payment" ADD CONSTRAINT "requests_for_payment_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests_for_payment" ADD CONSTRAINT "requests_for_payment_first_approval_by_users_id_fk" FOREIGN KEY ("first_approval_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests_for_payment" ADD CONSTRAINT "requests_for_payment_final_approval_by_users_id_fk" FOREIGN KEY ("final_approval_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_lists" ADD CONSTRAINT "punch_lists_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_lists" ADD CONSTRAINT "punch_lists_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_lists" ADD CONSTRAINT "punch_lists_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_lists" ADD CONSTRAINT "punch_lists_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_lists" ADD CONSTRAINT "punch_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnover_certificates" ADD CONSTRAINT "turnover_certificates_unit_id_project_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."project_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnover_certificates" ADD CONSTRAINT "turnover_certificates_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnover_certificates" ADD CONSTRAINT "turnover_certificates_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_inventory_ledger" ADD CONSTRAINT "virtual_inventory_ledger_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_inventory_ledger" ADD CONSTRAINT "virtual_inventory_ledger_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;