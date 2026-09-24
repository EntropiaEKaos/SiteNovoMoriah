import {spawnSync} from "node:child_process";

function run(command,args,env=process.env){
  const result=spawnSync(command,args,{stdio:"inherit",env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}

const npx=process.platform==="win32"?"npx.cmd":"npx";

run(npx,["prisma","generate"]);

if(process.env.VERCEL_ENV==="production"){
  const directUrl=process.env.DIRECT_URL;
  if(!directUrl){
    console.error("DIRECT_URL is required for production migrations.");
    process.exit(1);
  }
  run(npx,["prisma","migrate","deploy"],{
    ...process.env,
    DATABASE_URL:directUrl
  });
}else{
  console.log("Skipping prisma migrate deploy outside production.");
}

run(npx,["next","build"]);
