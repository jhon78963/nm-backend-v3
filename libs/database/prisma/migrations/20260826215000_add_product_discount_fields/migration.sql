-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "percentage_discount" VARCHAR(20);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cash_discount" INTEGER;
