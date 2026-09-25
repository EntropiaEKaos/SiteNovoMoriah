import type {MetadataRoute} from "next";
import {prisma} from "../lib/prisma";

export const dynamic="force-dynamic";

function siteUrl(){
  const explicit=process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if(explicit)return explicit.replace(/\/$/,"");

  const production=process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if(production){
    return "https://"+production
      .replace(/^https?:\/\//,"")
      .replace(/\/$/,"");
  }

  return "https://moriah-khaki.vercel.app";
}

function coreRoutes(base:string):MetadataRoute.Sitemap{
  const now=new Date();
  return [
    {url:base,lastModified:now,changeFrequency:"daily",priority:1},
    {url:base+"/reservar",lastModified:now,changeFrequency:"daily",priority:.9},
    {url:base+"/restaurante",lastModified:now,changeFrequency:"daily",priority:.8},
    {url:base+"/eventos",lastModified:now,changeFrequency:"daily",priority:.8},
    {url:base+"/blog",lastModified:now,changeFrequency:"weekly",priority:.7}
  ];
}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=siteUrl();

  try{
    const [pages,posts,events]=await Promise.all([
      prisma.sitePage.findMany({
        where:{published:true},
        select:{slug:true,updatedAt:true}
      }),
      prisma.blogPost.findMany({
        where:{published:true},
        select:{slug:true,updatedAt:true}
      }),
      prisma.moriahEvent.findMany({where:{published:true},select:{slug:true,updatedAt:true}})
    ]);

    return [
      ...coreRoutes(base),
      ...pages
        .filter(page=>page.slug!=="home")
        .map(page=>({
          url:base+"/"+page.slug,
          lastModified:page.updatedAt,
          changeFrequency:"weekly" as const,
          priority:.7
        })),
      ...posts.map(post=>({
        url:base+"/blog/"+post.slug,
        lastModified:post.updatedAt,
        changeFrequency:"monthly" as const,
        priority:.6
      })),
      ...events.map(event=>({
        url:base+"/eventos/"+event.slug,
        lastModified:event.updatedAt,
        changeFrequency:"weekly" as const,
        priority:.7
      }))
    ];
  }catch(error){
    console.error("SITEMAP_DYNAMIC_CONTENT_FAILED",error);
    return coreRoutes(base);
  }
}
