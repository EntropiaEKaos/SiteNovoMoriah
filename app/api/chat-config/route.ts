import {NextResponse} from "next/server";
import {prisma} from "../../../lib/prisma";

export const dynamic="force-dynamic";

export async function GET(){
  const settings=await prisma.integrationSettings.findUnique({
    where:{id:"main"},
    select:{chatEnabled:true,chatName:true,chatWelcome:true}
  });

  const configured=Boolean(process.env.GROQ_API_KEY?.trim());
  const enabled=settings?.chatEnabled!==false&&configured;

  return NextResponse.json({
    enabled,
    configured,
    name:settings?.chatName||"Moriah Assistente",
    welcome:settings?.chatWelcome||"Olá! Sou o assistente virtual da Moriah. Como posso ajudar com sua hospedagem?"
  },{
    headers:{"Cache-Control":"no-store"}
  });
}
