import {spawnSync} from "node:child_process";

function run(command,args,env=process.env){
  const result=spawnSync(command,args,{stdio:"inherit",env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}

function resolveFailedRouletteMigration(env){
  const migration="20260925195500_multi_roulette_campaigns";
  const result=spawnSync(
    npx,
    ["prisma","migrate","resolve","--rolled-back",migration],
    {env,encoding:"utf8"}
  );

  const output=[result.stdout,result.stderr].filter(Boolean).join("\n");
  if(output)process.stdout.write(output.endsWith("\n")?output:output+"\n");

  if(result.error)throw result.error;
  if(result.status===0){
    console.log(`Marked failed migration ${migration} as rolled back so it can be retried safely.`);
    return;
  }

  if(/P3012/.test(output)){
    console.log(`Migration ${migration} is not in a failed state; no recovery step was needed.`);
    return;
  }

  console.error(`Could not inspect/recover migration ${migration}.`);
  process.exit(result.status??1);
}

const npx=process.platform==="win32"?"npx.cmd":"npx";
const vercelEnv=process.env.VERCEL_ENV||"local";
const previewMigrations=vercelEnv==="preview"&&process.env.RUN_PREVIEW_MIGRATIONS==="1";
const shouldMigrate=vercelEnv==="production"||previewMigrations;

console.log(`Moriah Vercel build environment: ${vercelEnv}`);

run(npx,["prisma","generate"]);

if(shouldMigrate){
  const directUrl=process.env.DIRECT_URL;
  if(!directUrl){
    console.error(
      vercelEnv==="production"
        ?"DIRECT_URL is required for production migrations."
        :"RUN_PREVIEW_MIGRATIONS=1 requires DIRECT_URL in the Preview environment."
    );
    process.exit(1);
  }

  console.log(
    vercelEnv==="production"
      ?"Running production Prisma migrations through DIRECT_URL."
      :"Running explicitly enabled Preview Prisma migrations through DIRECT_URL."
  );

  const migrationEnv={
    ...process.env,
    DATABASE_URL:directUrl
  };

  // Recovery for the 2026-09-25 roulette migration that previously failed
  // with PostgreSQL 42804 while seeding nullable integer columns. The
  // migration itself is now idempotent, so a genuinely failed attempt can
  // be marked rolled back and safely retried. P3012 means there is nothing
  // to recover and is intentionally tolerated; every other error aborts.
  resolveFailedRouletteMigration(migrationEnv);

  run(npx,["prisma","migrate","deploy"],migrationEnv);
}else{
  console.log(
    vercelEnv==="preview"
      ?"Skipping Preview migrations. Set RUN_PREVIEW_MIGRATIONS=1 and provide Preview DIRECT_URL to enable them."
      :"Skipping prisma migrate deploy outside Vercel production."
  );
}

run(npx,["next","build"]);
