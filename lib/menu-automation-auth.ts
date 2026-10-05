import "server-only";
import {createHash,timingSafeEqual} from "node:crypto";

function configuredToken(){return process.env.MORIAH_MENU_AUTOMATION_TOKEN||"";}
function digest(value:string){return createHash("sha256").update(value).digest();}

export function isMenuAutomationAuthorized(authorization:string|null){
  const expected=configuredToken();
  if(!expected||!authorization?.startsWith("Bearer "))return false;
  const supplied=authorization.slice(7).trim();
  if(!supplied)return false;
  return timingSafeEqual(digest(supplied),digest(expected));
}

export function menuAutomationConfigured(){return Boolean(configuredToken());}
