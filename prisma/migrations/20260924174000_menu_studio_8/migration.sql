ALTER TABLE "RestaurantCategory"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "availableFrom" TEXT,
  ADD COLUMN IF NOT EXISTS "availableUntil" TEXT,
  ADD COLUMN IF NOT EXISTS "availableDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "RestaurantProduct"
  ADD COLUMN IF NOT EXISTS "promotionalPriceCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "soldOut" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "badge" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "prepMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxPerOrder" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "allowNotes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "availableFrom" TEXT,
  ADD COLUMN IF NOT EXISTS "availableUntil" TEXT,
  ADD COLUMN IF NOT EXISTS "availableDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "RestaurantOrderItem"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "RestaurantSettings"
  ADD COLUMN IF NOT EXISTS "menuTitle" TEXT NOT NULL DEFAULT 'Moriah Food',
  ADD COLUMN IF NOT EXISTS "menuSubtitle" TEXT,
  ADD COLUMN IF NOT EXISTS "menuBannerUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "showSoldOut" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "RestaurantCategory_active_sortOrder_idx"
  ON "RestaurantCategory"("active","sortOrder");

CREATE INDEX IF NOT EXISTS "RestaurantProduct_categoryId_active_sortOrder_idx"
  ON "RestaurantProduct"("categoryId","active","sortOrder");

CREATE INDEX IF NOT EXISTS "RestaurantProduct_featured_active_idx"
  ON "RestaurantProduct"("featured","active");
