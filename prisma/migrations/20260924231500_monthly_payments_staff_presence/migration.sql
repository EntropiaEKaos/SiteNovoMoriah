ALTER TABLE "AdminUser"
  ADD COLUMN "onDuty" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "onDutySince" TIMESTAMP(3);

ALTER TABLE "Guest"
  ADD COLUMN "monthlyPaymentDueAt" TIMESTAMP(3),
  ADD COLUMN "monthlyPaymentLastPaidAt" TIMESTAMP(3);

ALTER TABLE "NotificationMessage"
  ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "NotificationMessage_dedupeKey_key"
  ON "NotificationMessage"("dedupeKey");

CREATE INDEX "Guest_monthlyGuest_monthlyPaymentDueAt_idx"
  ON "Guest"("monthlyGuest","monthlyPaymentDueAt");
