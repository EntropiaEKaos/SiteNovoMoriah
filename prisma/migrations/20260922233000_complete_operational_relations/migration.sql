-- Preflight: fail with a clear error if legacy rows would violate the new operational foreign keys.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "HousekeepingTask" h WHERE h."bookingId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "BookingLead" b WHERE b."id"=h."bookingId")) THEN
    RAISE EXCEPTION 'Orphan HousekeepingTask.bookingId detected; repair data before deploying migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "RestaurantOrder" o WHERE o."bookingId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "BookingLead" b WHERE b."id"=o."bookingId")) THEN
    RAISE EXCEPTION 'Orphan RestaurantOrder.bookingId detected; repair data before deploying migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "RestaurantRoomCharge" c WHERE NOT EXISTS (SELECT 1 FROM "BookingLead" b WHERE b."id"=c."bookingId")) THEN
    RAISE EXCEPTION 'Orphan RestaurantRoomCharge.bookingId detected; repair data before deploying migration';
  END IF;
END $$;

CREATE INDEX "BookingLead_guestId_idx" ON "BookingLead"("guestId");
CREATE INDEX "HousekeepingTask_bookingId_idx" ON "HousekeepingTask"("bookingId");
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantRoomCharge" ADD CONSTRAINT "RestaurantRoomCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;