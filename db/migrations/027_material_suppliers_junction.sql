-- Migration 027: material_suppliers junction table
-- Replaces single preferredSupplierId on materials with a proper many-to-many relationship.
-- The old preferredSupplierId column is kept for backwards compatibility but is no longer the
-- primary way to express supplier preference — use material_suppliers.is_preferred instead.

CREATE TABLE IF NOT EXISTS material_suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id  uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id  uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  is_preferred boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, supplier_id)
);

-- Migrate existing preferredSupplierId relationships into the new table
INSERT INTO material_suppliers (material_id, supplier_id, is_preferred)
SELECT id, preferred_supplier_id, true
FROM materials
WHERE preferred_supplier_id IS NOT NULL
ON CONFLICT (material_id, supplier_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_material_suppliers_material ON material_suppliers(material_id);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_supplier ON material_suppliers(supplier_id);
