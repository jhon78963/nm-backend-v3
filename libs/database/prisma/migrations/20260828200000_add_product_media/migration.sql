-- CreateTable: product_media
CREATE TABLE "product_media" (
    "id"             TEXT NOT NULL,
    "product_id"     TEXT NOT NULL,
    "url"            TEXT NOT NULL,
    "path"           TEXT NOT NULL,
    "mime_type"      VARCHAR(50) NOT NULL,
    "size"           INTEGER NOT NULL,
    "name"           VARCHAR(255) NOT NULL,
    "sort_order"     INTEGER NOT NULL DEFAULT 0,
    "is_cover"       BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_id" TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_media_product_id_idx" ON "product_media"("product_id");

-- AddForeignKey
ALTER TABLE "product_media"
    ADD CONSTRAINT "product_media_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
