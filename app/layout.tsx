import type {Metadata} from "next";
import {loadPublicSiteSettings} from "../lib/public-site-settings";
import PwaRegister from "./pwa-register";
import GlobalSupportChat from "./global-support-chat";
import WhatsAppButton from "./whatsapp-button";
import {getI18n,getSiteLocale,localizeRecord} from "../lib/site-i18n";
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
  const messages=getI18n(locale);

  return <html lang={lang}>
    <body>
      <PwaRegister/>
      <GlobalSupportChat locale={locale}/>
      <WhatsAppButton
        enabled={settings?.whatsappFloatingEnabled??true}
        number={settings?.whatsapp||""}
        message={settings?.whatsappFloatingMessage||messages.common.whatsappMessage}
        label={settings?.whatsappFloatingLabel||messages.common.whatsappLabel}
        position={settings?.whatsappFloatingPosition==="RIGHT"?"RIGHT":"LEFT"}
      />
      {children}
    </body>
  </html>;
}
