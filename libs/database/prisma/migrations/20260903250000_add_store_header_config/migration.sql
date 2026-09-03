-- CreateTable
CREATE TABLE "store_header_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "slug" VARCHAR(50) NOT NULL DEFAULT 'default',
    "topbar_message" TEXT,
    "support_phone" VARCHAR(30),
    "logo_text" VARCHAR(255) NOT NULL,
    "logo_url" TEXT,
    "top_bar_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sticky_enabled" BOOLEAN NOT NULL DEFAULT true,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_header_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" TEXT NOT NULL,
    "header_config_id" TEXT NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "href" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "parent_id" TEXT,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_header_configs_tenant_id_key" ON "store_header_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_header_configs_slug_key" ON "store_header_configs"("slug");

-- CreateIndex
CREATE INDEX "navigation_items_header_config_id_sort_order_idx" ON "navigation_items"("header_config_id", "sort_order");

-- AddForeignKey
ALTER TABLE "store_header_configs" ADD CONSTRAINT "store_header_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_header_config_id_fkey" FOREIGN KEY ("header_config_id") REFERENCES "store_header_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "navigation_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
