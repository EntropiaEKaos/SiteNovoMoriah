# Moriah SaaS Foundation

Baseline: `5c63a9884b086e57ca93a4ead2ffb19be6b0a326`
Branch: `saas/foundation`

## Non-negotiable safety rules

1. The currently operating Moriah Production environment is not a SaaS development environment.
2. No SaaS migration is added to `main` until the migration/cutover phase is explicitly approved.
3. No SaaS development database may use Production `DATABASE_URL` or `DIRECT_URL`.
4. Preview SaaS migrations require an isolated Preview database and explicit `RUN_PREVIEW_MIGRATIONS=1`.
5. No old Preview is promoted as part of SaaS development.
6. SaaS work remains on isolated branches/PRs until certification.

## Architecture target

Platform -> Tenant -> Property -> operational resources.

Identity is separated from tenant membership:

User -> Membership -> Tenant -> Property -> Permissions

Foundation entities planned:

- Tenant
- Property
- Membership
- Role/permission policy
- TenantFeature
- TenantSettings
- TenantBranding
- AuditLog tenant context
- Subscription/Plan (control-plane phase)

## Migration strategy

The existing Moriah operation becomes the reference tenant only after the multi-tenant implementation is proven in an isolated database. Production data is not backfilled during foundation development.

The migration will be expand/backfill/enforce/contract rather than a destructive rewrite:

1. Expand schema compatibly.
2. Create reference tenant in isolated environment.
3. Backfill copied/sanitized data.
4. Validate row counts and relationships.
5. Enforce tenant isolation and composite uniqueness.
6. Run cross-tenant security tests.
7. Only later plan a separately approved Production cutover.

## Initial resource classification

### Tenant-scoped

Admin users/memberships, site settings/content, accommodations, guests, booking leads, channel integrations/blocks, inventory holds, manual blocks, rate plans/rules/overrides, notification messages/rules, calendar widget settings, rentals, restaurant resources, kitchen/order resources, payments/charges, housekeeping and operational audit records.

### Platform-scoped

Future SaaS plans, plan catalog/pricing, platform administrators, global feature catalog, subscription infrastructure and platform-level audit/observability.

### Property-scoped candidates

Accommodations, inventory, reservations/check-ins, channel integrations, rates, housekeeping, rentals and property-level operational settings. Restaurant resources may belong to a property or an explicitly modeled business unit; this must be resolved before schema enforcement.

### Special migration attention

Singleton records using IDs such as `main` must become tenant/property scoped. Globally unique slugs, tokens, internal codes and notification dedupe keys must be reviewed so one tenant cannot collide with another. Public tokens must resolve tenant context safely without accepting a client-supplied tenant ID as authority.

## Security invariants

- Every tenant-owned read/write derives tenant context from authenticated membership or a trusted public token.
- Client-provided `tenantId` never authorizes access.
- Cross-tenant ID access returns not-found/forbidden without data disclosure.
- Background jobs, webhooks, iCal sync, notifications and public widgets carry trusted tenant context.
- Storage keys are namespaced by tenant.
- Audit records retain tenant and actor context.

## First certification gate

Before migrating an operational module, automated tests must prove:

- Tenant A cannot read Tenant B resources.
- Tenant A cannot mutate/delete Tenant B resources.
- guessed IDs and foreign IDs do not cross boundaries.
- public widget/token access resolves only its owning tenant.
- background jobs cannot process resources under the wrong tenant.

Production remains untouched until a separate cutover plan is approved.
