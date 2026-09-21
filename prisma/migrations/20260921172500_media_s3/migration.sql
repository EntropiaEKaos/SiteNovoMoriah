ALTER TABLE "Media" ADD COLUMN "storageKey" TEXT, ADD COLUMN "mimeType" TEXT, ADD COLUMN "sizeBytes" INTEGER, ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'EXTERNAL';
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");
