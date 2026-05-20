-- Migration 027: Add preferred_supplier_id to purchase_requisition_items
-- Allows auto-generated Batching Plant PRs (and any PR) to carry the
-- material's preferred supplier locked at time of PR creation.

ALTER TABLE purchase_requisition_items
  ADD COLUMN IF NOT EXISTS preferred_supplier_id UUID REFERENCES suppliers(id);

CREATE INDEX IF NOT EXISTS idx_pr_items_preferred_supplier
  ON purchase_requisition_items(preferred_supplier_id);
