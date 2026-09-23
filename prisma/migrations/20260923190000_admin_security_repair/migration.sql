CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminLoginAttempt" (
  "id" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_actorId_createdAt_idx"
  ON "AdminAuditLog"("actorId","createdAt");

CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_createdAt_idx"
  ON "AdminAuditLog"("action","createdAt");

CREATE INDEX IF NOT EXISTS "AdminLoginAttempt_keyHash_createdAt_idx"
  ON "AdminLoginAttempt"("keyHash","createdAt");

CREATE INDEX IF NOT EXISTS "AdminLoginAttempt_createdAt_idx"
  ON "AdminLoginAttempt"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AdminAuditLog_actorId_fkey'
  ) THEN
    ALTER TABLE "AdminAuditLog"
      ADD CONSTRAINT "AdminAuditLog_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
