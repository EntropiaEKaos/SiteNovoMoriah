CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "passwordSalt" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
CREATE INDEX "AdminUser_active_role_idx" ON "AdminUser"("active","role");

-- Initial Super Admin. Only a scrypt hash/salt are stored; plaintext is never committed.
INSERT INTO "AdminUser" ("id","username","passwordHash","passwordSalt","role","active","mustChangePassword","updatedAt")
VALUES ('moriah-superadmin','superadmin','3a702feabd8e9e6f7ded9970bf5bd49b336adc5affa979698d1393c33299ee160106155bf474f8b8e5fe0fef1986f316c3ec7fb94a4c39611879465d1e6fc3cc','656d23df5ff12077e313dab5a04c142d','SUPER_ADMIN',true,true,CURRENT_TIMESTAMP)
ON CONFLICT ("username") DO NOTHING;
