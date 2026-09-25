ALTER TABLE "RouletteSettings"
ADD COLUMN "themeMode" TEXT NOT NULL DEFAULT 'AUTO_EVENT',
ADD COLUMN "themePreset" TEXT NOT NULL DEFAULT 'CELEBRATION',
ADD COLUMN "themePrimaryColor" TEXT NOT NULL DEFAULT '#0B607A',
ADD COLUMN "themeSecondaryColor" TEXT NOT NULL DEFAULT '#073B4C',
ADD COLUMN "themeAccentColor" TEXT NOT NULL DEFAULT '#FFC845',
ADD COLUMN "themeSurfaceColor" TEXT NOT NULL DEFAULT '#FFFFFF',
ADD COLUMN "themeTextColor" TEXT NOT NULL DEFAULT '#16333D',
ADD COLUMN "themeBackgroundImageUrl" TEXT,
ADD COLUMN "animationStyle" TEXT NOT NULL DEFAULT 'CONFETTI',
ADD COLUMN "showEventBanner" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "MoriahEvent" (
"id" TEXT NOT NULL,"slug" TEXT NOT NULL,"title" TEXT NOT NULL,"eyebrow" TEXT,"summary" TEXT,"description" TEXT NOT NULL,
"category" TEXT NOT NULL DEFAULT 'EVENTO',"venue" TEXT,"address" TEXT,"startsAt" TIMESTAMP(3) NOT NULL,"endsAt" TIMESTAMP(3),
"coverImage" TEXT,"galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],"badge" TEXT,"ctaLabel" TEXT,"ctaHref" TEXT,"priceLabel" TEXT,
"featured" BOOLEAN NOT NULL DEFAULT false,"published" BOOLEAN NOT NULL DEFAULT false,"showOnHome" BOOLEAN NOT NULL DEFAULT true,
"sortOrder" INTEGER NOT NULL DEFAULT 100,"themePreset" TEXT NOT NULL DEFAULT 'CELEBRATION',"themePrimaryColor" TEXT NOT NULL DEFAULT '#0B607A',
"themeSecondaryColor" TEXT NOT NULL DEFAULT '#073B4C',"themeAccentColor" TEXT NOT NULL DEFAULT '#FFC845',"themeBackgroundColor" TEXT NOT NULL DEFAULT '#081F29',
"themeTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',"rouletteThemeEnabled" BOOLEAN NOT NULL DEFAULT false,"rouletteThemeStartsAt" TIMESTAMP(3),
"rouletteThemeEndsAt" TIMESTAMP(3),"rouletteBackgroundImage" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "MoriahEvent_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "MoriahEvent_slug_key" ON "MoriahEvent"("slug");
CREATE INDEX "MoriahEvent_published_startsAt_idx" ON "MoriahEvent"("published","startsAt");
CREATE INDEX "MoriahEvent_featured_published_startsAt_idx" ON "MoriahEvent"("featured","published","startsAt");
CREATE INDEX "MoriahEvent_showOnHome_published_startsAt_idx" ON "MoriahEvent"("showOnHome","published","startsAt");
CREATE INDEX "MoriahEvent_rouletteThemeEnabled_startsAt_idx" ON "MoriahEvent"("rouletteThemeEnabled","startsAt");
