const required=['SAAS_DATABASE_URL','SAAS_DIRECT_URL'];
for(const key of required){if(!process.env[key]){console.error(`[saas-db-guard] ${key} missing`);process.exit(1)}}
if(process.env.SAAS_ALLOW_MIGRATIONS!=='1'){console.error('[saas-db-guard] migrations locked; set SAAS_ALLOW_MIGRATIONS=1 only in the isolated SaaS environment');process.exit(1)}
const normalize=(value)=>{try{const u=new URL(value);return `${u.hostname}/${u.pathname.replace(/^\//,'')}`}catch{return value}};
const prod=[process.env.DATABASE_URL,process.env.DIRECT_URL].filter(Boolean).map(normalize);
const saas=required.map(k=>normalize(process.env[k]));
if(saas.some(v=>prod.includes(v))){console.error('[saas-db-guard] REFUSED: SaaS database resolves to a Moriah application database target');process.exit(1)}
if(process.env.VERCEL_ENV==='production'){console.error('[saas-db-guard] REFUSED: SaaS foundation migrations cannot run in Vercel Production');process.exit(1)}
console.log('[saas-db-guard] isolated SaaS database target accepted');
