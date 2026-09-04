-- AlterTable
ALTER TABLE "ecommerce_coupons" ADD COLUMN "per_ip_limit" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ecommerce_coupon_redemptions" ADD COLUMN "client_ip" VARCHAR(45);

-- CreateIndex
CREATE INDEX "ecommerce_coupon_redemptions_coupon_id_client_ip_idx" ON "ecommerce_coupon_redemptions"("coupon_id", "client_ip");
