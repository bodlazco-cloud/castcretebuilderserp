-- Migration 001: Extensions and shared enums
-- Castcrete Builders ERP

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Department codes ────────────────────────────────────────────────────────
CREATE TYPE dept_code AS ENUM (
    'PLANNING',
    'AUDIT',
    'CONSTRUCTION',
    'PROCUREMENT',
    'BATCHING',
    'MOTORPOOL',
    'FINANCE',
    'HR',
    'ADMIN',
    'BOD'
);

-- ─── Cost center types ───────────────────────────────────────────────────────
CREATE TYPE cost_center_type AS ENUM (
    'PROJECT',
    'BATCHING',
    'FLEET',
    'HQ'
);

-- ─── Generic approval / document status flow ─────────────────────────────────
CREATE TYPE approval_status AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'PENDING_AUDIT',
    'READY_FOR_APPROVAL',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

-- ─── Unit work category ──────────────────────────────────────────────────────
CREATE TYPE work_category AS ENUM (
    'STRUCTURAL',
    'ARCHITECTURAL',
    'TURNOVER'
);

-- ─── Trade types ─────────────────────────────────────────────────────────────
CREATE TYPE trade_type AS ENUM (
    'STRUCTURAL',
    'ARCHITECTURAL',
    'BOTH'
);

-- ─── Resource types for the financial ledger ─────────────────────────────────
CREATE TYPE resource_type AS ENUM (
    'MATERIAL',
    'EMPLOYEE',
    'MACHINE'
);

-- ─── Transaction direction ───────────────────────────────────────────────────
CREATE TYPE transaction_type AS ENUM (
    'INFLOW',
    'OUTFLOW',
    'INTERNAL_TRANSFER'
);

-- ─── Inventory source ────────────────────────────────────────────────────────
CREATE TYPE inventory_source AS ENUM (
    'SUPPLIER',
    'DEVELOPER_OSM'     -- Owner Supplied Materials (zero-cost)
);

-- ─── PO payment type ─────────────────────────────────────────────────────────
CREATE TYPE po_status AS ENUM (
    'DRAFT',
    'AUDIT_REVIEW',
    'BOD_APPROVED',
    'PREPAID_REQUIRED',
    'AWAITING_DELIVERY',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'CANCELLED'
);

-- ─── Subcontractor performance grade ─────────────────────────────────────────
CREATE TYPE performance_grade AS ENUM (
    'A',    -- 90-100: full capacity eligible
    'B',    -- 75-89:  capped at 80% capacity
    'C'     -- <75:    stop-assignment status
);

-- ─── Equipment disposition ───────────────────────────────────────────────────
CREATE TYPE fix_or_flip AS ENUM (
    'FIX',
    'FLIP',
    'MONITOR'
);

-- ─── Delay / EOT reason ──────────────────────────────────────────────────────
CREATE TYPE delay_reason AS ENUM (
    'WEATHER',
    'MATERIAL_DELAY',
    'MANPOWER_SHORTAGE',
    'EQUIPMENT_BREAKDOWN',
    'DESIGN_CHANGE',
    'OTHER'
);

-- ─── Document bucket types ───────────────────────────────────────────────────
CREATE TYPE milestone_doc_type AS ENUM (
    'WAR_SIGNED',
    'MILESTONE_PHOTOS',
    'MATERIAL_TRANSFER_SLIPS',
    'OSM_ACKNOWLEDGMENT',
    'SUBCON_BILLING_INVOICE',
    'QUALITY_CLEARANCE'
);
