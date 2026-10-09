CREATE TABLE "SmoobuReservationInbox" (
 "id" TEXT NOT NULL,
 "externalId" INTEGER NOT NULL,
 "apartmentId" INTEGER,
 "accommodationId" TEXT,
 "arrival" TEXT,
 "departure" TEXT,
 "externalStatus" TEXT NOT NULL,
 "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
 "validationIssues" JSONB,
 "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastSeenAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SmoobuReservationInbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SmoobuReservationInbox_externalId_key" ON "SmoobuReservationInbox"("externalId");
CREATE INDEX "SmoobuReservationInbox_reviewStatus_lastSeenAt_idx" ON "SmoobuReservationInbox"("reviewStatus","lastSeenAt");
CREATE INDEX "SmoobuReservationInbox_apartmentId_idx" ON "SmoobuReservationInbox"("apartmentId");
