import {describe,expect,it} from "vitest";
import {assertBookingRelations,assertPropertyBoundary,assertSameTenant} from "./hospitality-boundary";
import type {TenantContext} from "./tenant-context";

const ctx:TenantContext={tenantId:"ta",propertyId:"pa",membershipId:"ma",userId:"ua",role:"MANAGER",source:"MEMBERSHIP"};

describe("hospitality SaaS boundaries",()=>{
  it("accepts resources in the active tenant/property",()=>expect(()=>assertPropertyBoundary(ctx,{tenantId:"ta",propertyId:"pa"})).not.toThrow());
  it("rejects another tenant",()=>expect(()=>assertPropertyBoundary(ctx,{tenantId:"tb",propertyId:"pb"})).toThrow("SAAS_TENANT_BOUNDARY_VIOLATION"));
  it("rejects another property when context is property scoped",()=>expect(()=>assertPropertyBoundary(ctx,{tenantId:"ta",propertyId:"pb"})).toThrow("SAAS_PROPERTY_BOUNDARY_VIOLATION"));
  it("rejects relations crossing tenants",()=>expect(()=>assertSameTenant({tenantId:"ta"},{tenantId:"tb"})).toThrow("SAAS_CROSS_TENANT_RELATION"));
  it("rejects a booking tied to an accommodation in another property",()=>expect(()=>assertBookingRelations({tenantId:"ta",propertyId:"pa"},{tenantId:"ta",propertyId:"pb"},{tenantId:"ta"})).toThrow("SAAS_CROSS_PROPERTY_BOOKING"));
});
