export const SAAS_ROLES=["OWNER","ADMIN","MANAGER","RECEPTION","FINANCE","HOUSEKEEPING","KITCHEN","WAITER","DELIVERY","READ_ONLY"] as const;
export type SaasRole=(typeof SAAS_ROLES)[number];

export const SAAS_PERMISSIONS=[
  "tenant.manage","property.manage","members.manage","billing.manage","settings.manage",
  "reservations.read","reservations.write","guests.read","guests.write","rates.read","rates.write",
  "channels.read","channels.write","rentals.read","rentals.write","notifications.read","notifications.write",
  "restaurant.read","restaurant.write","kitchen.read","kitchen.write","finance.read","finance.write",
  "cms.read","cms.write","audit.read"
] as const;
export type SaasPermission=(typeof SAAS_PERMISSIONS)[number];

const ALL=new Set<SaasPermission>(SAAS_PERMISSIONS);
const READ=new Set<SaasPermission>(SAAS_PERMISSIONS.filter((permission)=>permission.endsWith(".read")) as SaasPermission[]);

const POLICY:Record<SaasRole,ReadonlySet<SaasPermission>>={
  OWNER:ALL,
  ADMIN:ALL,
  MANAGER:new Set(SAAS_PERMISSIONS.filter((p)=>p!=="billing.manage"&&p!=="tenant.manage")),
  RECEPTION:new Set(["reservations.read","reservations.write","guests.read","guests.write","rates.read","channels.read","rentals.read","rentals.write","notifications.read"]),
  FINANCE:new Set(["reservations.read","guests.read","finance.read","finance.write","audit.read"]),
  HOUSEKEEPING:new Set(["reservations.read","guests.read","notifications.read"]),
  KITCHEN:new Set(["restaurant.read","kitchen.read","kitchen.write","notifications.read"]),
  WAITER:new Set(["restaurant.read","restaurant.write","kitchen.read"]),
  DELIVERY:new Set(["restaurant.read","restaurant.write","notifications.read"]),
  READ_ONLY:READ
};

export function isSaasRole(value:string):value is SaasRole{return (SAAS_ROLES as readonly string[]).includes(value)}
export function hasPermission(role:SaasRole,permission:SaasPermission){return POLICY[role].has(permission)}
export function assertPermission(role:SaasRole,permission:SaasPermission){if(!hasPermission(role,permission))throw new Error("SAAS_PERMISSION_DENIED")}
