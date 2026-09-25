import {NextResponse} from "next/server";
import {prisma} from "../../../lib/prisma";
import {getSiteLocale,localizeRecord} from "../../../lib/site-i18n";

export const dynamic="force-dynamic";

export async function GET(){
  const locale=await getSiteLocale();
  const settings=await prisma.integrationSettings.findUnique({
    where:{id:"main"},
    select:{chatEnabled:true,chatName:true,chatWelcome:true,translations:true}
  });

  const localized=localizeRecord(settings,locale)||settings;
  const configured=Boolean(process.env.GROQ_API_KEY?.trim());
  const enabled=settings?.chatEnabled!==false&&configured;

  return NextResponse.json({
    enabled,
    configured,
    name:localized?.chatName||(locale==="en"?"Moriah Assistant":locale==="es"?"Asistente Moriah":"Moriah Assistente"),
    welcome:localized?.chatWelcome||(locale==="en"?"Hi! I’m Moriah’s virtual assistant. How can I help with your stay?":locale==="es"?"¡Hola! Soy el asistente virtual de Moriah. ¿Cómo puedo ayudarte con tu hospedaje?":"Olá! Sou o assistente virtual da Moriah. Como posso ajudar com sua hospedagem?")
  },{
    headers:{"Cache-Control":"no-store"}
  });
}
