import {NextRequest,NextResponse} from "next/server";

const COOKIE="moriah_admin";

function hexBytes(hex:string){
  if(!/^[0-9a-f]{64}$/i.test(hex))return null;
  const out=new Uint8Array(hex.length/2);
  for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);
  return out;
}

function decodeBase64Url(value:string){
  const base64=value.replace(/-/g,"+").replace(/_/g,"/");
  const padded=base64+"=".repeat((4-base64.length%4)%4);
  return atob(padded);
}

async function valid(req:NextRequest){
  const secret=process.env.SESSION_SECRET;
  if(!secret)return false;

  const raw=req.cookies.get(COOKIE)?.value;
  if(!raw)return false;

  const dot=raw.lastIndexOf(".");
  if(dot<1)return false;

  const payload=raw.slice(0,dot);
  const sig=raw.slice(dot+1);
  const bytes=hexBytes(sig);
  if(!bytes)return false;

  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    {name:"HMAC",hash:"SHA-256"},
    false,
    ["verify"]
  );

  const signatureValid=await crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    enc.encode(payload)
  );
  if(!signatureValid)return false;

  try{
    const data=JSON.parse(decodeBase64Url(payload)) as {
      userId?:string;
      username?:string;
      role?:string;
      expires?:number;
    };
    return Boolean(
      data.userId &&
      data.username &&
      data.role &&
      Number.isFinite(data.expires) &&
      Date.now()<Number(data.expires)
    );
  }catch{
    return false;
  }
}

export async function middleware(req:NextRequest){
  if(req.nextUrl.pathname==="/admin/login"||req.nextUrl.pathname==="/admin/setup"){
    return NextResponse.next();
  }
  if(await valid(req))return NextResponse.next();

  const url=req.nextUrl.clone();
  url.pathname="/admin/login";
  url.search="";
  return NextResponse.redirect(url);
}

export const config={matcher:["/admin/:path*"]};
