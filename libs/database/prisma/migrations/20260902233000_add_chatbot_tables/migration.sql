-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "mode" TEXT NOT NULL DEFAULT 'bot',
    "handoff_state" TEXT NOT NULL DEFAULT 'none',
    "consecutive_handoffs" INTEGER NOT NULL DEFAULT 0,
    "assigned_agent_id" TEXT,
    "handoff_at" TIMESTAMP(3),
    "handoff_by" TEXT,
    "last_user_message_at" TIMESTAMP(3),
    "last_agent_message_at" TIMESTAMP(3),
    "unread_count_agent" INTEGER NOT NULL DEFAULT 0,
    "current_program_name" TEXT,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "meta_data" JSONB,
    "system_prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "external_id" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL DEFAULT 'text',
    "media_url" TEXT,
    "mime_type" TEXT,
    "file_name" TEXT,
    "caption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "username" TEXT,
    "password_hash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'agent',
    "last_login_at" TIMESTAMP(3),
    "calendar_link" TEXT,
    "picture" TEXT,
    "description" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_quick_replies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_funnel_users" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "name" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'whatsapp',
    "show_terms" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL DEFAULT 'AWARENESS',
    "user_category" TEXT NOT NULL DEFAULT 'first_contact',
    "campaign_id" TEXT,
    "ad_id" TEXT,
    "utm_source" TEXT,
    "current_funnel_id" TEXT,
    "assigned_agent" TEXT,
    "session" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_funnel_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_leads" (
    "id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mother_last_name" TEXT,
    "father_last_name" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "product_interest" TEXT,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "platform" TEXT NOT NULL DEFAULT 'whatsapp',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_context_data" (
    "id" TEXT NOT NULL,
    "original_id" TEXT NOT NULL,
    "full_text_content" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_context_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_token_blacklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_token_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_conversations_phone_number_status_idx" ON "chat_conversations"("phone_number", "status");

-- CreateIndex
CREATE INDEX "chat_conversations_assigned_agent_id_mode_status_idx" ON "chat_conversations"("assigned_agent_id", "mode", "status");

-- CreateIndex
CREATE INDEX "chat_conversations_last_user_message_at_idx" ON "chat_conversations"("last_user_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_external_id_key" ON "chat_messages"("external_id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_timestamp_idx" ON "chat_messages"("conversation_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "chat_agents_email_key" ON "chat_agents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "chat_agents_username_key" ON "chat_agents"("username");

-- CreateIndex
CREATE INDEX "chat_agents_status_idx" ON "chat_agents"("status");

-- CreateIndex
CREATE INDEX "chat_quick_replies_title_idx" ON "chat_quick_replies"("title");

-- CreateIndex
CREATE UNIQUE INDEX "chat_funnel_users_sender_id_key" ON "chat_funnel_users"("sender_id");

-- CreateIndex
CREATE INDEX "chat_funnel_users_sender_id_idx" ON "chat_funnel_users"("sender_id");

-- CreateIndex
CREATE INDEX "chat_funnel_users_stage_idx" ON "chat_funnel_users"("stage");

-- CreateIndex
CREATE INDEX "chat_leads_whatsapp_idx" ON "chat_leads"("whatsapp");

-- CreateIndex
CREATE INDEX "chat_leads_email_idx" ON "chat_leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "chat_context_data_original_id_key" ON "chat_context_data"("original_id");

-- CreateIndex
CREATE INDEX "chat_context_data_product_name_idx" ON "chat_context_data"("product_name");

-- CreateIndex
CREATE UNIQUE INDEX "chat_token_blacklist_token_key" ON "chat_token_blacklist"("token");

-- CreateIndex
CREATE INDEX "chat_token_blacklist_expires_at_idx" ON "chat_token_blacklist"("expires_at");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "chat_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
