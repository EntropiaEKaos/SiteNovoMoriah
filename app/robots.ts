import type {MetadataRoute} from "next";

function siteUrl(){
  const explicit=process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if(explicit)return explicit.replace(/\/$/,"");
  const production=process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if(production)return "https://"+production.replace(/^https?:\/\//,"").replace(/\/$/,"");
  return "https://moriah-khaki.vercel.app";
}

export default function robots():MetadataRoute.Robots{
  const base=siteUrl();

  return {
    rules:[
      {
        userAgent:"*",
        allow:"/",
        disallow:["/admin/","/api/"]
      }
    ],
    sitemap:base+"/sitemap.xml",
    host:base
  };
}
