import {describe,expect,it} from "vitest";
import {buildTenantContextFromLegacy,mapLegacyRole} from "./legacy-auth-bridge";

describe("legacy admin SaaS bridge",()=>{
  it("maps the legacy superadmin into tenant owner semantics",()=>expect(mapLegacyRole("SUPERADMIN")).toBe("OWNER"));
  it("builds trusted context only from matching membership",()=>{
    const ctx=buildTenantContextFromLegacy({id:"u1",username:"admin",role:"SUPERADMIN",active:true},{id:"m1",tenantId:"t1",principalId:"u1",role:"OWNER",active:true,propertyId:"p1"});
    expect(ctx).toEqual({tenantId:"t1",propertyId:"p1",membershipId:"m1",userId:"u1",role:"OWNER",source:"MEMBERSHIP"});
  });
  it("rejects a membership belonging to another principal",()=>{
    expect(()=>buildTenantContextFromLegacy({id:"u1",username:"admin",role:"ADMIN",active:true},{id:"m1",tenantId:"t2",principalId:"u2",role:"ADMIN",active:true})).toThrow("SAAS_MEMBERSHIP_PRINCIPAL_MISMATCH");
  });
  it("rejects disabled identities",()=>{
    expect(()=>buildTenantContextFromLegacy({id:"u1",username:"admin",role:"ADMIN",active:false},{id:"m1",tenantId:"t1",principalId:"u1",role:"ADMIN",active:true})).toThrow("SAAS_INACTIVE_IDENTITY");
  });
});
