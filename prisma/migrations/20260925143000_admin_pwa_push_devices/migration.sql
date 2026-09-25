CREATE TABLE IF NOT EXISTS "AdminPushDevice" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "deviceName" TEXT,
  "platform" TEXT,
  "userAgent" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminPushDevice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminPushDevice_adminUserId_fkey"
    FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminPushDevice_token_key"
  ON "AdminPushDevice"("token");

CREATE INDEX IF NOT EXISTS "AdminPushDevice_adminUserId_active_idx"
  ON "AdminPushDevice"("adminUserId","active");

CREATE INDEX IF NOT EXISTS "AdminPushDevice_active_lastSeenAt_idx"
  ON "AdminPushDevice"("active","lastSeenAt");
