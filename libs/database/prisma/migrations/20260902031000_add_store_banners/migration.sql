-- CreateTable
CREATE TABLE "store_banners" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(50) NOT NULL DEFAULT 'default',
    "image_url" VARCHAR(500) NOT NULL,
    "href" VARCHAR(500) NOT NULL DEFAULT '/',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "creation_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_banners_slug_is_active_sort_order_idx" ON "store_banners"("slug", "is_active", "sort_order");
