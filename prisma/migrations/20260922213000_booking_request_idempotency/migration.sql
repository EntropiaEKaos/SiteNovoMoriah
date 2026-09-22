ALTER TABLE "BookingLead" ADD COLUMN "publicRequestToken" TEXT;
CREATE UNIQUE INDEX "BookingLead_publicRequestToken_key" ON "BookingLead"("publicRequestToken");
