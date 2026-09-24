-- Moriah Kitchen 4.0
CREATE TABLE "RestaurantStation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#0b607a',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "targetMinutes" INTEGER NOT NULL DEFAULT 15,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantStation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RestaurantStation_code_key" ON "RestaurantStation"("code");
CREATE INDEX "RestaurantStation_active_sortOrder_idx" ON "RestaurantStation"("active","sortOrder");

ALTER TABLE "RestaurantProduct"
  ADD COLUMN "stationId" TEXT,
  ADD COLUMN "pauseUntil" TIMESTAMP(3),
  ADD COLUMN "priorityWeight" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "kitchenInstructions" TEXT,
  ADD COLUMN "platingNotes" TEXT;

ALTER TABLE "RestaurantOrder"
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEB',
  ADD COLUMN "expeditionStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "estimatedReadyAt" TIMESTAMP(3),
  ADD COLUMN "pausedAt" TIMESTAMP(3),
  ADD COLUMN "pauseReason" TEXT;

ALTER TABLE "RestaurantOrderItem"
  ADD COLUMN "stationId" TEXT,
  ADD COLUMN "kitchenInstructionsSnapshot" TEXT,
  ADD COLUMN "kitchenStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "readyAt" TIMESTAMP(3);

ALTER TABLE "RestaurantSettings"
  ADD COLUMN "kitchenWarningMinutes" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "kitchenCriticalMinutes" INTEGER NOT NULL DEFAULT 35,
  ADD COLUMN "stationMode" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "expeditionEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "autoReadyOrder" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "RestaurantKitchenEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "itemId" TEXT,
  "eventType" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "notes" TEXT,
  "actorId" TEXT,
  "actorName" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantKitchenEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestaurantProductionBatch" (
  "id" TEXT NOT NULL,
  "stationId" TEXT,
  "productId" TEXT,
  "ingredientId" TEXT,
  "label" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "producedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "actorName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantProductionBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RestaurantProduct_stationId_active_idx" ON "RestaurantProduct"("stationId","active");
CREATE INDEX "RestaurantProduct_pauseUntil_idx" ON "RestaurantProduct"("pauseUntil");
CREATE INDEX "RestaurantOrder_priority_status_createdAt_idx" ON "RestaurantOrder"("priority","status","createdAt");
CREATE INDEX "RestaurantOrder_expeditionStatus_status_idx" ON "RestaurantOrder"("expeditionStatus","status");
CREATE INDEX "RestaurantOrderItem_stationId_kitchenStatus_idx" ON "RestaurantOrderItem"("stationId","kitchenStatus");
CREATE INDEX "RestaurantOrderItem_orderId_kitchenStatus_idx" ON "RestaurantOrderItem"("orderId","kitchenStatus");
CREATE INDEX "RestaurantKitchenEvent_orderId_createdAt_idx" ON "RestaurantKitchenEvent"("orderId","createdAt");
CREATE INDEX "RestaurantKitchenEvent_itemId_createdAt_idx" ON "RestaurantKitchenEvent"("itemId","createdAt");
CREATE INDEX "RestaurantKitchenEvent_eventType_createdAt_idx" ON "RestaurantKitchenEvent"("eventType","createdAt");
CREATE INDEX "RestaurantProductionBatch_status_producedAt_idx" ON "RestaurantProductionBatch"("status","producedAt");
CREATE INDEX "RestaurantProductionBatch_stationId_status_idx" ON "RestaurantProductionBatch"("stationId","status");
CREATE INDEX "RestaurantProductionBatch_productId_status_idx" ON "RestaurantProductionBatch"("productId","status");
CREATE INDEX "RestaurantProductionBatch_ingredientId_status_idx" ON "RestaurantProductionBatch"("ingredientId","status");

ALTER TABLE "RestaurantProduct" ADD CONSTRAINT "RestaurantProduct_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "RestaurantStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "RestaurantStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantKitchenEvent" ADD CONSTRAINT "RestaurantKitchenEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantKitchenEvent" ADD CONSTRAINT "RestaurantKitchenEvent_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "RestaurantOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantProductionBatch" ADD CONSTRAINT "RestaurantProductionBatch_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "RestaurantStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantProductionBatch" ADD CONSTRAINT "RestaurantProductionBatch_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "RestaurantProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RestaurantProductionBatch" ADD CONSTRAINT "RestaurantProductionBatch_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "RestaurantIngredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
