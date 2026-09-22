CREATE TABLE "InventoryHold" (
    "id" TEXT NOT NULL,
    "accommodationId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryHold_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryHold_token_key" ON "InventoryHold"("token");
CREATE INDEX "InventoryHold_accommodationId_checkIn_checkOut_idx" ON "InventoryHold"("accommodationId","checkIn","checkOut");
CREATE INDEX "InventoryHold_expiresAt_idx" ON "InventoryHold"("expiresAt");
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
