-- CreateTable
CREATE TABLE "ecommerce_customer_addresses" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "label" VARCHAR(50) NOT NULL DEFAULT 'Principal',
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'PE',
    "address1" VARCHAR(255) NOT NULL,
    "address2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "postcode" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(30),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecommerce_customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_customer_notification_settings" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_updates" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT true,
    "newsletter" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecommerce_customer_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_customer_notifications" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerce_customer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecommerce_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ecommerce_customer_addresses_customer_id_idx" ON "ecommerce_customer_addresses"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_customer_notification_settings_customer_id_key" ON "ecommerce_customer_notification_settings"("customer_id");

-- CreateIndex
CREATE INDEX "ecommerce_customer_notifications_customer_id_created_at_idx" ON "ecommerce_customer_notifications"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "ecommerce_refunds_customer_id_created_at_idx" ON "ecommerce_refunds"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "ecommerce_refunds_order_id_idx" ON "ecommerce_refunds"("order_id");

-- AddForeignKey
ALTER TABLE "ecommerce_customer_addresses" ADD CONSTRAINT "ecommerce_customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "ecommerce_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_customer_notification_settings" ADD CONSTRAINT "ecommerce_customer_notification_settings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "ecommerce_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_customer_notifications" ADD CONSTRAINT "ecommerce_customer_notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "ecommerce_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_refunds" ADD CONSTRAINT "ecommerce_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ecommerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_refunds" ADD CONSTRAINT "ecommerce_refunds_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "ecommerce_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
