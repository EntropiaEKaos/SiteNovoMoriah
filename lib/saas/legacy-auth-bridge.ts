import type {SaasRole} from "./rbac";
import {isSaasRole} from "./rbac";
import type {TenantContext} from "./tenant-context";

export type LegacyAdminIdentity={id:string;username:string;role:string;active:boolean};
export type MembershipSnapshot={id:string;tenantId:string;principalId:string;role:string;active:boolean;propertyId?:string|null};

const LEGACY_ROLE_MAP:Record<string,SaasRole>={SUPERADMIN:"OWNER",ADMIN:"ADMIN",MANAGER:"MANAGER",RECEPTION:"RECEPTION",FINANCE:"FINANCE",HOUSEKEEPING:"HOUSEKEEPING",KITCHEN:"KITCHEN"};

export function mapLegacyRole(role:string):SaasRole{
  const normalized=role.trim().toUpperCase();
  const mapped=LEGACY_ROLE_MAP[normalized]??normalized;
  if(!isSaasRole(mapped))throw new Error("SAAS_UNMAPPED_LEGACY_ROLE");
  return mapped;
}

export function buildTenantContextFromLegacy(admin:LegacyAdminIdentity,membership:MembershipSnapshot):TenantContext{
  if(!admin.active||!membership.active)throw new Error("SAAS_INACTIVE_IDENTITY");
  if(membership.principalId!==admin.id)throw new Error("SAAS_MEMBERSHIP_PRINCIPAL_MISMATCH");
  const membershipRole=mapLegacyRole(membership.role);
  return {tenantId:membership.tenantId,propertyId:membership.propertyId??null,membershipId:membership.id,userId:admin.id,role:membershipRole,source:"MEMBERSHIP"};
}
