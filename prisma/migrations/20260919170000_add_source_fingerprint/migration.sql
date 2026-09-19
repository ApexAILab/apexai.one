ALTER TABLE "apex_v2"."thoughts"
ADD COLUMN "sourceFingerprint" TEXT;

CREATE UNIQUE INDEX "thoughts_userId_sourceFingerprint_key"
ON "apex_v2"."thoughts"("userId", "sourceFingerprint");
