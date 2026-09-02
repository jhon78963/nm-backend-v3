-- CreateTable
CREATE TABLE "ecommerce_orders" (
    "id" TEXT NOT NULL,
    "order_number" VARCHAR(32) NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "email" VARCHAR(255) NOT NULL,
    "billing_address" JSONB NOT NULL,
    "shipping_address" JSONB NOT NULL,
    "same_as_billing" BOOLEAN NOT NULL DEFAULT true,
    "order_notes" TEXT,
    "shipping_method_id" VARCHAR(50) NOT NULL,
    "shipping_method_title" VARCHAR(255) NOT NULL,
    "shipping_total" DECIMAL(12,2) NOT NULL,
    "payment_method_id" VARCHAR(50) NOT NULL,
    "payment_method_title" VARCHAR(255) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "coupon_code" VARCHAR(50),
    "coupon_discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecommerce_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_size_id" TEXT NOT NULL,
    "color_id" TEXT,
    "name_snapshot" VARCHAR(255) NOT NULL,
    "variation_label" VARCHAR(255),
    "image_url" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ecommerce_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_orders_order_number_key" ON "ecommerce_orders"("order_number");

-- CreateIndex
CREATE INDEX "ecommerce_orders_warehouse_id_creation_time_idx" ON "ecommerce_orders"("warehouse_id", "creation_time");

-- CreateIndex
CREATE INDEX "ecommerce_orders_status_idx" ON "ecommerce_orders"("status");

-- CreateIndex
CREATE INDEX "ecommerce_orders_email_idx" ON "ecommerce_orders"("email");

-- CreateIndex
CREATE INDEX "ecommerce_order_items_order_id_idx" ON "ecommerce_order_items"("order_id");

-- AddForeignKey
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_order_items" ADD CONSTRAINT "ecommerce_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ecommerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
