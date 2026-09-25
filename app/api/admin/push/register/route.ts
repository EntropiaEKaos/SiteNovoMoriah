import {NextRequest,NextResponse} from "next/server";
import {getAdminSession} from "../../../../../lib/admin-auth";
import {prisma} from "../../../../../lib/prisma";

export const dynamic="force-dynamic";

async function activeSession(){
  const session=await getAdminSession();
  if(!session)return null;
  const user=await prisma.adminUser.findUnique({
    where:{id:session.userId},
    select:{id:true,active:true}
  });
  return user?.active?session:null;
}

export async function POST(req:NextRequest){
  const session=await activeSession();
  if(!session)return NextResponse.json({error:"unauthorized"},{status:401});

  let body:unknown;
  try{body=await req.json()}catch{return NextResponse.json({error:"invalid_json"},{status:400})}
  const data=body&&typeof body==="object"?body as Record<string,unknown>:{};
  const token=String(data.token||"").trim();
  if(token.length<40||token.length>5000)return NextResponse.json({error:"invalid_token"},{status:400});

  const deviceName=String(data.deviceName||"").trim().slice(0,120)||null;
  const platform=String(data.platform||"").trim().slice(0,80)||null;
  const userAgent=(req.headers.get("user-agent")||"").slice(0,500)||null;

  const device=await prisma.adminPushDevice.upsert({
    where:{token},
    create:{
      token,
      adminUserId:session.userId,
      deviceName,
      platform,
      userAgent,
      active:true,
      lastSeenAt:new Date()
    },
    update:{
      adminUserId:session.userId,
      deviceName,
      platform,
      userAgent,
      active:true,
      lastSeenAt:new Date()
    },
    select:{id:true,deviceName:true,platform:true,active:true,lastSeenAt:true}
  });

  return NextResponse.json({ok:true,device});
}

export async function DELETE(req:NextRequest){
  const session=await activeSession();
  if(!session)return NextResponse.json({error:"unauthorized"},{status:401});
  let body:unknown;
  try{body=await req.json()}catch{return NextResponse.json({error:"invalid_json"},{status:400})}
  const token=String((body as Record<string,unknown>)?.token||"").trim();
  if(!token)return NextResponse.json({error:"invalid_token"},{status:400});

  await prisma.adminPushDevice.updateMany({
    where:{token,adminUserId:session.userId},
    data:{active:false,lastSeenAt:new Date()}
  });
  return NextResponse.json({ok:true});
}
