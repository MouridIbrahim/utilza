-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "implementation" TEXT NOT NULL DEFAULT 'frontend',
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY['web', 'mobile']::TEXT[],
ADD COLUMN     "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresFile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportsOffline" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Tool_implementation_isActive_idx" ON "Tool"("implementation", "isActive");
