-- CreateTable
CREATE TABLE "mind_record_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ideaId" TEXT,
    "groupId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mind_record_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mind_record_events_userId_createdAt_idx" ON "mind_record_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "mind_record_events_userId_groupId_order_idx" ON "mind_record_events"("userId", "groupId", "order");

-- AddForeignKey
ALTER TABLE "mind_record_events" ADD CONSTRAINT "mind_record_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mind_record_events" ADD CONSTRAINT "mind_record_events_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "mind_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
