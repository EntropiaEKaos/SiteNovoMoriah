import {describe,expect,it} from "vitest";
import {assertOnboardingTransition,onboardingProgress,statusForStep} from "./onboarding-state";
import {assertPlatformWrite,normalizeTenantSlug} from "./control-plane-contracts";
describe("SaaS control plane contracts",()=>{
 it("allows only sequential onboarding transitions",()=>{expect(assertOnboardingTransition("PLAN","PROPERTY")).toBe("PROPERTY");expect(()=>assertOnboardingTransition("PLAN","COMPLETE")).toThrow("SAAS_ONBOARDING_TRANSITION_INVALID")});
 it("reports deterministic progress",()=>{expect(onboardingProgress("ORGANIZATION")).toBe(0);expect(onboardingProgress("COMPLETE")).toBe(100);expect(statusForStep("PROVISIONING")).toBe("PROVISIONING")});
 it("normalizes tenant slugs",()=>expect(normalizeTenantSlug(" Pousada São José ")).toBe("pousada-sao-jose"));
 it("restricts platform writes to platform admins",()=>expect(()=>assertPlatformWrite({principalId:"u1",role:"PLATFORM_SUPPORT"})).toThrow("SAAS_PLATFORM_WRITE_DENIED"));
});
