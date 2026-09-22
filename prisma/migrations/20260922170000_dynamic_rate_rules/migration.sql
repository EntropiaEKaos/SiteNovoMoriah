CREATE TABLE "RateRule" (
 "id" TEXT NOT NULL,"accommodationId" TEXT NOT NULL,"name" TEXT NOT NULL,
 "adjustmentType" TEXT NOT NULL DEFAULT 'PERCENT',"adjustmentValue" INTEGER NOT NULL,
 "minOccupancyPct" INTEGER,"maxOccupancyPct" INTEGER,"daysBeforeMin" INTEGER,"daysBeforeMax" INTEGER,
 "startsAt" TIMESTAMP(3),"endsAt" TIMESTAMP(3),"active" BOOLEAN NOT NULL DEFAULT true,
 "priority" INTEGER NOT NULL DEFAULT 100,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "RateRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RateRule_accommodationId_active_priority_idx" ON "RateRule"("accommodationId","active","priority");
ALTER TABLE "RateRule" ADD CONSTRAINT "RateRule_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
