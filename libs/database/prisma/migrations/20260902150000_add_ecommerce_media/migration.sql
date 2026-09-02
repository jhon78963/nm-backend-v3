-- CreateTable
CREATE TABLE "ecommerce_media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255),
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerce_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ecommerce_media_mime_type_idx" ON "ecommerce_media"("mime_type");

-- CreateIndex
CREATE INDEX "ecommerce_media_created_at_idx" ON "ecommerce_media"("created_at");
