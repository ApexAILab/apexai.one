-- Table for ApexMind chat session summaries (for RAG)
CREATE TABLE IF NOT EXISTS "mind_chat_summaries" (
  "id"        TEXT PRIMARY KEY,
  "sessionId" TEXT UNIQUE NOT NULL,
  "userId"    TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "embedding" BYTEA,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT "mind_chat_summaries_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "mind_chat_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mind_chat_summaries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mind_chat_summaries_userId_createdAt_idx"
  ON "mind_chat_summaries"("userId", "createdAt");

-- Add chatSummaryPrompt column to mind_settings
ALTER TABLE "mind_settings"
ADD COLUMN IF NOT EXISTS "chatSummaryPrompt" TEXT;

