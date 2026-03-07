-- Add chatWeight and useChatContexts to mind_settings for ApexMind RAG configuration
ALTER TABLE "mind_settings"
ADD COLUMN IF NOT EXISTS "chatWeight" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "useChatContexts" BOOLEAN DEFAULT TRUE;

