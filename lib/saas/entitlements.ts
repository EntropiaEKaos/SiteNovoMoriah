export const SAAS_FEATURES=["HOSPITALITY","RESERVATIONS","CALENDAR","CHANNELS","CALENDAR_WIDGET","RENTALS","NOTIFICATIONS","RESTAURANT","KITCHEN","DELIVERY","FINANCE","CMS","EVENTS","AI","CUSTOM_DOMAIN","API_ACCESS","MULTI_PROPERTY"] as const;
export type SaasFeature=(typeof SAAS_FEATURES)[number];
export type SaasPlan="STARTER"|"PROFESSIONAL"|"BUSINESS"|"ENTERPRISE"|"INTERNAL";
export type SaasLimits={properties:number;members:number;accommodations:number;monthlyReservations:number;monthlyOrders:number;storageMb:number};
export type Entitlement={features:ReadonlySet<SaasFeature>;limits:SaasLimits};
const unlimited=Number.MAX_SAFE_INTEGER;
const plans:Record<SaasPlan,Entitlement>={
 STARTER:{features:new Set(["HOSPITALITY","RESERVATIONS","CALENDAR","CALENDAR_WIDGET","NOTIFICATIONS"]),limits:{properties:1,members:3,accommodations:15,monthlyReservations:150,monthlyOrders:0,storageMb:1024}},
 PROFESSIONAL:{features:new Set(["HOSPITALITY","RESERVATIONS","CALENDAR","CHANNELS","CALENDAR_WIDGET","RENTALS","NOTIFICATIONS","RESTAURANT","KITCHEN","DELIVERY","FINANCE","CMS","EVENTS"]),limits:{properties:1,members:12,accommodations:60,monthlyReservations:1500,monthlyOrders:3000,storageMb:10240}},
 BUSINESS:{features:new Set(SAAS_FEATURES.filter(f=>f!=="AI")),limits:{properties:10,members:75,accommodations:500,monthlyReservations:15000,monthlyOrders:30000,storageMb:51200}},
 ENTERPRISE:{features:new Set(SAAS_FEATURES),limits:{properties:unlimited,members:unlimited,accommodations:unlimited,monthlyReservations:unlimited,monthlyOrders:unlimited,storageMb:unlimited}},
 INTERNAL:{features:new Set(SAAS_FEATURES),limits:{properties:unlimited,members:unlimited,accommodations:unlimited,monthlyReservations:unlimited,monthlyOrders:unlimited,storageMb:unlimited}}
};
export function planEntitlement(plan:SaasPlan){return plans[plan]}
export function hasFeature(plan:SaasPlan,feature:SaasFeature,overrides?:Partial<Record<SaasFeature,boolean>>){const override=overrides?.[feature];return override??plans[plan].features.has(feature)}
export function assertFeature(plan:SaasPlan,feature:SaasFeature,overrides?:Partial<Record<SaasFeature,boolean>>){if(!hasFeature(plan,feature,overrides))throw new Error("SAAS_FEATURE_NOT_ENTITLED")}
export function assertLimit(plan:SaasPlan,limit:keyof SaasLimits,current:number,incoming=1){if(current+incoming>plans[plan].limits[limit])throw new Error("SAAS_PLAN_LIMIT_EXCEEDED")}
