import {NextRequest,NextResponse} from "next/server";

import {siteLocales} from "../../../i18n/catalog";

const allowed=new Set<string>(siteLocales);

export async function GET(req:NextRequest){
  const locale=req.nextUrl.searchParams.get("locale")||"pt";
  const returnTo=req.nextUrl.searchParams.get("returnTo")||"/";
  const safeLocale=allowed.has(locale)?locale:"pt";
  const safeReturn=returnTo.startsWith("/")&&!returnTo.startsWith("//")?returnTo:"/";
  const response=NextResponse.redirect(new URL(safeReturn,req.url));
  response.cookies.set("moriah-locale",safeLocale,{
    httpOnly:false,
    sameSite:"lax",
    secure:process.env.NODE_ENV==="production",
    path:"/",
    maxAge:60*60*24*365
  });
  return response;
}
