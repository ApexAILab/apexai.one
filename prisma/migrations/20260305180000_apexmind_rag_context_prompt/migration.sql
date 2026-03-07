-- Add ragContextPrompt column for ApexMind settings
ALTER TABLE "mind_settings"
ADD COLUMN IF NOT EXISTS "ragContextPrompt" TEXT;

