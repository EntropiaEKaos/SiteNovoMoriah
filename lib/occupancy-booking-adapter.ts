import type { OccupancyInterval } from "./occupancy-calendar-projection";

export type CalendarBookingRecord = {
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  checkedInAt?: Date | null;
  checkedOutAt?: Date | null;
  noShowAt?: Date | null;
  guests: number;
};

/**
 * A conservative adapter: it never guesses which PMS statuses consume inventory.
 * Only callers with an explicitly audited status policy may mark output verified.
 * Date-only ISO strings are used to avoid local browser timezone drift.
 */
export function toVerifiedBookingIntervals(
  bookings: CalendarBookingRecord[],
  inventoryStatusPolicy: Readonly<Record<string, "RESERVATION" | "CHECKED_IN" | "IGNORE">>,
  sharedRoom: boolean,
): { verified: boolean; intervals: OccupancyInterval[]; issues: string[] } {
  const intervals: OccupancyInterval[] = [];
  const issues: string[] = [];
  for (const [index, booking] of bookings.entries()) {
    const statusKind = Object.prototype.hasOwnProperty.call(inventoryStatusPolicy, booking.status)
      ? inventoryStatusPolicy[booking.status]
      : undefined;
    if (statusKind !== "RESERVATION" && statusKind !== "CHECKED_IN" && statusKind !== "IGNORE") {
      issues.push(`Unknown booking status at index ${index}`);
      continue;
    }
    if (statusKind === "IGNORE") continue;
    if (booking.noShowAt || booking.checkedOutAt) {
      issues.push(`Booking lifecycle requires review at index ${index}`);
      continue;
    }
    const start = booking.checkIn?.toISOString().slice(0, 10);
    const end = booking.checkOut?.toISOString().slice(0, 10);
    if (!start || !end || end <= start || !Number.isSafeInteger(booking.guests) || booking.guests < 1) {
      issues.push(`Invalid booking dates or guest count at index ${index}`);
      continue;
    }
    intervals.push({ start, end, units: sharedRoom ? booking.guests : 1, kind: statusKind });
  }
  return { verified: issues.length === 0, intervals, issues };
}
