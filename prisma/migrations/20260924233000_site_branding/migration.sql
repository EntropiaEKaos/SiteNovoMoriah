ALTER TABLE "SiteSettings"
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "logoLightUrl" TEXT,
  ADD COLUMN "faviconUrl" TEXT,
  ADD COLUMN "defaultBackgroundImageUrl" TEXT,
  ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#0b607a',
  ADD COLUMN "secondaryColor" TEXT NOT NULL DEFAULT '#073b4c',
  ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#ffc845',
  ADD COLUMN "backgroundColor" TEXT NOT NULL DEFAULT '#f4f7f8',
  ADD COLUMN "textColor" TEXT NOT NULL DEFAULT '#1b252b',
  ADD COLUMN "buttonColor" TEXT NOT NULL DEFAULT '#0b607a';
