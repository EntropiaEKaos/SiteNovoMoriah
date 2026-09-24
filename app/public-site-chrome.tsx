import Link from "next/link";
import {ArrowRight,MapPin,MessageCircle} from "lucide-react";
import type {SiteSettings} from "@prisma/client";

export default function PublicSiteChrome({
  settings,
  navPages,
  children
}:{
  settings:SiteSettings|null;
  navPages:Array<{slug:string;title:string;navLabel:string|null}>;
  children:React.ReactNode;
}){
  const name=settings?.siteName||"Pousada Moriah";
  const wa=settings?.whatsapp?.replace(/\D/g,"");
  const whatsappHref=wa
    ?"https://wa.me/"+wa+"?text="+encodeURIComponent("Olá! Vim pelo site da Pousada Moriah e gostaria de informações sobre hospedagem.")
    :null;

  return <main className="siteV4">
    <div className="siteTopBarV6">
      <span><MapPin size={13}/>{settings?.address||"Praia Grande — SP"}</span>
      <span>Reserva direta • atendimento da própria pousada</span>
      {whatsappHref&&<a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={13}/> WhatsApp</a>}
    </div>
    <header className="siteNavV4">
      <Link className="siteBrandV4" href="/">
        <span className="siteBrandMarkV4">M</span>
        <span><b>MORIAH</b><small>POUSADA • PRAIA GRANDE</small></span>
      </Link>

      <nav className="siteNavLinksV4" aria-label="Navegação principal">
        <Link href="/#hospedagem">Hospedagem</Link>
        <Link href="/#estrutura">Estrutura</Link>
        {navPages.map(page=><Link href={"/"+page.slug} key={page.slug}>{page.navLabel||page.title}</Link>)}
        <Link href="/restaurante">Moriah Food</Link>
        <Link href="/blog">Journal</Link>
        <Link href="/#contato">Contato</Link>
      </nav>

      <Link className="siteBookV4" href="/reservar">
        Ver disponibilidade <ArrowRight size={16}/>
      </Link>
    </header>

    {children}

    <footer id="contato" className="siteFooterV4">
      <div className="siteFooterBrand">
        <span className="siteBrandMarkV4">M</span>
        <div>
          <b>MORIAH</b>
          <p>Hospedagem leve, prática e acolhedora em Praia Grande.</p>
        </div>
      </div>

      <div className="siteFooterColumn">
        <small>EXPLORE</small>
        <Link href="/#hospedagem">Hospedagem</Link>
        <Link href="/reservar">Reservar</Link>
        {navPages.slice(0,5).map(page=><Link href={"/"+page.slug} key={page.slug}>{page.navLabel||page.title}</Link>)}
        <Link href="/restaurante">Moriah Food</Link>
        <Link href="/blog">Journal</Link>
      </div>

      <div className="siteFooterColumn">
        <small>CONTATO</small>
        <p>{settings?.address||"Praia Grande — SP"}</p>
        {settings?.instagram&&<a
          href={settings.instagram.startsWith("http")?settings.instagram:"https://instagram.com/"+settings.instagram.replace("@","")}
          target="_blank"
          rel="noreferrer"
        >Instagram ↗</a>}
        {whatsappHref&&<a href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp ↗</a>}
      </div>

      <div className="siteFooterBottom">
        <small>© 2026 {name}</small>
        <small>RESERVA DIRETA • PRAIA GRANDE</small>
      </div>
    </footer>
  </main>;
}
