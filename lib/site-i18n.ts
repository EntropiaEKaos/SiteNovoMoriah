import "server-only";
import {cookies} from "next/headers";
import {
  defaultSiteLocale,
  getI18n,
  siteLocales,
  type SiteLocale
} from "../i18n/catalog";

export type {SiteLocale} from "../i18n/catalog";
const allowed=new Set<SiteLocale>(siteLocales);

export async function getSiteLocale():Promise<SiteLocale>{
  const store=await cookies();
  const value=store.get("moriah-locale")?.value as SiteLocale|undefined;
  return value&&allowed.has(value)?value:defaultSiteLocale;
}

export function localizeRecord<T>(record:T|null|undefined,locale:SiteLocale):T|null{
  if(!record)return null;
  if(locale==="pt")return record;
  const objectRecord=record as unknown as Record<string,unknown>;
  const raw=objectRecord.translations;
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return record;
  const byLocale=(raw as Record<string,unknown>)[locale];
  if(!byLocale||typeof byLocale!=="object"||Array.isArray(byLocale))return record;
  const patch=byLocale as Record<string,unknown>;
  const next={...objectRecord};
  for(const [key,value] of Object.entries(patch)){
    if(value!==null&&value!==undefined&&value!=="")next[key]=value;
  }
  return next as unknown as T;
}

export const uiText={
  pt:{...getI18n("pt").nav,direct:getI18n("pt").common.direct},
  en:{...getI18n("en").nav,direct:getI18n("en").common.direct},
  es:{...getI18n("es").nav,direct:getI18n("es").common.direct}
} as const;

export {getI18n};
