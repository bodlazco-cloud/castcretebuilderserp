-- Add PENDING_REVIEW value to ntp_status enum
-- NTP lifecycle: DRAFT → PENDING_REVIEW (Planning review) → ACTIVE → COMPLETED
ALTER TYPE ntp_status ADD VALUE IF NOT EXISTS 'PENDING_REVIEW' AFTER 'DRAFT';
