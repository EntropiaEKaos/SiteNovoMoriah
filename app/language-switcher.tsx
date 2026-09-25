"use client";
import {usePathname,useSearchParams} from "next/navigation";

export default function LanguageSwitcher({locale}:{locale:"pt"|"en"|"es"}){
  const pathname=usePathname();
  const search=useSearchParams();
  const query=search.toString();
  const returnTo=pathname+(query?"?"+query:"");
  return <div className="siteLanguageSwitcher" aria-label="Idioma / Language / Idioma">
    {(["pt","en","es"] as const).map(value=><a
      key={value}
      className={locale===value?"isActive":""}
      href={"/api/locale?locale="+value+"&returnTo="+encodeURIComponent(returnTo)}
    >{value.toUpperCase()}</a>)}
  </div>;
}
