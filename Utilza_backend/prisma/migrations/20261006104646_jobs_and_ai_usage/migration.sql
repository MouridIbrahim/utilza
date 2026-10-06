-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'queued',
    "userId" TEXT,
    "input" JSONB,
    "output" JSONB,
    "error" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_userId_idx" ON "Job"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_userId_month_key" ON "AiUsage"("userId", "month");
