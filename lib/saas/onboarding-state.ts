export const ONBOARDING_STEPS=["ORGANIZATION","SEGMENT","PLAN","PROPERTY","FEATURES","REVIEW","PROVISIONING","COMPLETE"] as const;
export type OnboardingStep=(typeof ONBOARDING_STEPS)[number];
export type OnboardingStatus="STARTED"|"PROVISIONING"|"COMPLETED"|"FAILED";
const transitions:Record<OnboardingStep,readonly OnboardingStep[]>={ORGANIZATION:["SEGMENT"],SEGMENT:["PLAN"],PLAN:["PROPERTY"],PROPERTY:["FEATURES"],FEATURES:["REVIEW"],REVIEW:["PROVISIONING"],PROVISIONING:["COMPLETE"],COMPLETE:[]};
export function assertOnboardingTransition(from:OnboardingStep,to:OnboardingStep){if(!transitions[from].includes(to))throw new Error("SAAS_ONBOARDING_TRANSITION_INVALID");return to}
export function onboardingProgress(step:OnboardingStep){return Math.round((ONBOARDING_STEPS.indexOf(step)/(ONBOARDING_STEPS.length-1))*100)}
export function statusForStep(step:OnboardingStep):OnboardingStatus{return step==="COMPLETE"?"COMPLETED":step==="PROVISIONING"?"PROVISIONING":"STARTED"}
