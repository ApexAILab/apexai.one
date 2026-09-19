-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "apex_v2";

-- CreateTable
CREATE TABLE "apex_v2"."users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameNormalized" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apex_v2"."sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apex_v2"."thoughts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thoughts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apex_v2"."tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apex_v2"."thought_tags" (
    "thoughtId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "thought_tags_pkey" PRIMARY KEY ("thoughtId","tagId")
);

-- CreateTable
CREATE TABLE "apex_v2"."image_assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "thoughtId" TEXT,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apex_v2"."rate_limit_buckets" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_usernameNormalized_key" ON "apex_v2"."users"("usernameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "apex_v2"."sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "apex_v2"."sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "apex_v2"."sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "thoughts_userId_occurredAt_idx" ON "apex_v2"."thoughts"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "tags_userId_name_idx" ON "apex_v2"."tags"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_normalizedName_key" ON "apex_v2"."tags"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "thought_tags_tagId_idx" ON "apex_v2"."thought_tags"("tagId");

-- CreateIndex
CREATE INDEX "image_assets_userId_createdAt_idx" ON "apex_v2"."image_assets"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "image_assets_thoughtId_sortOrder_idx" ON "apex_v2"."image_assets"("thoughtId", "sortOrder");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_updatedAt_idx" ON "apex_v2"."rate_limit_buckets"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_buckets_keyHash_action_key" ON "apex_v2"."rate_limit_buckets"("keyHash", "action");

-- AddForeignKey
ALTER TABLE "apex_v2"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "apex_v2"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apex_v2"."thoughts" ADD CONSTRAINT "thoughts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "apex_v2"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apex_v2"."tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "apex_v2"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apex_v2"."thought_tags" ADD CONSTRAINT "thought_tags_thoughtId_fkey" FOREIGN KEY ("thoughtId") REFERENCES "apex_v2"."thoughts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apex_v2"."thought_tags" ADD CONSTRAINT "thought_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "apex_v2"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apex_v2"."image_assets" ADD CONSTRAINT "image_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "apex_v2"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apex_v2"."image_assets" ADD CONSTRAINT "image_assets_thoughtId_fkey" FOREIGN KEY ("thoughtId") REFERENCES "apex_v2"."thoughts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
