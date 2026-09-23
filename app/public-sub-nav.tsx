import Link from "next/link";

export default function PublicSubNav(){
  return <header className="publicSubNav">
    <Link href="/" aria-label="Voltar para a página inicial"><b>MORIAH<span>.</span></b></Link>
    <div>
      <Link href="/">Início</Link>
      <Link href="/blog">Blog</Link>
      <Link href="/restaurante">Moriah Food</Link>
      <Link className="publicPrimary" href="/reservar">Reservar</Link>
    </div>
  </header>;
}
