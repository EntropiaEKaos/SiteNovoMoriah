import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {Bath,BedDouble,Clock3,Maximize2,ShieldCheck,Users} from "lucide-react";
import {prisma} from "../../../lib/prisma";
import {loadPublicSiteSettings} from "../../../lib/public-site-settings";
import PublicSiteChrome from "../../public-site-chrome";
export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;
  const room=await prisma.accommodation.findFirst({where:{id,active:true},select:{name:true,description:true,coverImage:true}});
  if(!room)return {};
  return {title:room.name+" | Pousada Moriah",description:room.description,openGraph:room.coverImage?{images:[room.coverImage]}:undefined};
}

export default async function RoomDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [room,settings,navPages]=await Promise.all([
    prisma.accommodation.findFirst({where:{id,active:true}}),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({where:{published:true,showInNav:true,slug:{not:"home"}},select:{slug:true,title:true,navLabel:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],take:6})
  ]);
  if(!room)notFound();
  const images=[room.coverImage,...room.galleryImages].filter((value):value is string=>Boolean(value)).filter((value,index,array)=>array.indexOf(value)===index);
  const price=room.priceCents==null?null:(room.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  return <PublicSiteChrome settings={settings} navPages={navPages}>
    <section className="roomDetailPage"><div className="roomDetailShell">
      <div className="roomBreadcrumb"><Link href="/">Moriah</Link><span>/</span><Link href="/#hospedagem">Hospedagens</Link><span>/</span><b>{room.name}</b></div>
      <div className="roomDetailGallery">
        <div className="roomDetailGalleryMain">{images[0]?<img src={images[0]} alt={room.name}/>:<div className="roomDetailPlaceholder">M</div>}</div>
        <div className="roomDetailGallerySide">{[images[1],images[2]].map((image,index)=><div className="roomDetailGalleryThumb" key={index}>{image?<img src={image} alt={room.name+" "+(index+2)}/>:images[0]?<img src={images[0]} alt={room.name}/>:<div className="roomDetailPlaceholder">M</div>}</div>)}</div>
      </div>
      <div className="roomDetailGrid">
        <div>
          <header className="roomDetailHeader">
            <small>{room.sharedRoom?"QUARTO COMPARTILHADO":room.type}</small>
            <h1>{room.name}</h1><p>{room.description}</p>
            <div className="roomDetailBadges">
              <span><Users size={14}/>{room.sharedRoom?room.bedCount+" cama(s)":("até "+room.capacity+" hóspede(s)")}</span>
              <span><Bath size={14}/>{room.bathrooms} banheiro(s)</span>
              {room.areaSqm&&<span><Maximize2 size={14}/>{room.areaSqm} m²</span>}
              <span><ShieldCheck size={14}/>Reserva direta</span>
            </div>
          </header>
          <section className="roomSection"><h2>Detalhes da hospedagem</h2><div className="roomSpecGrid">
            <div className="roomSpecCard"><small>Tipo</small><b>{room.sharedRoom?"Compartilhado":room.type}</b></div>
            <div className="roomSpecCard"><small>Camas</small><b>{room.sharedRoom?room.bedCount:(room.beds||"Consulte")}</b></div>
            <div className="roomSpecCard"><small>Check-in</small><b>{room.checkInTime}</b></div>
            <div className="roomSpecCard"><small>Check-out</small><b>{room.checkOutTime}</b></div>
            {room.floor&&<div className="roomSpecCard"><small>Andar</small><b>{room.floor}</b></div>}
          </div></section>
          {room.amenities.length>0&&<section className="roomSection"><h2>Comodidades</h2><div className="roomAmenityGrid">{room.amenities.map(item=><span key={item}>{item.replaceAll("_"," ")}</span>)}</div></section>}
          {room.galleryImages.length>2&&<section className="roomSection"><h2>Galeria completa</h2><div className="siteGalleryGrid">{room.galleryImages.map((image,index)=><figure className={"siteGalleryTile tile-"+((index%6)+1)} key={image+index}><img src={image} alt={room.name+" — foto "+(index+1)}/></figure>)}</div></section>}
          {room.rules&&<section className="roomSection"><h2>Regras e informações</h2><p>{room.rules}</p></section>}
        </div>
        <aside className="roomBookingCard">
          <small>{room.sharedRoom?"TARIFA POR CAMA / NOITE":"RESERVA DIRETA"}</small>
          <div className="roomBookingPrice">{price||"Sob consulta"} {price&&<span>{room.sharedRoom?"/ cama":"/ noite"}</span>}</div>
          <p>{room.sharedRoom?"Escolha as datas e a quantidade de hóspedes. O sistema verifica quantas camas ainda estão disponíveis.":"Consulte suas datas e siga para a reserva direta com a Moriah."}</p>
          <form action="/reservar" method="get" className="roomBookingForm">
            <input type="hidden" name="accommodationId" value={room.id}/>
            <label>Check-in<input type="date" name="checkIn" required/></label>
            <label>Check-out<input type="date" name="checkOut" required/></label>
            <label>{room.sharedRoom?"Camas / hóspedes":"Hóspedes"}<input type="number" name="guests" min="1" max={room.sharedRoom?room.bedCount:room.capacity} defaultValue="1" required/></label>
            <button type="submit">Ver disponibilidade</button>
          </form>
          <div className="roomDetailBadges" style={{marginTop:16}}><span><Clock3 size={14}/>Check-in {room.checkInTime}</span><span><BedDouble size={14}/>{room.sharedRoom?"Reserva por cama":"Reserva do quarto"}</span></div>
        </aside>
      </div>
    </div></section>
  </PublicSiteChrome>;
}
