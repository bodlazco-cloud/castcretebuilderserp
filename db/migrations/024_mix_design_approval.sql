-- Migration 024: Mix Design approval workflow
-- Adds status, submittedBy/At, and rejectionReason to mix_designs.
-- Flow: DRAFT → PENDING_REVIEW → APPROVED (locked) / REJECTED (editable again)
-- APPROVED mix designs cannot be edited; a new version must be submitted.

ALTER TABLE mix_designs
  ADD COLUMN IF NOT EXISTS status          bom_status   NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS submitted_by    UUID         REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Back-fill: any mix_design that already has approved_by set is considered APPROVED
UPDATE mix_designs SET status = 'APPROVED' WHERE approved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mix_designs_status ON mix_designs(status);
