-- CreateTable
CREATE TABLE "ecommerce_coupons" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "discount_type" VARCHAR(20) NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "min_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "max_discount" DECIMAL(12,2),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "per_customer_limit" INTEGER NOT NULL DEFAULT 1,
    "is_welcome" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "warehouse_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecommerce_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_coupon_assignments" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "ecommerce_coupon_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_coupon_redemptions" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "order_id" TEXT,
    "customer_id" TEXT,
    "discount_amount" DECIMAL(12,2) NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerce_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_coupons_code_key" ON "ecommerce_coupons"("code");

-- CreateIndex
CREATE INDEX "ecommerce_coupons_is_active_is_welcome_idx" ON "ecommerce_coupons"("is_active", "is_welcome");

-- CreateIndex
CREATE INDEX "ecommerce_coupon_assignments_customer_id_idx" ON "ecommerce_coupon_assignments"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_coupon_assignments_coupon_id_customer_id_key" ON "ecommerce_coupon_assignments"("coupon_id", "customer_id");

-- CreateIndex
CREATE INDEX "ecommerce_coupon_redemptions_coupon_id_redeemed_at_idx" ON "ecommerce_coupon_redemptions"("coupon_id", "redeemed_at");

-- CreateIndex
CREATE INDEX "ecommerce_coupon_redemptions_customer_id_idx" ON "ecommerce_coupon_redemptions"("customer_id");

-- CreateIndex
CREATE INDEX "ecommerce_coupon_redemptions_order_id_idx" ON "ecommerce_coupon_redemptions"("order_id");

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_assignments" ADD CONSTRAINT "ecommerce_coupon_assignments_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "ecommerce_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_assignments" ADD CONSTRAINT "ecommerce_coupon_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "ecommerce_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_redemptions" ADD CONSTRAINT "ecommerce_coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "ecommerce_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_redemptions" ADD CONSTRAINT "ecommerce_coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ecommerce_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_coupon_redemptions" ADD CONSTRAINT "ecommerce_coupon_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "ecommerce_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
