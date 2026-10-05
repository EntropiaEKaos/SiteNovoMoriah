CREATE TABLE "RestaurantProductImageCandidate" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "negativePrompt" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'PENDING',
  "providerJobId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "imageUrl" TEXT,
  "storageKey" TEXT,
  "errorMessage" TEXT,
  "createdBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantProductImageCandidate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RestaurantProductImageCandidate_productId_status_createdAt_idx"
  ON "RestaurantProductImageCandidate"("productId","status","createdAt");
CREATE INDEX "RestaurantProductImageCandidate_status_createdAt_idx"
  ON "RestaurantProductImageCandidate"("status","createdAt");
ALTER TABLE "RestaurantProductImageCandidate"
  ADD CONSTRAINT "RestaurantProductImageCandidate_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "RestaurantProduct"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
