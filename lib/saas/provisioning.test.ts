import {describe,expect,it} from "vitest";
import {PROVISIONING_STEPS,provisioningKey,resolveInitialFeatures,validateProvisioningInput} from "./provisioning";
describe("SaaS provisioning",()=>{
 it("has deterministic bootstrap order",()=>expect(PROVISIONING_STEPS).toEqual(["TENANT","OWNER_MEMBERSHIP","PROPERTY","FEATURES","SETTINGS","SUBSCRIPTION","AUDIT"]));
 it("creates stable idempotency key",()=>expect(provisioningKey("t1")).toBe("tenant:t1:bootstrap:v1"));
 it("selects segment defaults only when entitled by plan",()=>{const f=resolveInitialFeatures({tenantId:"t1",ownerPrincipalId:"u1",segment:"RESTAURANT",plan:"STARTER",propertyName:"Loja"});expect(f).not.toContain("DELIVERY");expect(f).toContain("NOTIFICATIONS")});
 it("provisions hybrid professional modules",()=>{const f=resolveInitialFeatures({tenantId:"t1",ownerPrincipalId:"u1",segment:"HYBRID",plan:"PROFESSIONAL",propertyName:"Matriz"});expect(f).toContain("HOSPITALITY");expect(f).toContain("RESTAURANT");expect(f).toContain("DELIVERY")});
 it("prevents INTERNAL from public onboarding",()=>expect(()=>validateProvisioningInput({tenantId:"t1",ownerPrincipalId:"u1",segment:"HOTEL",plan:"INTERNAL",propertyName:"Matriz"})).toThrow("SAAS_INTERNAL_PLAN_NOT_SELF_SERVICE"));
});
