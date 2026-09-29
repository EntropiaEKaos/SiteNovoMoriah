import {describe,expect,it} from "vitest";
import {assertFeature,assertLimit,hasFeature,planEntitlement} from "./entitlements";
describe("SaaS entitlements",()=>{
 it("keeps starter focused on hospitality core",()=>{expect(hasFeature("STARTER","RESERVATIONS")).toBe(true);expect(hasFeature("STARTER","DELIVERY")).toBe(false)});
 it("enables restaurant and delivery on professional",()=>expect(hasFeature("PROFESSIONAL","DELIVERY")).toBe(true));
 it("supports explicit per-tenant feature overrides",()=>expect(hasFeature("STARTER","RESTAURANT",{RESTAURANT:true})).toBe(true));
 it("rejects disabled features",()=>expect(()=>assertFeature("STARTER","CHANNELS")).toThrow("SAAS_FEATURE_NOT_ENTITLED"));
 it("enforces numeric limits",()=>expect(()=>assertLimit("STARTER","properties",1)).toThrow("SAAS_PLAN_LIMIT_EXCEEDED"));
 it("keeps internal reference tenant unrestricted",()=>{expect(hasFeature("INTERNAL","AI")).toBe(true);expect(planEntitlement("INTERNAL").limits.properties).toBe(Number.MAX_SAFE_INTEGER)});
});
