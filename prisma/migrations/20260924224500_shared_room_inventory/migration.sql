ALTER TABLE "Accommodation"
  ADD COLUMN "sharedRoom" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bedCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "InventoryHold"
  ADD COLUMN "units" INTEGER NOT NULL DEFAULT 1;

UPDATE "Accommodation"
SET "sharedRoom" = true,
    "bedCount" = GREATEST("capacity", 1)
WHERE "type" = 'COMPARTILHADO';

UPDATE "Accommodation"
SET "bedCount" = GREATEST("capacity", 1)
WHERE "sharedRoom" = true AND "bedCount" < 1;
