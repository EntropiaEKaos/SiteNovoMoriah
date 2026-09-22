import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";

const COOKIE="moriah_admin";
const MAX_AGE=60*60*12;
export type AdminSession={userId:string;username:string;role:string;expires:number};

function secret(){return process.env.SESSION_SECRET||""}
function encode(value:string){return Buffer.from(value,"utf8").toString("base64url")}
function decode(value:string){return Buffer.from(value,"base64url").toString("utf8")}
function sign(value:string){return createHmac("sha256",secret()).update(value).digest("hex")}
function safeEqual(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)}

export async function getAdminSession():Promise<AdminSession|null>{
  const raw=(await cookies()).get(COOKIE)?.value;
  if(!raw||!secret())return null;
  const dot=raw.lastIndexOf(".");
  if(dot<1)return null;
  const payload=raw.slice(0,dot),sig=raw.slice(dot+1);
  if(!safeEqual(sig,sign(payload)))return null;
  try{
    const data=JSON.parse(decode(payload)) as Partial<AdminSession>;
    if(!data.userId||!data.username||!data.role||!Number.isFinite(data.expires)||Date.now()>=Number(data.expires))return null;
    return {userId:data.userId,username:data.username,role:data.role,expires:Number(data.expires)};
  }catch{return null}
}
export async function isAdmin(){return Boolean(await getAdminSession())}
export async function requireAdmin(){const session=await getAdminSession();if(!session)redirect("/admin/login");return session}
export async function requireSuperAdmin(){const session=await requireAdmin();if(session.role!=="SUPERADMIN")redirect("/admin");return session}
export async function createAdminSession(user:{id:string;username:string;role:string}){
  if(!secret())throw new Error("SESSION_SECRET não configurado.");
  const data:AdminSession={userId:user.id,username:user.username,role:user.role,expires:Date.now()+MAX_AGE*1000};
  const payload=encode(JSON.stringify(data));
  (await cookies()).set(COOKIE,payload+"."+sign(payload),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:MAX_AGE});
}
export async function clearAdminSession(){(await cookies()).delete(COOKIE)}
