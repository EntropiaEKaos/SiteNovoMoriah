# Calendar 3.1 — authoritative inventory engine alignment

Verified source: `lib/inventory-engine.ts` (main, 2026-10-15).

## Authoritative inventory rules

- PMS occupancy is driven by `bookingLead.status IN ("CONFIRMED", "CHECKED_IN")`; other statuses are excluded by the availability engine.
- A private room is unavailable if **any** overlapping `ChannelBlock`, `BookingLead`, unexpired `InventoryHold` or `ManualInventoryBlock` exists. Its guest capacity is a separate eligibility check, **not** the number of simultaneously bookable room units.
- Shared rooms use `bedCount` and concurrent booked guest counts plus active hold units. **Any** overlapping active channel block or manual block hard-blocks the entire shared room, not just one bed.
- Channel blocks only count when their integration is active. Holds only count when `expiresAt > now`.
- `SmoobuReservationInbox` is a read-only diagnostic inbox and must never be counted as an additional booking.
- The authoritative availability check is `isAccommodationAvailable` in `lib/inventory-engine.ts`; avoid replacing or mutating its logic from the calendar UI.

## Integration safety requirements

1. Use the exact authoritative status allowlist `CONFIRMED` and `CHECKED_IN` for calendar projection, and ensure checked-in timestamps are consistent with existing PMS lifecycle behavior before enforcing additional checks.
2. For private rooms, project capacity as one **bookable room**, even when `Accommodation.capacity` is two or more **guests**.
3. For shared rooms, project capacity as `bedCount`; do not project manual/channel hard blocks as a single occupied bed. A block makes the whole room unavailable.
4. Include active channel blocks and non-expired inventory holds, otherwise the UI must show `UNVERIFIED`, not `AVAILABLE`.
5. Confirm timezone semantics at the Prisma query boundary. Date-only UTC conversion can shift local nights if input timestamps are not normalized.
6. Treat duplicate OTA and PMS representations conservatively: `CONFLICT` or `UNVERIFIED` until reconciliation. Never silently remove either source.
7. Keep price calendar (`app/admin/preco-dinamico/pricing-calendar.tsx`) separate from inventory display. Its comparative grid explicitly shows **rates**, not occupancy.
8. Before enabling a calendar occupancy badge, compare day-by-day against `isAccommodationAvailable` with a fixed reference clock for expiring holds and certify private rooms, shared beds, overlapping hard blocks, and Smoobu imports.

## Current scope

`lib/occupancy-calendar-projection.ts` and `lib/occupancy-booking-adapter.ts` are standalone read-only helpers. They are **not yet an authoritative live availability endpoint**. The adapter's explicit policy prevents accidental trust in unknown booking statuses; its checked-in timestamp rule must be reconciled with actual historical PMS records before use. Do not connect these helpers directly to a public booking decision or assert that their `AVAILABLE` state is live inventory.
