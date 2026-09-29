import {describe,expect,it} from "vitest";
import {assertOperationAccess,assertRentalRelation,notificationDedupeKey} from "./operations-boundary";
import type {TenantContext} from "./tenant-context";
const ctx:TenantContext={tenantId:"ta",propertyId:"pa",membershipId:"ma",userId:"ua",role:"MANAGER",source:"MEMBERSHIP"};
describe("operations SaaS boundaries",()=>{
 it("accepts operation resource in active tenant/property",()=>expect(()=>assertOperationAccess(ctx,{tenantId:"ta",propertyId:"pa"})).not.toThrow());
 it("rejects operation resource from another tenant",()=>expect(()=>assertOperationAccess(ctx,{tenantId:"tb",propertyId:"pb"})).toThrow("SAAS_TENANT_BOUNDARY_VIOLATION"));
 it("namespaces notification dedupe keys by tenant",()=>{expect(notificationDedupeKey("ta","order:42")).toBe("ta:order:42");expect(notificationDedupeKey("tb","order:42")).not.toBe(notificationDedupeKey("ta","order:42"))});
 it("rejects rental booking across properties",()=>expect(()=>assertRentalRelation({tenantId:"ta",propertyId:"pa"},{tenantId:"ta",propertyId:"pb"})).toThrow("SAAS_CROSS_PROPERTY_RENTAL_RELATION"));
});
