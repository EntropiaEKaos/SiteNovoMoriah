ALTER TABLE "Guest"
  ADD COLUMN IF NOT EXISTS "monthlyGuest" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "employee" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'INTERNAL';

CREATE TABLE IF NOT EXISTS "BookingCharge" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'CHECKIN_EXTRA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingCharge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingCharge_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "BookingLead"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BookingCharge_bookingId_createdAt_idx"
  ON "BookingCharge"("bookingId","createdAt");
