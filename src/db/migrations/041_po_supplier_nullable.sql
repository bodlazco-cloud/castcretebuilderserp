-- Allow purchase orders without a pre-assigned supplier
ALTER TABLE purchase_orders ALTER COLUMN supplier_id DROP NOT NULL;
