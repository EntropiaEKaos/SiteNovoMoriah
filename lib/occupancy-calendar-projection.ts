/** Read-only calendar projection. No database calls or inventory mutations. */
export type OccupancyState = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "BLOCKED" | "CONFLICT" | "UNVERIFIED";
export type OccupancyInterval = {
  start: string; // YYYY-MM-DD in property-local calendar
  end: string; // exclusive checkout day
  units: number;
  kind: "RESERVATION" | "CHECKED_IN" | "BLOCK";
};
export type OccupancyDay = { date: string; state: OccupancyState; used: number; capacity: number };

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;

/**
 * Projects ALREADY VERIFIED inventory intervals. Callers must first reconcile
 * PMS statuses, OTA duplication, shared-bed assignment and data freshness.
 * In particular, SmoobuReservationInbox must never be fed directly here.
 */
export function projectOccupancyDays(args: {
  dates: string[];
  capacity: number;
  verified: boolean;
  intervals: OccupancyInterval[];
  /** Hard-block the entire accommodation on these property-local nights. */
  hardBlockDates?: string[];
}): OccupancyDay[] {
  const { dates, capacity, verified, intervals, hardBlockDates = [] } = args;
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error("Invalid capacity");
  if (dates.some((d) => !isDay(d)) || hardBlockDates.some((d) => !isDay(d))) throw new Error("Invalid calendar date");
  if (intervals.some((x) => !isDay(x.start) || !isDay(x.end) || x.end <= x.start || !Number.isSafeInteger(x.units) || x.units < 1 || !["RESERVATION", "CHECKED_IN", "BLOCK"].includes(x.kind))) {
    throw new Error("Invalid inventory interval");
  }
  return dates.map((date) => {
    const active = intervals.filter((x) => x.start <= date && date < x.end);
    const used = active.reduce((sum, x) => sum + x.units, 0);
    const hardBlocked = hardBlockDates.includes(date);
    const state: OccupancyState = !verified ? "UNVERIFIED"
      : (used > capacity || ((hardBlocked || active.some((x) => x.kind === "BLOCK")) && active.some((x) => x.kind !== "BLOCK"))) ? "CONFLICT"
      : hardBlocked || active.some((x) => x.kind === "BLOCK") ? "BLOCKED"
      : active.some((x) => x.kind === "CHECKED_IN") ? "OCCUPIED"
      : active.length ? "RESERVED" : "AVAILABLE";
    return { date, state, used, capacity };
  });
}
