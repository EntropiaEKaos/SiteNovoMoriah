"use client";

import {usePathname} from "next/navigation";
import SupportChat from "./support-chat";

export default function GlobalSupportChat(){
  const pathname=usePathname();
  if(pathname.startsWith("/admin"))return null;
  return <SupportChat/>;
}
