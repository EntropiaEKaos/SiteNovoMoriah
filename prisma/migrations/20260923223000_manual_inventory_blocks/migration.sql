CREATE TABLE IF NOT EXISTS "ManualInventoryBlock" (
  "id" TEXT NOT NULL,
  "accommodationId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualInventoryBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ManualInventoryBlock_accommodationId_fkey"
    FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ManualInventoryBlock_accommodationId_startsAt_endsAt_idx"
  ON "ManualInventoryBlock"("accommodationId","startsAt","endsAt");
