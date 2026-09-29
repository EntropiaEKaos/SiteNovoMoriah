import { PrismaClient } from '../../generated/saas-client';
const prisma = new PrismaClient();
const plans = [
 {code:'STARTER',name:'Starter',monthlyPriceCents:0,trialDays:14,features:['HOSPITALITY','RESERVATIONS','CALENDAR','CALENDAR_WIDGET','NOTIFICATIONS'],limits:{properties:1,members:3,accommodations:15}},
 {code:'PROFESSIONAL',name:'Professional',monthlyPriceCents:0,trialDays:14,features:['HOSPITALITY','RESERVATIONS','CALENDAR','CALENDAR_WIDGET','CHANNELS','NOTIFICATIONS','RESTAURANT','KITCHEN','DELIVERY','RENTALS','EVENTS'],limits:{properties:1,members:10,accommodations:60}},
 {code:'BUSINESS',name:'Business',monthlyPriceCents:0,trialDays:14,features:['HOSPITALITY','RESERVATIONS','CALENDAR','CALENDAR_WIDGET','CHANNELS','NOTIFICATIONS','RESTAURANT','KITCHEN','DELIVERY','RENTALS','EVENTS','FINANCE','CMS','CUSTOM_DOMAIN','API'],limits:{properties:10,members:50,accommodations:500}},
 {code:'ENTERPRISE',name:'Enterprise',monthlyPriceCents:0,trialDays:14,features:['ALL'],limits:{properties:9999,members:9999,accommodations:999999}},
];
async function main(){
 if(process.env.SAAS_ALLOW_SEED!=='1') throw new Error('SAAS_SEED_BLOCKED');
 if(process.env.VERCEL_ENV==='production') throw new Error('SAAS_SEED_PRODUCTION_BLOCKED');
 for(const p of plans) await prisma.planCatalog.upsert({where:{code:p.code},update:p,create:p});
 console.log(`Seeded ${plans.length} SaaS plans`);
}
main().finally(()=>prisma.$disconnect());
