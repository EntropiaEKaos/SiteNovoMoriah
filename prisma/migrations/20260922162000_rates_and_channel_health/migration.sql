ALTER TABLE "ChannelIntegration" ADD COLUMN "lastAttemptAt" TIMESTAMP(3), ADD COLUMN "lastSuccessAt" TIMESTAMP(3), ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'IDLE';

CREATE TABLE "RatePlan" (
 "id" TEXT NOT NULL,
 "accommodationId" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "currency" TEXT NOT NULL DEFAULT 'BRL',
 "basePriceCents" INTEGER NOT NULL,
 "minNights" INTEGER NOT NULL DEFAULT 1,
 "maxNights" INTEGER,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RateOverride" (
 "id" TEXT NOT NULL,
 "ratePlanId" TEXT NOT NULL,
 "startsAt" TIMESTAMP(3) NOT NULL,
 "endsAt" TIMESTAMP(3) NOT NULL,
 "priceCents" INTEGER NOT NULL,
 "minNights" INTEGER,
 "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
 "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RateOverride_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RatePlan_accommodationId_active_idx" ON "RatePlan"("accommodationId","active");
CREATE INDEX "RateOverride_ratePlanId_startsAt_endsAt_idx" ON "RateOverride"("ratePlanId","startsAt","endsAt");
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RateOverride" ADD CONSTRAINT "RateOverride_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
