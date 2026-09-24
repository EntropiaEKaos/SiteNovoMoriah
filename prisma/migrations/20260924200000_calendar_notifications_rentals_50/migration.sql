-- Calendar Widget + Notification Rules + Rentals 5.0
CREATE TABLE "NotificationRule" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "channels" TEXT[] DEFAULT ARRAY['IN_APP']::TEXT[],
  "audience" TEXT NOT NULL DEFAULT 'INTERNAL',
  "advanceMinutes" INTEGER NOT NULL DEFAULT 0,
  "templateTitle" TEXT,
  "templateBody" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationRule_module_eventKey_key" ON "NotificationRule"("module","eventKey");
CREATE INDEX "NotificationRule_module_active_idx" ON "NotificationRule"("module","active");

CREATE TABLE "CalendarWidgetSettings" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "publicToken" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "title" TEXT NOT NULL DEFAULT 'Disponibilidade Moriah',
  "subtitle" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#0b607a',
  "accentColor" TEXT NOT NULL DEFAULT '#ffc845',
  "showPrices" BOOLEAN NOT NULL DEFAULT true,
  "allowBooking" BOOLEAN NOT NULL DEFAULT true,
  "compact" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarWidgetSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarWidgetSettings_publicToken_key" ON "CalendarWidgetSettings"("publicToken");

CREATE TABLE "RentalItem" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'BIKE',
  "description" TEXT,
  "imageUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "quantityTotal" INTEGER NOT NULL DEFAULT 1,
  "hourlyPriceCents" INTEGER,
  "dailyPriceCents" INTEGER,
  "depositCents" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RentalItem_active_sortOrder_idx" ON "RentalItem"("active","sortOrder");
CREATE INDEX "RentalItem_category_active_idx" ON "RentalItem"("category","active");

CREATE TABLE "RentalOrder" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "guestId" TEXT,
  "bookingId" TEXT,
  "renterName" TEXT NOT NULL,
  "phone" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "pricingMode" TEXT NOT NULL DEFAULT 'HOURLY',
  "unitPriceCents" INTEGER NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "returnedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "totalCents" INTEGER NOT NULL,
  "depositCents" INTEGER NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RentalOrder_itemId_status_startAt_dueAt_idx" ON "RentalOrder"("itemId","status","startAt","dueAt");
CREATE INDEX "RentalOrder_bookingId_status_idx" ON "RentalOrder"("bookingId","status");
CREATE INDEX "RentalOrder_guestId_status_idx" ON "RentalOrder"("guestId","status");
CREATE INDEX "RentalOrder_dueAt_status_idx" ON "RentalOrder"("dueAt","status");

ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RentalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
