ALTER TABLE "RoulettePrize"
ADD COLUMN "mystery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "jackpot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "costCents" INTEGER,
ADD COLUMN "availableFrom" TEXT,
ADD COLUMN "availableUntil" TEXT,
ADD COLUMN "redemptionCta" TEXT;

ALTER TABLE "RouletteSpin"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEB',
ADD COLUMN "conversionCents" INTEGER,
ADD COLUMN "convertedAt" TIMESTAMP(3);

CREATE INDEX "RouletteSpin_convertedAt_createdAt_idx" ON "RouletteSpin"("convertedAt","createdAt");
