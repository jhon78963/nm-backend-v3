-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ruc" VARCHAR(11),
    "legal_name" TEXT,
    "trade_name" TEXT,
    "address" TEXT,
    "district" TEXT,
    "province" TEXT,
    "department" TEXT,
    "phone" VARCHAR(20),
    "email" TEXT,
    "website" TEXT,
    "social_links" JSONB,
    "logo_url" TEXT,
    "ticket_footer_note" TEXT,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "catalog_public_token" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "surname" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "profile_picture" TEXT,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletion_time" TIMESTAMP(3),
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "guard_name" TEXT NOT NULL DEFAULT 'api',
    "tenant_id" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "guard_name" TEXT NOT NULL DEFAULT 'api',

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT
);

-- CreateTable
CREATE TABLE "user_action_logs" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "warehouse_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genders" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "short_name" VARCHAR(10),

    CONSTRAINT "genders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colors" (
    "id" TEXT NOT NULL,
    "description" VARCHAR(100) NOT NULL,
    "hash" VARCHAR(7),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletion_time" TIMESTAMP(3),

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "size_types" (
    "id" TEXT NOT NULL,
    "description" VARCHAR(100) NOT NULL,

    CONSTRAINT "size_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizes" (
    "id" TEXT NOT NULL,
    "description" VARCHAR(50) NOT NULL,
    "size_type_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "barcode" VARCHAR(50),
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_on_sale" BOOLEAN NOT NULL DEFAULT false,
    "woo_status" TEXT NOT NULL DEFAULT 'draft',
    "status" TEXT NOT NULL DEFAULT 'active',
    "gender_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "warehouse_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletion_time" TIMESTAMP(3),
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "deleted_by_id" TEXT,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_size" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "size_id" TEXT NOT NULL,
    "barcode" VARCHAR(50),
    "purchase_price" DECIMAL(10,4) NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "min_sale_price" DECIMAL(10,2),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletion_time" TIMESTAMP(3),

    CONSTRAINT "product_size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_size_color" (
    "id" TEXT NOT NULL,
    "product_size_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,

    CONSTRAINT "product_size_color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_histories" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "reason" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "woocommerce_sync_maps" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "woo_product_id" INTEGER NOT NULL,
    "checksum" TEXT,
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "woocommerce_sync_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(20),
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "warehouse_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "document_type" VARCHAR(10),
    "document_number" VARCHAR(15),
    "name" VARCHAR(255) NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_balances" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "product_size_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "product_size_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "direction" VARCHAR(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "movement_type" VARCHAR(50) NOT NULL,
    "reference_id" TEXT,
    "reference_type" VARCHAR(50),
    "balance_after" INTEGER NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "supplier_name" TEXT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "exchange_rate" DECIMAL(10,4),
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',
    "notes" TEXT,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "cancel_reason" TEXT,
    "cancelled_by_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_lines" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "size_id" TEXT NOT NULL,
    "product_size_id" TEXT NOT NULL,
    "purchase_price" DECIMAL(10,4) NOT NULL,
    "sale_price" DECIMAL(10,2),
    "quantity" INTEGER NOT NULL,
    "has_color_breakdown" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "purchase_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_line_color_deltas" (
    "id" TEXT NOT NULL,
    "purchase_line_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "purchase_line_color_deltas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50),
    "warehouse_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "taxable_base" DECIMAL(12,2),
    "igv" DECIMAL(12,2),
    "payment_method" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    "document_type" VARCHAR(10),
    "serie" VARCHAR(10),
    "correlativo" INTEGER,
    "full_invoice_number" VARCHAR(20),
    "sunat_status" VARCHAR(20),
    "xml_path" TEXT,
    "cdr_path" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_details" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_size_id" TEXT NOT NULL,
    "color_id" TEXT,
    "product_name_snapshot" TEXT NOT NULL,
    "size_snapshot" TEXT NOT NULL,
    "color_snapshot" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "sale_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "method" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" VARCHAR(255),

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_series" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "document_type" VARCHAR(10) NOT NULL,
    "serie" VARCHAR(10) NOT NULL,
    "current_number" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "document_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electronic_document_logs" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "sunat_code" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_document_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "accounting_month" VARCHAR(7) NOT NULL,
    "purchase_id" TEXT,
    "accumulated_balance_applied" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movement_vouchers" (
    "id" TEXT NOT NULL,
    "cash_movement_id" TEXT NOT NULL,
    "voucher_path" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cash_movement_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accumulated_account_settings" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "cash_balance" DECIMAL(12,2) NOT NULL,
    "digital_balance" DECIMAL(12,2) NOT NULL,
    "tracking_start_month" VARCHAR(7) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accumulated_account_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "dni" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "surname" VARCHAR(100) NOT NULL,
    "salary" DECIMAL(10,2) NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "user_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_payments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payroll_period" VARCHAR(7),
    "accounting_month" VARCHAR(7),
    "payment_method" VARCHAR(20) NOT NULL,
    "cash_movement_id" TEXT,

    CONSTRAINT "team_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_catalog_public_token_key" ON "warehouses"("catalog_public_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_tenant_id_key" ON "roles"("name", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_email_key" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE INDEX "user_action_logs_user_id_idx" ON "user_action_logs"("user_id");

-- CreateIndex
CREATE INDEX "user_action_logs_created_at_idx" ON "user_action_logs"("created_at");

-- CreateIndex
CREATE INDEX "products_warehouse_id_idx" ON "products"("warehouse_id");

-- CreateIndex
CREATE INDEX "products_is_deleted_idx" ON "products"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_product_id_size_id_key" ON "product_size"("product_id", "size_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_color_product_size_id_color_id_key" ON "product_size_color"("product_size_id", "color_id");

-- CreateIndex
CREATE INDEX "product_histories_product_id_idx" ON "product_histories"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "woocommerce_sync_maps_product_id_key" ON "woocommerce_sync_maps"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_warehouse_id_product_size_id_color_id_key" ON "inventory_balances"("warehouse_id", "product_size_id", "color_id");

-- CreateIndex
CREATE INDEX "inventory_movements_warehouse_id_occurred_at_idx" ON "inventory_movements"("warehouse_id", "occurred_at");

-- CreateIndex
CREATE INDEX "inventory_movements_product_size_id_color_id_idx" ON "inventory_movements"("product_size_id", "color_id");

-- CreateIndex
CREATE INDEX "purchases_warehouse_id_purchase_date_idx" ON "purchases"("warehouse_id", "purchase_date");

-- CreateIndex
CREATE INDEX "sales_warehouse_id_creation_time_idx" ON "sales"("warehouse_id", "creation_time");

-- CreateIndex
CREATE UNIQUE INDEX "document_series_warehouse_id_document_type_serie_key" ON "document_series"("warehouse_id", "document_type", "serie");

-- CreateIndex
CREATE INDEX "cash_movements_warehouse_id_accounting_month_idx" ON "cash_movements"("warehouse_id", "accounting_month");

-- CreateIndex
CREATE UNIQUE INDEX "accumulated_account_settings_warehouse_id_key" ON "accumulated_account_settings"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_team_id_date_key" ON "attendances"("team_id", "date");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_action_logs" ADD CONSTRAINT "user_action_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_size_type_id_fkey" FOREIGN KEY ("size_type_id") REFERENCES "size_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_gender_id_fkey" FOREIGN KEY ("gender_id") REFERENCES "genders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size" ADD CONSTRAINT "product_size_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size" ADD CONSTRAINT "product_size_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size_color" ADD CONSTRAINT "product_size_color_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "product_size"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size_color" ADD CONSTRAINT "product_size_color_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_histories" ADD CONSTRAINT "product_histories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_histories" ADD CONSTRAINT "product_histories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "woocommerce_sync_maps" ADD CONSTRAINT "woocommerce_sync_maps_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "product_size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "product_size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "product_size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_line_color_deltas" ADD CONSTRAINT "purchase_line_color_deltas_purchase_line_id_fkey" FOREIGN KEY ("purchase_line_id") REFERENCES "purchase_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_line_color_deltas" ADD CONSTRAINT "purchase_line_color_deltas_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_series" ADD CONSTRAINT "document_series_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electronic_document_logs" ADD CONSTRAINT "electronic_document_logs_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movement_vouchers" ADD CONSTRAINT "cash_movement_vouchers_cash_movement_id_fkey" FOREIGN KEY ("cash_movement_id") REFERENCES "cash_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accumulated_account_settings" ADD CONSTRAINT "accumulated_account_settings_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payments" ADD CONSTRAINT "team_payments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
