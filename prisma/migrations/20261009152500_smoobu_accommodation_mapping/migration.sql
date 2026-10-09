CREATE TABLE "SmoobuAccommodationMapping" (
 "id" TEXT NOT NULL,
 "smoobuApartmentId" INTEGER NOT NULL,
 "accommodationId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SmoobuAccommodationMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SmoobuAccommodationMapping_smoobuApartmentId_key" ON "SmoobuAccommodationMapping"("smoobuApartmentId");
CREATE UNIQUE INDEX "SmoobuAccommodationMapping_accommodationId_key" ON "SmoobuAccommodationMapping"("accommodationId");
ALTER TABLE "SmoobuAccommodationMapping" ADD CONSTRAINT "SmoobuAccommodationMapping_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
