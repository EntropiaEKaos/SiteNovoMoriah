import type {Metadata} from "next";
import {loadPublicSiteSettings} from "../lib/public-site-settings";
import PwaRegister from "./pwa-register";
import GlobalSupportChat from "./global-support-chat";
import WhatsAppButton from "./whatsapp-button";
import "./globals.css";

export async function generateMetadata():Promise<Metadata>{
  try{
    const settings=await loadPublicSiteSettings();
    return {
      title:(settings?.siteName||"Pousada Moriah")+" | Praia Grande",
      description:settings?.tagline||"Pousada e hostel em Praia Grande",
      icons:settings?.faviconUrl?{icon:settings.faviconUrl}:undefined
    };
  }catch(error){
    console.error("ROOT_METADATA_SETTINGS_FAILED",error);
    return {
      title:"Pousada Moriah | Praia Grande",
      description:"Pousada e hostel em Praia Grande"
    };
  }
}

export default async function RootLayout({children}:{children:React.ReactNode}){
  let settings:Awaited<ReturnType<typeof loadPublicSiteSettings>>=null;
  try{
    settings=await loadPublicSiteSettings();
  }catch(error){
    console.error("ROOT_WHATSAPP_SETTINGS_FAILED",error);
  }

  return <html lang="pt-BR">
    <body>
      <PwaRegister/>
      <GlobalSupportChat/>
      <WhatsAppButton
        enabled={settings?.whatsappFloatingEnabled??true}
        number={settings?.whatsapp||""}
        message={settings?.whatsappFloatingMessage||"Olá! Vim pelo site da Moriah e gostaria de atendimento."}
        label={settings?.whatsappFloatingLabel||"Fale no WhatsApp"}
        position={settings?.whatsappFloatingPosition==="RIGHT"?"RIGHT":"LEFT"}
      />
      {children}
    </body>
  </html>;
}
