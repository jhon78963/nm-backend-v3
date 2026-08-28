ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS electronic_invoicing_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE warehouses
ADD COLUMN IF NOT EXISTS electronic_invoicing_enabled BOOLEAN NOT NULL DEFAULT false;
