import type {MetadataRoute} from "next";
import {prisma} from "../lib/prisma";

function siteUrl(){
  const explicit=process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if(explicit)return explicit.replace(/\/$/,"");
  const production=process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if(production)return "https://"+production.replace(/^https?:\/\//,"").replace(/\/$/,"");
  return "https://moriah-khaki.vercel.app";
}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=siteUrl();

  const [pages,posts]=await Promise.all([
    prisma.sitePage.findMany({
      where:{published:true},
      select:{slug:true,updatedAt:true}
    }),
    prisma.blogPost.findMany({
      where:{published:true},
      select:{slug:true,updatedAt:true}
    })
  ]);

  return [
    {url:base,lastModified:new Date(),changeFrequency:"daily",priority:1},
    {url:base+"/reservar",lastModified:new Date(),changeFrequency:"daily",priority:.9},
    {url:base+"/restaurante",lastModified:new Date(),changeFrequency:"daily",priority:.8},
    {url:base+"/blog",lastModified:new Date(),changeFrequency:"weekly",priority:.7},
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
    }))
  ];
}
