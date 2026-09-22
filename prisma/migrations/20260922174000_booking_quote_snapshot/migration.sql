ALTER TABLE "BookingLead" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'SITE',
ADD COLUMN "quotedTotalCents" INTEGER,
ADD COLUMN "quotedCurrency" TEXT,
ADD COLUMN "quotedRatePlan" TEXT,
ADD COLUMN "quoteSnapshot" JSONB,
ADD COLUMN "quotedAt" TIMESTAMP(3);
