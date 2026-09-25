import type {SiteSettings} from "@prisma/client";
import {prisma} from "./prisma";

export type PublicSiteSettings=
  Pick<SiteSettings,"siteName"|"tagline"|"whatsapp"|"instagram"|"address"> &
  Partial<Pick<
    SiteSettings,
    "logoUrl"|
    "logoLightUrl"|
    "faviconUrl"|
    "defaultBackgroundImageUrl"|
    "primaryColor"|
    "secondaryColor"|
    "accentColor"|
    "backgroundColor"|
    "textColor"|
    "buttonColor"|
    "whatsappFloatingEnabled"|
    "whatsappFloatingMessage"|
    "whatsappFloatingLabel"|
    "whatsappFloatingPosition"|
    "translations"
  >>;

export async function loadPublicSiteSettings():Promise<PublicSiteSettings|null>{
  let base:Pick<SiteSettings,"siteName"|"tagline"|"whatsapp"|"instagram"|"address">|null=null;

  try{
    base=await prisma.siteSettings.findUnique({
      where:{id:"main"},
      select:{
        siteName:true,
        tagline:true,
        whatsapp:true,
        instagram:true,
        address:true
      }
    });
  }catch(error){
    console.error("PUBLIC_SITE_SETTINGS_BASE_FAILED",error);
    return null;
  }

  if(!base)return null;

  try{
    const branding=await prisma.siteSettings.findUnique({
      where:{id:"main"},
      select:{
        logoUrl:true,
        logoLightUrl:true,
        faviconUrl:true,
        defaultBackgroundImageUrl:true,
        primaryColor:true,
        secondaryColor:true,
        accentColor:true,
        backgroundColor:true,
        textColor:true,
        buttonColor:true,
        whatsappFloatingEnabled:true,
        whatsappFloatingMessage:true,
        whatsappFloatingLabel:true,
        whatsappFloatingPosition:true,
        translations:true
      }
    });
    return {...base,...(branding||{})};
  }catch(error){
    console.warn("PUBLIC_SITE_BRANDING_SCHEMA_PENDING");
    return base;
  }
}
