# Hospitality multi-tenant migration map

This is a design artifact only. Production schema and data remain unchanged.

## Ownership target

Tenant -> Property -> Accommodation -> inventory/rates/channels
Tenant -> Guest
Tenant + Property -> Booking

## Legacy mapping

- Accommodation: add tenantId + propertyId. `internalCode` changes from global unique to tenant/property scoped unique.
- BookingLead: becomes tenant/property scoped; accommodation and guest references must resolve inside the same tenant.
- Guest: tenant scoped by default. A future platform identity must not silently merge guest PII between tenants.
- InventoryHold: derives tenant/property from Accommodation; token remains globally unguessable but authorization is not based on tenantId supplied by clients.
- ManualInventoryBlock: derives ownership from Accommodation.
- RatePlan / RateRule / RateOverride: tenant/property boundaries follow Accommodation/RatePlan.
- ChannelIntegration: tenant/property scoped. Export token resolves trusted ownership server-side.
- ChannelBlock: ownership derives from ChannelIntegration.

## Expand/backfill/enforce plan

1. EXPAND (isolated DB): nullable tenantId/propertyId columns and supporting indexes; no destructive uniqueness changes.
2. BACKFILL: create reference Moriah tenant/property and populate copied records deterministically.
3. VALIDATE: orphan checks, row counts, cross-tenant relation checks, duplicate legacy codes/slugs/tokens.
4. ENFORCE: non-null ownership, composite foreign-key/unique rules where appropriate, application guards.
5. CONTRACT: only after all reads/writes use tenant context, retire global assumptions.

## Required invariants

- An Accommodation cannot reference a Property from another Tenant.
- A Booking cannot reference an Accommodation or Guest from another Tenant.
- Rates cannot cross Accommodation ownership.
- Channel jobs cannot sync another tenant's integration.
- Public/export tokens resolve tenant context from the stored token owner.
- No API authorizes by accepting tenantId from request body/query params.

## Uniqueness changes to evaluate

Legacy global uniqueness is too restrictive for SaaS for fields such as Accommodation.internalCode. Prefer scoped uniqueness like `(tenantId, propertyId, internalCode)` when business semantics allow it. Security tokens can remain globally unique.

## First migration slice

Accommodation + inventory + rates are the first candidate because Booking, Calendar and Channels depend on them. Booking/Guest follows only after accommodation ownership is certified.
