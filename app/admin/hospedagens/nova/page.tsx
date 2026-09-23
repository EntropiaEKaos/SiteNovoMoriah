import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {createAccommodation} from "../../actions";
import AccommodationForm from "../accommodation-form";

export const dynamic="force-dynamic";

export default async function Page(){
  const media=await prisma.media.findMany({
    orderBy:{createdAt:"desc"},
    take:200
  });

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / HOSPEDAGENS</small>
        <h1>Nova hospedagem</h1>
        <p>Cadastre a unidade com dados comerciais, capacidade, operação, comodidades e imagens.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/hospedagens">← Voltar</Link>
        <Link className="adminSecondaryAction" href="/admin/galeria">Gerenciar imagens →</Link>
      </div>
    </section>

    <AccommodationForm action={createAccommodation} media={media}/>
  </main>;
}
