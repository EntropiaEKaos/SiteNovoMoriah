import {describe,expect,it} from "vitest";
import {assertResourceTenant,requireMembershipContext,storagePrefix,tenantWhere,type TenantContext} from "./tenant-context";

const tenantA:TenantContext={tenantId:"tenant-a",propertyId:"property-a",membershipId:"member-a",userId:"user-a",role:"MANAGER",source:"MEMBERSHIP"};
const tenantB:TenantContext={tenantId:"tenant-b",propertyId:"property-b",membershipId:"member-b",userId:"user-b",role:"MANAGER",source:"MEMBERSHIP"};

describe("SaaS tenant isolation",()=>{
  it("injects the trusted tenant into database filters",()=>{
    expect(tenantWhere(tenantA,{active:true})).toEqual({active:true,tenantId:"tenant-a"});
  });

  it("rejects cross-tenant resource access",()=>{
    expect(()=>assertResourceTenant(tenantA,tenantB.tenantId)).toThrow("SAAS_TENANT_BOUNDARY_VIOLATION");
  });

  it("creates tenant-scoped storage prefixes",()=>{
    expect(storagePrefix(tenantA)).toBe("tenants/tenant-a/");
    expect(storagePrefix(tenantB)).toBe("tenants/tenant-b/");
  });

  it("enforces role permissions for membership contexts",()=>{
    expect(requireMembershipContext(tenantA,"reservations.write")).toBe(tenantA);
    expect(()=>requireMembershipContext(tenantA,"billing.manage")).toThrow("SAAS_PERMISSION_DENIED");
  });

  it("does not accept public tokens as administrative membership",()=>{
    const publicContext:TenantContext={...tenantA,membershipId:null,userId:null,role:null,source:"PUBLIC_TOKEN"};
    expect(()=>requireMembershipContext(publicContext,"reservations.read")).toThrow("SAAS_MEMBERSHIP_CONTEXT_REQUIRED");
  });
});
