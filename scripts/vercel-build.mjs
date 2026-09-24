import {spawnSync} from "node:child_process";

function run(command,args,env=process.env){
  const result=spawnSync(command,args,{stdio:"inherit",env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
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

  run(npx,["prisma","migrate","deploy"],{
    ...process.env,
    DATABASE_URL:directUrl
  });
}else{
  console.log(
    vercelEnv==="preview"
      ?"Skipping Preview migrations. Set RUN_PREVIEW_MIGRATIONS=1 and provide Preview DIRECT_URL to enable them."
      :"Skipping prisma migrate deploy outside Vercel production."
  );
}

run(npx,["next","build"]);
