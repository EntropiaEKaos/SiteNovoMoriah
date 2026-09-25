ALTER TABLE "NotificationMessage" ADD COLUMN "actionUrl" TEXT;

CREATE TABLE "AdminNotificationRead" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminNotificationRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminNotificationRead_adminUserId_notificationId_key"
ON "AdminNotificationRead"("adminUserId","notificationId");

CREATE INDEX "AdminNotificationRead_adminUserId_readAt_idx"
ON "AdminNotificationRead"("adminUserId","readAt");

CREATE INDEX "AdminNotificationRead_notificationId_idx"
ON "AdminNotificationRead"("notificationId");

ALTER TABLE "AdminNotificationRead"
ADD CONSTRAINT "AdminNotificationRead_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminNotificationRead"
ADD CONSTRAINT "AdminNotificationRead_notificationId_fkey"
FOREIGN KEY ("notificationId") REFERENCES "NotificationMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
