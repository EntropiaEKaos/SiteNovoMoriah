import Link from "next/link";
import {prisma} from "../lib/prisma";

export default async function PublicSubNav(){
  const pages=await prisma.sitePage.findMany({
    where:{published:true,showInNav:true,slug:{not:"home"}},
    select:{slug:true,title:true,navLabel:true},
    orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],
    take:6
  });

  return <header className="publicSubNav">
    <Link href="/" aria-label="Voltar para a página inicial"><b>MORIAH<span>.</span></b></Link>
    <div>
      <Link href="/">Início</Link>
      {pages.map(page=><Link href={"/"+page.slug} key={page.slug}>{page.navLabel||page.title}</Link>)}
      <Link href="/blog">Blog</Link>
      <Link href="/restaurante">Moriah Food</Link>
      <Link className="publicPrimary" href="/reservar">Reservar</Link>
    </div>
  </header>;
}
