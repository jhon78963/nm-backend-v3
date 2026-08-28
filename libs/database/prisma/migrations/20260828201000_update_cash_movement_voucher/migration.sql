-- AlterTable: cash_movement_vouchers — add url, mimeType, name columns
ALTER TABLE "cash_movement_vouchers"
    ADD COLUMN "voucher_url" TEXT,
    ADD COLUMN "mime_type"   VARCHAR(50),
    ADD COLUMN "name"        VARCHAR(255);
