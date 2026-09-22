ALTER TABLE "ChannelIntegration"
ADD COLUMN "etag" TEXT,
ADD COLUMN "lastModified" TEXT,
ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextSyncAt" TIMESTAMP(3),
ADD COLUMN "syncDurationMs" INTEGER;
CREATE INDEX "ChannelIntegration_nextSyncAt_idx" ON "ChannelIntegration"("nextSyncAt");
