CREATE TABLE "StaffPosition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffPosition_name_key" ON "StaffPosition"("name");
CREATE INDEX "StaffPosition_active_sortOrder_idx" ON "StaffPosition"("active", "sortOrder");
CREATE UNIQUE INDEX "StaffAssignment_guestId_key" ON "StaffAssignment"("guestId");
CREATE INDEX "StaffAssignment_positionId_idx" ON "StaffAssignment"("positionId");

ALTER TABLE "StaffAssignment"
ADD CONSTRAINT "StaffAssignment_guestId_fkey"
FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffAssignment"
ADD CONSTRAINT "StaffAssignment_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "StaffPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
