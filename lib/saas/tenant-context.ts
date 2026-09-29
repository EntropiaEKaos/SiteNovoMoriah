import type {SaasRole,SaasPermission} from "./rbac";
import {assertPermission} from "./rbac";

export type TenantContext={
  tenantId:string;
  propertyId:string|null;
  membershipId:string|null;
  userId:string|null;
  role:SaasRole|null;
  source:"MEMBERSHIP"|"PUBLIC_TOKEN"|"SYSTEM_JOB"|"PLATFORM";
};

export function tenantWhere<T extends Record<string,unknown>>(ctx:TenantContext,where:T):T&{tenantId:string}{
  if(!ctx.tenantId)throw new Error("SAAS_TENANT_CONTEXT_REQUIRED");
  return {...where,tenantId:ctx.tenantId};
}

export function requireMembershipContext(ctx:TenantContext,permission:SaasPermission){
  if(ctx.source!=="MEMBERSHIP"||!ctx.membershipId||!ctx.userId||!ctx.role)throw new Error("SAAS_MEMBERSHIP_CONTEXT_REQUIRED");
  assertPermission(ctx.role,permission);
  return ctx;
}

export function assertResourceTenant(ctx:TenantContext,resourceTenantId:string){
  if(!ctx.tenantId||ctx.tenantId!==resourceTenantId)throw new Error("SAAS_TENANT_BOUNDARY_VIOLATION");
}

export function storagePrefix(ctx:TenantContext){
  if(!ctx.tenantId)throw new Error("SAAS_TENANT_CONTEXT_REQUIRED");
  return `tenants/${ctx.tenantId}/`;
}
