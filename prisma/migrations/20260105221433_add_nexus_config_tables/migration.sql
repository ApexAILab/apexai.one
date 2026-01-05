-- CreateTable
CREATE TABLE "nexus_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nexus_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nexus_models" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createPath" TEXT NOT NULL,
    "queryPath" TEXT NOT NULL,
    "paths" JSONB NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nexus_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nexus_credentials_userId_idx" ON "nexus_credentials"("userId");

-- CreateIndex
CREATE INDEX "nexus_models_userId_idx" ON "nexus_models"("userId");

-- CreateIndex
CREATE INDEX "nexus_models_credentialId_idx" ON "nexus_models"("credentialId");

-- AddForeignKey
ALTER TABLE "nexus_credentials" ADD CONSTRAINT "nexus_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_models" ADD CONSTRAINT "nexus_models_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nexus_models" ADD CONSTRAINT "nexus_models_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "nexus_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

