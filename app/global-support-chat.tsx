"use client";

import {usePathname} from "next/navigation";
import SupportChat from "./support-chat";

export default function GlobalSupportChat({locale}:{locale:"pt"|"en"|"es"}){
  const pathname=usePathname();
  if(pathname.startsWith("/admin"))return null;
  return <SupportChat locale={locale}/>;
}
