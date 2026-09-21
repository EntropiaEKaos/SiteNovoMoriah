import {createHmac,timingSafeEqual} from "node:crypto";import {cookies} from "next/headers";import {redirect} from "next/navigation";
const COOKIE="moriah_admin";
function secret(){return process.env.SESSION_SECRET||""}
function sign(value:string){return createHmac("sha256",secret()).update(value).digest("hex")}
export async function isAdmin(){const c=(await cookies()).get(COOKIE)?.value;if(!c||!secret())return false;const [payload,sig]=c.split(".");if(!payload||!sig)return false;const expected=sign(payload);if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;const expires=Number(payload);return Number.isFinite(expires)&&Date.now()<expires}
export async function requireAdmin(){if(!(await isAdmin()))redirect("/admin/login")}
export async function createAdminSession(){const expires=Date.now()+1000*60*60*12;const payload=String(expires);(await cookies()).set(COOKIE,payload+"."+sign(payload),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*12})}
export async function clearAdminSession(){(await cookies()).delete(COOKIE)}
