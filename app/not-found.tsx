import Link from "next/link";

export default function NotFound(){
  return <main className="systemStatePage">
    <small>MORIAH / 404</small>
    <h1>Esta página não existe.</h1>
    <p>O endereço pode ter mudado ou a página pode estar em rascunho no Site Studio.</p>
    <div>
      <Link className="sitePrimaryCta" href="/">Voltar ao início</Link>
      <Link className="siteSecondaryCta" href="/reservar">Reservar</Link>
    </div>
  </main>;
}
