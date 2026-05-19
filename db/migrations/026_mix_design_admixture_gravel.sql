-- Migration 026: Add admixture and gravel spec fields to mix_designs
-- Admixture: chemical admixture volume per m³ (superplasticizer, retarder, etc.)
-- Gravel spec: free-text describing the coarse aggregate breakdown by type/size

ALTER TABLE mix_designs
  ADD COLUMN IF NOT EXISTS admixture_liters_per_m3 NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS gravel_spec              TEXT;
