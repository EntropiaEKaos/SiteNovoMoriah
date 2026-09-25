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

function restaurantHost(req:NextRequest){
  const host=(req.headers.get("host")||"").split(":")[0].toLowerCase();
  const configured=(process.env.RESTAURANT_SUBDOMAIN_HOST||"").trim().toLowerCase();
  if(configured&&host===configured)return true;
  return host.startsWith("restaurante.")||host.startsWith("food.");
}

function restaurantRewrite(req:NextRequest){
  if(!restaurantHost(req))return null;
  const path=req.nextUrl.pathname;
  const target=path==="/"||path==="/cardapio"
    ?"/restaurante-standalone"
    :path==="/pedido-confirmado"
      ?"/restaurante-standalone/obrigado"
      :null;
  if(!target)return null;
  const url=req.nextUrl.clone();
  url.pathname=target;
  return NextResponse.rewrite(url);
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
  const rewritten=restaurantRewrite(req);
  if(rewritten)return rewritten;

  if(!req.nextUrl.pathname.startsWith("/admin"))return NextResponse.next();

  if(req.nextUrl.pathname==="/admin/login"||req.nextUrl.pathname==="/admin/setup"){
    return NextResponse.next();
  }
  if(await valid(req))return NextResponse.next();

  const url=req.nextUrl.clone();
  url.pathname="/admin/login";
  url.search="";
  return NextResponse.redirect(url);
}

export const config={
  matcher:["/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|icon.svg|apple-icon).*)"]
};
