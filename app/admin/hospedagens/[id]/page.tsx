import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../../lib/prisma";
import {updateAccommodation} from "../../actions";
import AccommodationForm from "../accommodation-form";

export const dynamic="force-dynamic";

export default async function Page({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{saved?:string}>;
}){
  const {id}=await params;
  const query=await searchParams;
  const [room,media]=await Promise.all([
    prisma.accommodation.findUnique({where:{id}}),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:200})
  ]);
  if(!room)notFound();

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / HOSPEDAGENS</small>
        <h1>Editar hospedagem</h1>
        <p>{room.name} • ajuste dados comerciais, operação, comodidades e imagens sem perder o histórico da unidade.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/hospedagens">← Voltar</Link>
        <Link className="adminSecondaryAction" href="/admin/galeria">Gerenciar imagens →</Link>
      </div>
    </section>

    {query.saved==="1"&&<section className="adminPageNote" style={{marginBottom:18}}>
      <b>Hospedagem salva.</b> Capa e galeria foram relidas do banco e estão exibidas abaixo.
    </section>}
    <AccommodationForm action={updateAccommodation} media={media} room={room}/>
  </main>;
}
