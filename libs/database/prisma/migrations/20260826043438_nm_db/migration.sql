-- AlterTable
ALTER TABLE "inventory_movements" ALTER COLUMN "balance_after" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "accumulated_account_transfers" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "transfer_month" VARCHAR(7) NOT NULL,
    "cash_amount" DECIMAL(12,2) NOT NULL,
    "digital_amount" DECIMAL(12,2) NOT NULL,
    "closing_cash_amount" DECIMAL(12,2) NOT NULL,
    "closing_digital_amount" DECIMAL(12,2) NOT NULL,
    "projected_cash_amount" DECIMAL(12,2) NOT NULL,
    "projected_digital_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accumulated_account_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accumulated_account_transfers_warehouse_id_transfer_month_key" ON "accumulated_account_transfers"("warehouse_id", "transfer_month");

-- AddForeignKey
ALTER TABLE "accumulated_account_transfers" ADD CONSTRAINT "accumulated_account_transfers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
