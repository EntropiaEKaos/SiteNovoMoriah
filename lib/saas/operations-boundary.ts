import type {TenantContext} from "./tenant-context";
import {assertResourceTenant} from "./tenant-context";
export type OperationOwned={tenantId:string;propertyId?:string|null};
export function assertOperationAccess(ctx:TenantContext,resource:OperationOwned){
 assertResourceTenant(ctx,resource.tenantId);
 if(ctx.propertyId&&resource.propertyId&&ctx.propertyId!==resource.propertyId)throw new Error("SAAS_PROPERTY_BOUNDARY_VIOLATION");
}
export function notificationDedupeKey(tenantId:string,key:string){if(!tenantId||!key)throw new Error("SAAS_NOTIFICATION_KEY_REQUIRED");return `${tenantId}:${key}`}
export function assertRentalRelation(asset:OperationOwned,booking:OperationOwned){
 if(asset.tenantId!==booking.tenantId)throw new Error("SAAS_CROSS_TENANT_RENTAL_RELATION");
 if(asset.propertyId!==booking.propertyId)throw new Error("SAAS_CROSS_PROPERTY_RENTAL_RELATION");
}
