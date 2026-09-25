ALTER TABLE "RestaurantCategory" ADD COLUMN "targetCmvPct" DOUBLE PRECISION;
ALTER TABLE "RestaurantProduct" ADD COLUMN "targetCmvPct" DOUBLE PRECISION;
ALTER TABLE "RestaurantIngredient"
  ADD COLUMN "purchaseUnit" TEXT,
  ADD COLUMN "purchaseToStockFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "targetDaysCover" INTEGER NOT NULL DEFAULT 7;

CREATE TABLE "RestaurantSupplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "contactName" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantSupplier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RestaurantSupplier_active_name_idx" ON "RestaurantSupplier"("active","name");

CREATE TABLE "RestaurantPurchase" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT,
  "invoiceNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantPurchase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RestaurantPurchase_supplierId_purchasedAt_idx" ON "RestaurantPurchase"("supplierId","purchasedAt");
CREATE INDEX "RestaurantPurchase_status_purchasedAt_idx" ON "RestaurantPurchase"("status","purchasedAt");
ALTER TABLE "RestaurantPurchase" ADD CONSTRAINT "RestaurantPurchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "RestaurantSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RestaurantPurchaseItem" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "purchaseQty" DOUBLE PRECISION NOT NULL,
  "purchaseUnit" TEXT NOT NULL,
  "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "stockQtyAdded" DOUBLE PRECISION NOT NULL,
  "unitPurchaseCostCents" INTEGER NOT NULL,
  "unitStockCostCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "lotCode" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantPurchaseItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RestaurantPurchaseItem_ingredientId_createdAt_idx" ON "RestaurantPurchaseItem"("ingredientId","createdAt");
CREATE INDEX "RestaurantPurchaseItem_expiresAt_idx" ON "RestaurantPurchaseItem"("expiresAt");
ALTER TABLE "RestaurantPurchaseItem" ADD CONSTRAINT "RestaurantPurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "RestaurantPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantPurchaseItem" ADD CONSTRAINT "RestaurantPurchaseItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "RestaurantIngredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RestaurantInventoryCount" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorName" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantInventoryCount_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RestaurantInventoryCount_countedAt_status_idx" ON "RestaurantInventoryCount"("countedAt","status");

CREATE TABLE "RestaurantInventoryCountItem" (
  "id" TEXT NOT NULL,
  "countId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "systemQty" DOUBLE PRECISION NOT NULL,
  "countedQty" DOUBLE PRECISION NOT NULL,
  "varianceQty" DOUBLE PRECISION NOT NULL,
  "varianceCostCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantInventoryCountItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RestaurantInventoryCountItem_ingredientId_createdAt_idx" ON "RestaurantInventoryCountItem"("ingredientId","createdAt");
ALTER TABLE "RestaurantInventoryCountItem" ADD CONSTRAINT "RestaurantInventoryCountItem_countId_fkey" FOREIGN KEY ("countId") REFERENCES "RestaurantInventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantInventoryCountItem" ADD CONSTRAINT "RestaurantInventoryCountItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "RestaurantIngredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
