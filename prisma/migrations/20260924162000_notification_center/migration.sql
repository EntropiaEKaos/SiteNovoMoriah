CREATE TABLE IF NOT EXISTS "NotificationMessage" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'INTERNAL',
  "recipient" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationMessage_status_createdAt_idx"
  ON "NotificationMessage"("status","createdAt");

CREATE INDEX IF NOT EXISTS "NotificationMessage_channel_createdAt_idx"
  ON "NotificationMessage"("channel","createdAt");
