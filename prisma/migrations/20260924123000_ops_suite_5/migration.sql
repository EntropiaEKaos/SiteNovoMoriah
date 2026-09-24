ALTER TABLE "Media"
  ADD COLUMN IF NOT EXISTS "label" TEXT,
  ADD COLUMN IF NOT EXISTS "folder" TEXT,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Media_folder_sortOrder_createdAt_idx"
  ON "Media"("folder","sortOrder","createdAt");

ALTER TABLE "BookingLead"
  ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;

ALTER TABLE "Guest"
  ADD COLUMN IF NOT EXISTS "documentType" TEXT,
  ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nationality" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT,
  ADD COLUMN IF NOT EXISTS "preferences" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;

CREATE INDEX IF NOT EXISTS "Guest_document_idx"
  ON "Guest"("document");

CREATE TABLE IF NOT EXISTS "BookingCompanion" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "birthDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingCompanion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingCompanion_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "BookingLead"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BookingCompanion_bookingId_idx"
  ON "BookingCompanion"("bookingId");
