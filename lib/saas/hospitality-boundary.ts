import type {TenantContext} from "./tenant-context";
import {assertResourceTenant} from "./tenant-context";

export type OwnedResource={tenantId:string;propertyId?:string|null};

export function assertPropertyBoundary(ctx:TenantContext,resource:OwnedResource){
  assertResourceTenant(ctx,resource.tenantId);
  if(ctx.propertyId&&resource.propertyId&&ctx.propertyId!==resource.propertyId)throw new Error("SAAS_PROPERTY_BOUNDARY_VIOLATION");
}

export function assertSameTenant(...resources:OwnedResource[]){
  const tenantId=resources[0]?.tenantId;
  if(!tenantId)throw new Error("SAAS_RESOURCE_OWNERSHIP_REQUIRED");
  if(resources.some((resource)=>!resource.tenantId||resource.tenantId!==tenantId))throw new Error("SAAS_CROSS_TENANT_RELATION");
  return tenantId;
}

export function assertBookingRelations(booking:OwnedResource,accommodation:OwnedResource,guest?:OwnedResource|null){
  assertSameTenant(booking,accommodation,...(guest?[guest]:[]));
  if(booking.propertyId&&accommodation.propertyId&&booking.propertyId!==accommodation.propertyId)throw new Error("SAAS_CROSS_PROPERTY_BOOKING");
}
