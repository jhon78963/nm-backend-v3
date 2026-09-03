-- Vincular clientes de ecommerce con usuarios del auth-service (rol Cliente).

ALTER TABLE "ecommerce_customers" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ecommerce_customers_user_id_key" ON "ecommerce_customers"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ecommerce_customers_user_id_fkey'
  ) THEN
    ALTER TABLE "ecommerce_customers"
      ADD CONSTRAINT "ecommerce_customers_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
