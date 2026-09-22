import "server-only";
import {createHmac,randomBytes,scryptSync,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {prisma} from "./prisma";

const COOKIE="moriah_admin";
function secret(){return process.env.SESSION_SECRET||""}
function sign(value:string){return createHmac("sha256",secret()).update(value).digest("hex")}
export function hashAdminPassword(password:string,salt:string){return scryptSync(password,salt,64,{N:16384,r:8,p:1}).toString("hex")}
export function newPasswordSalt(){return randomBytes(16).toString("hex")}
export function passwordMatches(password:string,salt:string,expected:string){const actual=hashAdminPassword(password,salt);return actual.length===expected.length&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected))}
type Session={uid:string;role:string;exp:number};
function encode(s:Session){return Buffer.from(JSON.stringify(s)).toString("base64url")}
function decode(value:string):Session|null{try{const s=JSON.parse(Buffer.from(value,"base64url").toString("utf8"));return typeof s.uid==="string"&&typeof s.role==="string"&&Number.isFinite(s.exp)?s:null}catch{return null}}
export async function adminSession(){const c=(await cookies()).get(COOKIE)?.value;if(!c||!secret())return null;const dot=c.lastIndexOf(".");if(dot<1)return null;const payload=c.slice(0,dot),sig=c.slice(dot+1),expected=sign(payload);if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const session=decode(payload);if(!session||Date.now()>=session.exp)return null;const user=await prisma.adminUser.findFirst({where:{id:session.uid,active:true},select:{id:true,username:true,role:true,mustChangePassword:true}});return user&&user.role===session.role?user:null}
export async function isAdmin(){return Boolean(await adminSession())}
export async function requireAdmin(){const user=await adminSession();if(!user)redirect("/admin/login");return user}
export async function requireSuperAdmin(){const user=await requireAdmin();if(user.role!=="SUPER_ADMIN")throw new Error("Ação exclusiva do Super Admin.");return user}
export async function createAdminSession(user:{id:string;role:string}){if(!secret())throw new Error("SESSION_SECRET não configurado.");const exp=Date.now()+1000*60*60*12;const payload=encode({uid:user.id,role:user.role,exp});(await cookies()).set(COOKIE,payload+"."+sign(payload),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*12})}
export async function clearAdminSession(){(await cookies()).delete(COOKIE)}
