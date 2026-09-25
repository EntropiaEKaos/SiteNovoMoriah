import Link from "next/link";
import type {CSSProperties} from "react";
import {ArrowRight,MapPin,MessageCircle} from "lucide-react";
import type {PublicSiteSettings} from "../lib/public-site-settings";
import type {SiteLocale} from "../lib/site-i18n";
import {uiText} from "../lib/site-i18n";
import LanguageSwitcher from "./language-switcher";

export default function PublicSiteChrome({
  settings,
  navPages,
  children,
  locale
}:{
  settings:PublicSiteSettings|null;
  navPages:Array<{slug:string;title:string;navLabel:string|null}>;
  children:React.ReactNode;
  locale:SiteLocale;
}){
  const name=settings?.siteName||"Pousada Moriah";
  const t=uiText[locale];
  const wa=settings?.whatsapp?.replace(/\D/g,"");
  const whatsappHref=wa
    ?"https://wa.me/"+wa+"?text="+encodeURIComponent("Olá! Vim pelo site da Pousada Moriah e gostaria de informações sobre hospedagem.")
    :null;

  const style={
    "--site-blue":settings?.primaryColor||"#0b607a",
    "--site-blue-dark":settings?.secondaryColor||"#073b4c",
    "--site-yellow":settings?.accentColor||"#ffc845",
    "--site-page-bg":settings?.backgroundColor||"#f4f7f8",
    "--site-text":settings?.textColor||"#1b252b",
    "--site-button":settings?.buttonColor||settings?.primaryColor||"#0b607a"
  } as CSSProperties;

  return <main className="siteV4" style={style}>
    <div className="siteTopBarV6">
      <span><MapPin size={13}/>{settings?.address||"Praia Grande — SP"}</span>
      <span>{t.direct}</span>
      {whatsappHref&&<a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={13}/> WhatsApp</a>}
    </div>

    <header className="siteNavV4">
      <Link className="siteBrandV4" href="/">
        {settings?.logoUrl
          ?<img className="siteBrandLogoV6" src={settings.logoUrl} alt={name}/>
          :<span className="siteBrandMarkV4">M</span>}
        <span><b>{name}</b><small>{settings?.tagline||"POUSADA • PRAIA GRANDE"}</small></span>
      </Link>

      <nav className="siteNavLinksV4" aria-label="Navegação principal">
        <Link href="/#hospedagem">{t.stay}</Link>
        <Link href="/#estrutura">{t.structure}</Link>
        {navPages.map(page=><Link href={"/"+page.slug} key={page.slug}>{page.navLabel||page.title}</Link>)}
        <Link href="/eventos">{t.events}</Link>
        <Link href="/restaurante">Moriah Food</Link>
        <Link href="/blog">Journal</Link>
        <Link href="/#contato">{t.contact}</Link>
      </nav>

      <div className="siteNavActionsV7"><LanguageSwitcher locale={locale}/><Link className="siteBookV4" href="/reservar">{t.book} <ArrowRight size={16}/></Link></div>
    </header>

    {children}

    <footer id="contato" className="siteFooterV4">
      <div className="siteFooterBrand">
        {settings?.logoLightUrl||settings?.logoUrl
          ?<img className="siteBrandLogoV6 isFooter" src={settings.logoLightUrl||settings.logoUrl||""} alt={name}/>
          :<span className="siteBrandMarkV4">M</span>}
        <div>
          <b>{name}</b>
          <p>{settings?.tagline||"Hospedagem leve, prática e acolhedora em Praia Grande."}</p>
        </div>
      </div>

      <div className="siteFooterColumn">
        <small>{t.explore}</small>
        <Link href="/#hospedagem">{t.stay}</Link>
        <Link href="/reservar">{t.reserve}</Link>
        {navPages.slice(0,5).map(page=><Link href={"/"+page.slug} key={page.slug}>{page.navLabel||page.title}</Link>)}
        <Link href="/restaurante">Moriah Food</Link>
        <Link href="/blog">Journal</Link>
      </div>

      <div className="siteFooterColumn">
        <small>{t.contactTitle}</small>
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
        <small>{t.directFooter}</small>
      </div>
    </footer>
  </main>;
}
