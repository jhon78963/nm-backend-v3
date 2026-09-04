-- CreateTable
CREATE TABLE "ecommerce_newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "source" VARCHAR(50) NOT NULL DEFAULT 'footer',
    "customer_id" TEXT,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecommerce_newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_newsletter_campaigns" (
    "id" TEXT NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "preview_text" VARCHAR(255),
    "cta_url" VARCHAR(500),
    "cta_label" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecommerce_newsletter_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_newsletter_subscribers_email_key" ON "ecommerce_newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "ecommerce_newsletter_subscribers_status_idx" ON "ecommerce_newsletter_subscribers"("status");

-- CreateIndex
CREATE INDEX "ecommerce_newsletter_subscribers_subscribed_at_idx" ON "ecommerce_newsletter_subscribers"("subscribed_at");

-- CreateIndex
CREATE INDEX "ecommerce_newsletter_campaigns_status_created_at_idx" ON "ecommerce_newsletter_campaigns"("status", "created_at");

-- AddForeignKey
ALTER TABLE "ecommerce_newsletter_subscribers" ADD CONSTRAINT "ecommerce_newsletter_subscribers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "ecommerce_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
