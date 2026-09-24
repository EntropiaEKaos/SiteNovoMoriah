import {NextRequest,NextResponse} from "next/server";
import {prisma} from "../../../lib/prisma";

const allowed=new Set(["OPEN","MESSAGE","BOOKING_CTA","WHATSAPP"]);
const buckets=new Map<string,{count:number;resetAt:number}>();

function sameOrigin(req:NextRequest){
  const origin=req.headers.get("origin");
  if(!origin)return true;
  try{
    return new URL(origin).host===req.nextUrl.host;
  }catch{
    return false;
  }
}

function limited(req:NextRequest){
  const forwarded=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key=forwarded||req.headers.get("x-real-ip")||"unknown";
  const now=Date.now();
  const current=buckets.get(key);

  if(!current||current.resetAt<=now){
    buckets.set(key,{count:1,resetAt:now+60_000});
    return false;
  }

  current.count++;
  return current.count>30;
}

export async function POST(req:NextRequest){
  if(!sameOrigin(req))return NextResponse.json({ok:false},{status:403});
  if(limited(req))return NextResponse.json({ok:false},{status:429});

  try{
    const length=Number(req.headers.get("content-length")||0);
    if(length>2_000)return NextResponse.json({ok:false},{status:413});

    const {kind}=await req.json();
    if(!allowed.has(kind))return NextResponse.json({ok:false},{status:400});

    await prisma.chatMetric.create({data:{kind}});
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({ok:false},{status:400});
  }
}
