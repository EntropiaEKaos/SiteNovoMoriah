import { prisma } from "./prisma";
import { projectOccupancyDays, type OccupancyDay, type OccupancyInterval } from "./occupancy-calendar-projection";
import { toVerifiedBookingIntervals } from "./occupancy-booking-adapter";
import { toVerifiedHoldIntervals } from "./occupancy-hold-adapter";

const DAY = 86_400_000;
const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value + "T00:00:00Z"))
  && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;

/**
 * Admin-only read model. This deliberately does NOT return authoritative
 * booking availability: timezone reconciliation and OTA deduplication remain
 * uncertified, so all states are UNVERIFIED until that work is complete.
 */
export async function getAdminOccupancyPreview(args: {
  accommodationId: string;
  start: string;
  days: number;
  asOf?: Date;
}): Promise<OccupancyDay[]> {
  if (!args.accommodationId?.trim() || !isDay(args.start) || !Number.isSafeInteger(args.days) || args.days < 1 || args.days > 62) {
    throw new Error("Invalid occupancy preview window");
  }
  const asOf = args.asOf ?? new Date();
  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid reference clock");
  const start = new Date(args.start + "T00:00:00Z");
  const end = new Date(start.getTime() + args.days * DAY);
  // One immutable reference instant is shared by hold filtering and projection.
  // Do not substitute a second Date() inside the query: holds can expire mid-read.
  const dates = Array.from({ length: args.days }, (_, index) =>
    new Date(start.getTime() + index * DAY).toISOString().slice(0, 10));
  const room = await prisma.accommodation.findUnique({
    where: { id: args.accommodationId },
    select: { id: true, active: true, sharedRoom: true, bedCount: true },
  });
  if (!room) throw new Error("Accommodation not found");
  if (!room.active) throw new Error("Inactive accommodation cannot be previewed");
  // All four sources below are read-only; no hold creation, booking mutation, or OTA writes.
  const [bookings, holds, manual, channel] = await Promise.all([
    prisma.bookingLead.findMany({
      where: {
        accommodationId: room.id, status: { in: ["CONFIRMED", "CHECKED_IN"] },
        checkIn: { lt: end }, checkOut: { gt: start },
      },
      select: { checkIn: true, checkOut: true, guests: true, status: true, checkedInAt: true, checkedOutAt: true, noShowAt: true },
    }),
    prisma.inventoryHold.findMany({
      where: { accommodationId: room.id, expiresAt: { gt: asOf }, checkIn: { lt: end }, checkOut: { gt: start } },
      select: { checkIn: true, checkOut: true, units: true, expiresAt: true },
    }),
    prisma.manualInventoryBlock.findMany({
      where: { accommodationId: room.id, startsAt: { lt: end }, endsAt: { gt: start } },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.channelBlock.findMany({
      where: { startsAt: { lt: end }, endsAt: { gt: start }, integration: { accommodationId: room.id, active: true } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  const bookingResult = toVerifiedBookingIntervals(bookings, {
    CONFIRMED: "RESERVATION", CHECKED_IN: "CHECKED_IN",
  }, room.sharedRoom);
  const holdResult = toVerifiedHoldIntervals(holds, asOf);
  // Do not render partial counts when any source cannot be reconciled. 
  const sourceRecordsValid = bookingResult.verified && holdResult.verified;
  if (!sourceRecordsValid) throw new Error("Unreconciled booking or hold records");
  const intervals: OccupancyInterval[] = [...bookingResult.intervals, ...holdResult.intervals];
  const hardBlockDates = new Set<string>(); 
  let blocksValid = true;
  for (const block of [...manual, ...channel]) {
    if (!Number.isFinite(block.startsAt.getTime()) || !Number.isFinite(block.endsAt.getTime()) ||
        block.startsAt >= block.endsAt) { blocksValid = false; continue; }
    for (const date of dates) {
      const nightStart = new Date(date + "T00:00:00Z");
      const nightEnd = new Date(nightStart.getTime() + DAY);
      if (block.startsAt < nightEnd && block.endsAt > nightStart) hardBlockDates.add(date);
    }
  }
  if (!blocksValid) throw new Error("Invalid manual or channel block interval");
  // Private rooms are a single bookable unit, irrespective of guest capacity.
  if (room.sharedRoom && (!Number.isSafeInteger(room.bedCount) || room.bedCount < 1)) {
    throw new Error("Invalid shared-room bed capacity");
  }
  const capacity = room.sharedRoom ? room.bedCount : 1;
  return projectOccupancyDays({
    dates, capacity, intervals, hardBlockDates: [...hardBlockDates],
    verified: false, // Deliberately fail closed pending property-timezone and feed certification.
  });
}
