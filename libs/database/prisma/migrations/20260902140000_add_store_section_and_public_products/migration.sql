-- CreateTable
CREATE TABLE "store_sections" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_sections_slug_key" ON "store_sections"("slug");

-- CreateIndex
CREATE INDEX "store_sections_slug_is_active_idx" ON "store_sections"("slug", "is_active");
