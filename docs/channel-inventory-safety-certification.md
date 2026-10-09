# Channel inventory safety certification (draft)

## Scope
This branch is isolated from production. Do not merge or enable automated inventory writes before all gates pass.

## Current implementation observations (2026-10-09)
- `lib/channel-sync.ts` upserts external blocks by `integrationId_externalUid`, then deletes unseen blocks on a successful non-304 feed response.
- The existing uniqueness key protects repeated UIDs in a single integration, but does not alone prove safe cancellation, stale-feed ordering, or overlapping concurrent syncs.
- `app/admin/canais/calendario/actions.ts` uses a PostgreSQL transaction-scoped advisory lock and shared-capacity checks for manual bookings.
- `app/admin/canais/calendario/page.tsx` renders external channel blocks separately from internal booking leads.

## Required tests before any inventory mutation
1. Import the same UID twice: exactly one block, unchanged internal booking count.
2. Import identical feed repeatedly: no duplicate blocks or occupancy inflation.
3. Concurrent syncs with out-of-order responses: older response must not overwrite newer state.
4. Empty or truncated feed: do not release existing blocks without validated authoritative snapshot and policy.
5. External cancellation: remove only the matching external source block; never cancel a `BookingLead` or release independently held inventory.
6. Shared-room cancellation: availability must reflect other bookings and holds, not just the removed external block.
7. External UID reused or changed: flag conflict, never silently move an internal reservation.
8. Provider failures, 304 responses, and malformed iCal: preserve prior blocks and log status.
9. Two simultaneous local bookings: lock prevents overselling at bed capacity boundary.
10. Audit logs include integration, external UID, previous/new state, feed revision, and outcome.

## Proposed rollout
- Gate A: fixtures and deterministic tests for idempotency, cancellation, and concurrent synchronization.
- Gate B: read-only reconciliation report, comparing proposed changes against live inventory.
- Gate C: admin-reviewed shadow mode with conflict alerts and zero automatic releases.
- Gate D: guarded writes behind an off-by-default feature flag, with rollback and monitoring.

## Hard stop
Do not deploy destructive changes or enable automatic writes to operational inventory until tests and staging verification pass. Production PMS stays authoritative.
