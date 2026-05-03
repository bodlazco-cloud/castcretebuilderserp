-- Migration 024: Add photo evidence URL to material_movement_logs
-- Required for inventory adjustments (Theft, Damage, Spillage, Found Stock)
-- where photo proof is mandatory before the adjustment is accepted.

ALTER TABLE material_movement_logs
    ADD COLUMN IF NOT EXISTS photo_evidence_url TEXT;

COMMENT ON COLUMN material_movement_logs.photo_evidence_url IS
    'Mandatory photo proof for ADJUSTMENT movements; optional for others';
