ALTER TABLE "BookingLead" ADD COLUMN "accommodationId" TEXT;
ALTER TABLE "ChannelIntegration" ADD COLUMN "accommodationId" TEXT;
CREATE INDEX "BookingLead_accommodationId_idx" ON "BookingLead"("accommodationId");
CREATE INDEX "ChannelIntegration_accommodationId_idx" ON "ChannelIntegration"("accommodationId");
CREATE INDEX "ChannelBlock_integrationId_idx" ON "ChannelBlock"("integrationId");
ALTER TABLE "BookingLead" ADD CONSTRAINT "BookingLead_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChannelIntegration" ADD CONSTRAINT "ChannelIntegration_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChannelBlock" ADD CONSTRAINT "ChannelBlock_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "ChannelIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;