-- AlterTable
ALTER TABLE "ToolHistory" ADD COLUMN     "executionType" VARCHAR(16),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" VARCHAR(32) NOT NULL DEFAULT 'completed';

-- CreateTable
CREATE TABLE "GeneratedFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "toolId" TEXT,
    "toolSlug" VARCHAR(100),
    "storageKey" VARCHAR(512) NOT NULL,
    "originalName" VARCHAR(255),
    "mimeType" VARCHAR(128),
    "size" INTEGER NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedFile_storageKey_key" ON "GeneratedFile"("storageKey");

-- CreateIndex
CREATE INDEX "GeneratedFile_userId_idx" ON "GeneratedFile"("userId");

-- CreateIndex
CREATE INDEX "GeneratedFile_expiresAt_idx" ON "GeneratedFile"("expiresAt");

-- CreateIndex
CREATE INDEX "GeneratedFile_toolSlug_idx" ON "GeneratedFile"("toolSlug");
