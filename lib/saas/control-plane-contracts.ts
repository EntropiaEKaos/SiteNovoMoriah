import type {SaasFeature,SaasPlan} from "./entitlements";
import type {Segment} from "./provisioning";
export type CreateTenantCommand={name:string;slug:string;ownerPrincipalId:string;segment:Segment;plan:SaasPlan;property:{name:string;slug:string;timezone?:string};requestedFeatures?:SaasFeature[]};
export type TenantSummary={id:string;name:string;slug:string;status:string;plan:SaasPlan;segment:Segment;createdAt:string};
export type PlatformActor={principalId:string;role:"PLATFORM_ADMIN"|"PLATFORM_SUPPORT"|"PLATFORM_BILLING"};
export function assertPlatformWrite(actor:PlatformActor){if(actor.role!=="PLATFORM_ADMIN")throw new Error("SAAS_PLATFORM_WRITE_DENIED");return actor}
export function normalizeTenantSlug(value:string){const slug=value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");if(slug.length<3)throw new Error("SAAS_TENANT_SLUG_INVALID");return slug}
