CREATE TABLE "RouletteSettings" (
  "id" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "campaignKey" TEXT NOT NULL DEFAULT 'moriah-1',
  "title" TEXT NOT NULL DEFAULT 'Roleta da Sorte Moriah',
  "subtitle" TEXT NOT NULL DEFAULT 'Cadastre-se e descubra seu prêmio.',
  "introText" TEXT NOT NULL DEFAULT 'Sua participação é independente de avaliações. Se quiser, compartilhe sua experiência no Google.',
  "googleReviewUrl" TEXT,
  "googleReviewLabel" TEXT NOT NULL DEFAULT 'Avaliar a Moriah no Google',
  "termsText" TEXT NOT NULL DEFAULT 'Ao participar, você autoriza o uso do nome e telefone apenas para administrar esta promoção e validar a entrega do prêmio.',
  "activeFrom" TIMESTAMP(3),
  "activeUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RouletteSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoulettePrize" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#FFC845',
  "textColor" TEXT NOT NULL DEFAULT '#1B252B',
  "weight" INTEGER NOT NULL DEFAULT 1,
  "quantityTotal" INTEGER,
  "awardedCount" INTEGER NOT NULL DEFAULT 0,
  "validityDays" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoulettePrize_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RouletteEntry" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "consentAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RouletteEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RouletteSpin" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "prizeId" TEXT NOT NULL,
  "claimCode" TEXT NOT NULL,
  "wheelSnapshot" JSONB NOT NULL,
  "resultSnapshot" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "redeemedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RouletteSpin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RouletteEntry_campaignKey_phone_key" ON "RouletteEntry"("campaignKey", "phone");
CREATE INDEX "RouletteEntry_createdAt_idx" ON "RouletteEntry"("createdAt");
CREATE INDEX "RoulettePrize_active_sortOrder_idx" ON "RoulettePrize"("active", "sortOrder");
CREATE UNIQUE INDEX "RouletteSpin_entryId_key" ON "RouletteSpin"("entryId");
CREATE UNIQUE INDEX "RouletteSpin_claimCode_key" ON "RouletteSpin"("claimCode");
CREATE INDEX "RouletteSpin_prizeId_createdAt_idx" ON "RouletteSpin"("prizeId", "createdAt");
CREATE INDEX "RouletteSpin_redeemedAt_createdAt_idx" ON "RouletteSpin"("redeemedAt", "createdAt");

ALTER TABLE "RouletteSpin"
ADD CONSTRAINT "RouletteSpin_entryId_fkey"
FOREIGN KEY ("entryId") REFERENCES "RouletteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RouletteSpin"
ADD CONSTRAINT "RouletteSpin_prizeId_fkey"
FOREIGN KEY ("prizeId") REFERENCES "RoulettePrize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "RouletteSettings" (
  "id","active","campaignKey","title","subtitle","introText","googleReviewLabel","termsText","updatedAt"
) VALUES (
  'main',false,'moriah-1','Roleta da Sorte Moriah','Cadastre-se e descubra seu prêmio.',
  'Sua participação é independente de avaliações. Se quiser, compartilhe sua experiência no Google.',
  'Avaliar a Moriah no Google',
  'Ao participar, você autoriza o uso do nome e telefone apenas para administrar esta promoção e validar a entrega do prêmio.',
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
