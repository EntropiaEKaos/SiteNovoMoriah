import {describe,expect,it} from "vitest";
import {assertNoClientTenantOverride,buildPublicTokenContext} from "./public-token-context";

describe("public SaaS token isolation",()=>{
  it("derives widget tenant context from stored token ownership",()=>{
    const ctx=buildPublicTokenContext({tenantId:"ta",propertyId:"pa",active:true,purpose:"CALENDAR_WIDGET"},"CALENDAR_WIDGET");
    expect(ctx.tenantId).toBe("ta"); expect(ctx.propertyId).toBe("pa"); expect(ctx.source).toBe("PUBLIC_TOKEN");
  });
  it("rejects disabled public tokens",()=>expect(()=>buildPublicTokenContext({tenantId:"ta",propertyId:"pa",active:false,purpose:"ICAL_EXPORT"},"ICAL_EXPORT")).toThrow("SAAS_PUBLIC_TOKEN_DISABLED"));
  it("rejects token reuse for another purpose",()=>expect(()=>buildPublicTokenContext({tenantId:"ta",propertyId:"pa",active:true,purpose:"ICAL_EXPORT"},"CALENDAR_WIDGET")).toThrow("SAAS_PUBLIC_TOKEN_PURPOSE_MISMATCH"));
  it("rejects a tenant id supplied by a client attempting to switch ownership",()=>{
    const ctx=buildPublicTokenContext({tenantId:"ta",propertyId:"pa",active:true,purpose:"CALENDAR_WIDGET"},"CALENDAR_WIDGET");
    expect(()=>assertNoClientTenantOverride(ctx,"tb")).toThrow("SAAS_CLIENT_TENANT_OVERRIDE_REJECTED");
  });
});
