import type {Metadata} from "next";
import {loadPublicSiteSettings} from "../lib/public-site-settings";
import PwaRegister from "./pwa-register";
import GlobalSupportChat from "./global-support-chat";
import WhatsAppButton from "./whatsapp-button";
import {getSiteLocale,localizeRecord} from "../lib/site-i18n";
import "./globals.css";

export async function generateMetadata():Promise<Metadata>{
  try{
    const locale=await getSiteLocale();
    const settings=localizeRecord(await loadPublicSiteSettings(),locale);
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
  const locale=await getSiteLocale();
  let settings:Awaited<ReturnType<typeof loadPublicSiteSettings>>=null;
  try{
    settings=localizeRecord(await loadPublicSiteSettings(),locale);
  }catch(error){
    console.error("ROOT_WHATSAPP_SETTINGS_FAILED",error);
  }

  const lang=locale==="en"?"en":locale==="es"?"es":"pt-BR";
  const fallbackMessage=locale==="en"?"Hi! I came from the Moriah website and would like assistance.":locale==="es"?"¡Hola! Vengo del sitio de Moriah y quisiera atención.":"Olá! Vim pelo site da Moriah e gostaria de atendimento.";
  const fallbackLabel=locale==="en"?"Chat on WhatsApp":locale==="es"?"Hablar por WhatsApp":"Fale no WhatsApp";

  return <html lang={lang}>
    <body>
      <PwaRegister/>
      <GlobalSupportChat locale={locale}/>
      <WhatsAppButton
        enabled={settings?.whatsappFloatingEnabled??true}
        number={settings?.whatsapp||""}
        message={settings?.whatsappFloatingMessage||fallbackMessage}
        label={settings?.whatsappFloatingLabel||fallbackLabel}
        position={settings?.whatsappFloatingPosition==="RIGHT"?"RIGHT":"LEFT"}
      />
      {children}
    </body>
  </html>;
}
