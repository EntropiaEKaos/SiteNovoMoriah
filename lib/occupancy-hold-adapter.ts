import type { OccupancyInterval } from "./occupancy-calendar-projection";

export type CalendarInventoryHold = {
  checkIn: Date;
  checkOut: Date;
  units: number;
  expiresAt: Date;
};

/**
 * Converts pre-fetched holds to read-only calendar intervals.
 * The caller must pass a fixed reference time and property-local normalized dates.
 * Never infer feed completeness from this result: a caller must verify all sources.
 */
export function toVerifiedHoldIntervals(
  holds: CalendarInventoryHold[],
  asOf: Date,
): { verified: boolean; intervals: OccupancyInterval[]; issues: string[] } {
  if (!(asOf instanceof Date) || !Number.isFinite(asOf.getTime())) {
    return { verified: false, intervals: [], issues: ["Invalid reference time"] };
  }
  const intervals: OccupancyInterval[] = [];
  const issues: string[] = [];
  for (const [index, hold] of holds.entries()) {
    if (![hold.checkIn, hold.checkOut, hold.expiresAt].every(
      (value) => value instanceof Date && Number.isFinite(value.getTime()),
    ) || !Number.isSafeInteger(hold.units) || hold.units < 1) {
      issues.push(`Invalid hold data at index ${index}`);
      continue;
    }
    if (hold.expiresAt.getTime() <= asOf.getTime()) continue;
    const start = hold.checkIn.toISOString().slice(0, 10);
    const end = hold.checkOut.toISOString().slice(0, 10);
    if (end <= start) {
      issues.push(`Invalid hold dates at index ${index}`);
      continue;
    }
    intervals.push({ start, end, units: hold.units, kind: "HOLD" });
  }
  return { verified: issues.length === 0, intervals, issues };
}
