import process from 'node:process';
function normalized(value){try{const u=new URL(value);return `${u.hostname.toLowerCase()}/${u.pathname.replace(/^\//,'')}`;}catch{return null}}
const saas=process.env.SAAS_DATABASE_URL;
const direct=process.env.SAAS_DIRECT_URL;
if(!saas||!direct) throw new Error('SAAS_DATABASE_URL_AND_DIRECT_URL_REQUIRED');
const targets=[process.env.DATABASE_URL,process.env.DIRECT_URL].filter(Boolean).map(normalized);
for(const value of [saas,direct]){const target=normalized(value);if(!target)throw new Error('SAAS_DATABASE_URL_INVALID');if(targets.includes(target))throw new Error('SAAS_DATABASE_COLLIDES_WITH_MORIAH');}
if(process.env.VERCEL_ENV==='production')throw new Error('SAAS_DATABASE_PRODUCTION_CONTEXT_BLOCKED');
console.log('SaaS DB preflight OK: isolated environment variables detected; Production context blocked.');
