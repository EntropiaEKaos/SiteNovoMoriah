"use client";

import {usePathname} from "next/navigation";
import styles from "./whatsapp-button.module.css";

type Props={
  enabled:boolean;
  number:string;
  message:string;
  label:string;
  position:"LEFT"|"RIGHT";
};

function cleanNumber(value:string){
  return value.replace(/\D/g,"");
}

export default function WhatsAppButton({enabled,number,message,label,position}:Props){
  const pathname=usePathname();
  const digits=cleanNumber(number);

  if(
    !enabled||
    digits.length<10||
    pathname.startsWith("/admin")||
    pathname.startsWith("/widget/")
  )return null;

  const href="https://wa.me/"+digits+"?text="+encodeURIComponent(message);
  const side=position==="RIGHT"?styles.right:styles.left;

  return <a
    className={styles.button+" "+side}
    href={href}
    target="_blank"
    rel="noreferrer"
    aria-label={label||"Fale no WhatsApp"}
    title={label||"Fale no WhatsApp"}
  >
    <span className={styles.icon} aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img">
        <path fill="currentColor" d="M16.04 3C8.87 3 3.05 8.72 3.05 15.79c0 2.27.61 4.48 1.77 6.42L3 29l7.01-1.79a13.12 13.12 0 0 0 6.02 1.45h.01c7.16 0 12.99-5.72 12.99-12.78C29.03 8.82 23.2 3 16.04 3Zm0 23.5a10.9 10.9 0 0 1-5.55-1.5l-.4-.24-4.16 1.06 1.11-4.02-.26-.41a10.57 10.57 0 0 1-1.65-5.6c0-5.89 4.91-10.68 10.95-10.68 6.03 0 10.94 4.79 10.94 10.68 0 5.9-4.91 10.71-10.94 10.71Zm6-8.01c-.33-.16-1.96-.95-2.26-1.06-.3-.11-.52-.16-.74.16-.22.32-.85 1.06-1.04 1.28-.19.21-.38.24-.71.08-.33-.16-1.39-.5-2.64-1.6-.98-.85-1.64-1.9-1.83-2.22-.19-.32-.02-.5.14-.66.15-.14.33-.37.49-.56.16-.19.22-.32.33-.53.11-.21.05-.4-.03-.56-.08-.16-.74-1.75-1.01-2.4-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.4-.3.32-1.15 1.1-1.15 2.68s1.18 3.11 1.34 3.33c.16.21 2.32 3.48 5.63 4.88.79.34 1.4.54 1.88.69.79.24 1.5.21 2.07.13.63-.09 1.96-.79 2.24-1.55.27-.77.27-1.43.19-1.56-.08-.13-.3-.21-.63-.37Z"/>
      </svg>
    </span>
    <span className={styles.copy}>{label||"Fale no WhatsApp"}</span>
  </a>;
}
