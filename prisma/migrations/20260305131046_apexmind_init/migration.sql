-- CreateTable
CREATE TABLE "mind_ideas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "imageUrls" TEXT[],
    "sourceMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mind_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mind_idea_embeddings" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "embedding" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mind_idea_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mind_chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "title" TEXT,
    "meta" JSONB,

    CONSTRAINT "mind_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mind_chat_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mind_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mind_chat_message_embeddings" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "embedding" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mind_chat_message_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mind_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mind_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mind_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "baseUrl" TEXT,
    "chatModel" TEXT,
    "embeddingModel" TEXT,
    "systemPrompt" TEXT,
    "ragTopK" INTEGER,
    "ragTimeWindowDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mind_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mind_ideas_userId_createdAt_idx" ON "mind_ideas"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mind_idea_embeddings_ideaId_key" ON "mind_idea_embeddings"("ideaId");

-- CreateIndex
CREATE INDEX "mind_chat_sessions_userId_startedAt_idx" ON "mind_chat_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "mind_chat_messages_userId_createdAt_idx" ON "mind_chat_messages"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mind_chat_message_embeddings_messageId_key" ON "mind_chat_message_embeddings"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "mind_drafts_userId_key" ON "mind_drafts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mind_settings_userId_key" ON "mind_settings"("userId");

-- AddForeignKey
ALTER TABLE "mind_ideas" ADD CONSTRAINT "mind_ideas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mind_idea_embeddings" ADD CONSTRAINT "mind_idea_embeddings_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "mind_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mind_chat_sessions" ADD CONSTRAINT "mind_chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mind_chat_messages" ADD CONSTRAINT "mind_chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mind_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mind_chat_messages" ADD CONSTRAINT "mind_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mind_chat_message_embeddings" ADD CONSTRAINT "mind_chat_message_embeddings_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "mind_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mind_drafts" ADD CONSTRAINT "mind_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mind_settings" ADD CONSTRAINT "mind_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
