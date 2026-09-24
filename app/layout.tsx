import type {Metadata} from "next";
import {loadPublicSiteSettings} from "../lib/public-site-settings";
import PwaRegister from "./pwa-register";
import GlobalSupportChat from "./global-support-chat";
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

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR">
    <body>
      <PwaRegister/>
      <GlobalSupportChat/>
      {children}
    </body>
  </html>;
}
