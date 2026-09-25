import "server-only";
import {cookies} from "next/headers";

export type SiteLocale="pt"|"en"|"es";
const allowed=new Set<SiteLocale>(["pt","en","es"]);

export async function getSiteLocale():Promise<SiteLocale>{
  const store=await cookies();
  const value=store.get("moriah-locale")?.value as SiteLocale|undefined;
  return value&&allowed.has(value)?value:"pt";
}

export function localizeRecord<T extends Record<string,unknown>>(record:T|null|undefined,locale:SiteLocale):T|null{
  if(!record)return null;
  if(locale==="pt")return record;
  const raw=record.translations;
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return record;
  const byLocale=(raw as Record<string,unknown>)[locale];
  if(!byLocale||typeof byLocale!=="object"||Array.isArray(byLocale))return record;
  const patch=byLocale as Record<string,unknown>;
  const next={...record};
  for(const [key,value] of Object.entries(patch)){
    if(value!==null&&value!==undefined&&value!=="") (next as Record<string,unknown>)[key]=value;
  }
  return next;
}

export const uiText={
  pt:{stay:"Hospedagem",structure:"Estrutura",events:"Eventos",contact:"Contato",book:"Ver disponibilidade",direct:"Reserva direta • atendimento da própria pousada",reserve:"Reservar",explore:"EXPLORE",contactTitle:"CONTATO",directFooter:"RESERVA DIRETA • PRAIA GRANDE"},
  en:{stay:"Stay",structure:"Amenities",events:"Events",contact:"Contact",book:"Check availability",direct:"Direct booking • service by our own team",reserve:"Book",explore:"EXPLORE",contactTitle:"CONTACT",directFooter:"DIRECT BOOKING • PRAIA GRANDE"},
  es:{stay:"Hospedaje",structure:"Estructura",events:"Eventos",contact:"Contacto",book:"Ver disponibilidad",direct:"Reserva directa • atención del propio alojamiento",reserve:"Reservar",explore:"EXPLORAR",contactTitle:"CONTACTO",directFooter:"RESERVA DIRECTA • PRAIA GRANDE"}
} as const;
