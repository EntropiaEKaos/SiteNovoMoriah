import type {TenantContext} from "./tenant-context";

export type PublicTokenOwner={tenantId:string;propertyId:string|null;active:boolean;purpose:"CALENDAR_WIDGET"|"ICAL_EXPORT"};

export function buildPublicTokenContext(owner:PublicTokenOwner,expectedPurpose:PublicTokenOwner["purpose"]):TenantContext{
  if(!owner.active)throw new Error("SAAS_PUBLIC_TOKEN_DISABLED");
  if(owner.purpose!==expectedPurpose)throw new Error("SAAS_PUBLIC_TOKEN_PURPOSE_MISMATCH");
  if(!owner.tenantId)throw new Error("SAAS_PUBLIC_TOKEN_OWNER_REQUIRED");
  return {tenantId:owner.tenantId,propertyId:owner.propertyId,membershipId:null,userId:null,role:null,source:"PUBLIC_TOKEN"};
}

export function assertNoClientTenantOverride(ctx:TenantContext,requestedTenantId?:string|null){
  if(requestedTenantId&&requestedTenantId!==ctx.tenantId)throw new Error("SAAS_CLIENT_TENANT_OVERRIDE_REJECTED");
  return ctx;
}
