import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {Bath,BedDouble,Clock3,Maximize2,ShieldCheck,Users} from "lucide-react";
import {prisma} from "../../../lib/prisma";
import {loadPublicSiteSettings} from "../../../lib/public-site-settings";
import PublicSiteChrome from "../../public-site-chrome";
import {getSiteLocale,localizeRecord} from "../../../lib/site-i18n";
export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;
  const locale=await getSiteLocale();
  const room=await prisma.accommodation.findFirst({where:{id,active:true},select:{name:true,description:true,coverImage:true,translations:true}});
  if(!room)return {};
  const localized=localizeRecord(room,locale)||room;
  return {title:localized.name+" | Pousada Moriah",description:localized.description,openGraph:localized.coverImage?{images:[localized.coverImage]}:undefined};
}

export default async function RoomDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const locale=await getSiteLocale();
  const [room,settings,navPages]=await Promise.all([
    prisma.accommodation.findFirst({where:{id,active:true}}),
    loadPublicSiteSettings(),
    prisma.sitePage.findMany({where:{published:true,showInNav:true,slug:{not:"home"}},select:{slug:true,title:true,navLabel:true,translations:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],take:6})
  ]);
  if(!room)notFound();
  const localizedRoom=localizeRecord(room,locale)||room;
  const localizedSettings=localizeRecord(settings,locale);
  const localizedNavPages=navPages.map(page=>localizeRecord(page,locale)!).filter(Boolean);
  const t=locale==="en"?{stays:"Stays",shared:"SHARED ROOM",beds:"bed(s)",upTo:"up to",guests:"guest(s)",bath:"bathroom(s)",direct:"Direct booking",details:"Stay details",type:"Type",sharedLabel:"Shared",bedsLabel:"Beds",consult:"Ask us",floor:"Floor",amenities:"Amenities",gallery:"Full gallery",rules:"Rules and information",bedRate:"RATE PER BED / NIGHT",directRate:"DIRECT BOOKING",ask:"Contact us",perBed:"/ bed",perNight:"/ night",sharedCopy:"Choose dates and number of guests. The system checks how many beds are still available.",privateCopy:"Check your dates and continue with a direct booking with Moriah.",bedsGuests:"Beds / guests",availability:"Check availability",byBed:"Booking per bed",byRoom:"Room booking"}:locale==="es"?{stays:"Hospedajes",shared:"HABITACIÓN COMPARTIDA",beds:"cama(s)",upTo:"hasta",guests:"huésped(es)",bath:"baño(s)",direct:"Reserva directa",details:"Detalles del hospedaje",type:"Tipo",sharedLabel:"Compartido",bedsLabel:"Camas",consult:"Consultar",floor:"Piso",amenities:"Comodidades",gallery:"Galería completa",rules:"Reglas e información",bedRate:"TARIFA POR CAMA / NOCHE",directRate:"RESERVA DIRECTA",ask:"Consultar",perBed:"/ cama",perNight:"/ noche",sharedCopy:"Elige las fechas y la cantidad de huéspedes. El sistema verifica cuántas camas siguen disponibles.",privateCopy:"Consulta tus fechas y continúa con la reserva directa con Moriah.",bedsGuests:"Camas / huéspedes",availability:"Ver disponibilidad",byBed:"Reserva por cama",byRoom:"Reserva de la habitación"}:{stays:"Hospedagens",shared:"QUARTO COMPARTILHADO",beds:"cama(s)",upTo:"até",guests:"hóspede(s)",bath:"banheiro(s)",direct:"Reserva direta",details:"Detalhes da hospedagem",type:"Tipo",sharedLabel:"Compartilhado",bedsLabel:"Camas",consult:"Consulte",floor:"Andar",amenities:"Comodidades",gallery:"Galeria completa",rules:"Regras e informações",bedRate:"TARIFA POR CAMA / NOITE",directRate:"RESERVA DIRETA",ask:"Sob consulta",perBed:"/ cama",perNight:"/ noite",sharedCopy:"Escolha as datas e a quantidade de hóspedes. O sistema verifica quantas camas ainda estão disponíveis.",privateCopy:"Consulte suas datas e siga para a reserva direta com a Moriah.",bedsGuests:"Camas / hóspedes",availability:"Ver disponibilidade",byBed:"Reserva por cama",byRoom:"Reserva do quarto"};
  const images=[localizedRoom.coverImage,...localizedRoom.galleryImages].filter((value):value is string=>Boolean(value)).filter((value,index,array)=>array.indexOf(value)===index);
  const localeTag=locale==="en"?"en-US":locale==="es"?"es-ES":"pt-BR";
  const price=localizedRoom.priceCents==null?null:(localizedRoom.priceCents/100).toLocaleString(localeTag,{style:"currency",currency:"BRL"});

  return <PublicSiteChrome settings={localizedSettings} navPages={localizedNavPages} locale={locale}>
    <section className="roomDetailPage"><div className="roomDetailShell">
      <div className="roomBreadcrumb"><Link href="/">Moriah</Link><span>/</span><Link href="/#hospedagem">{t.stays}</Link><span>/</span><b>{localizedRoom.name}</b></div>
      <div className="roomDetailGallery">
        <div className="roomDetailGalleryMain">{images[0]?<img src={images[0]} alt={localizedRoom.name}/>:<div className="roomDetailPlaceholder">M</div>}</div>
        <div className="roomDetailGallerySide">{[images[1],images[2]].map((image,index)=><div className="roomDetailGalleryThumb" key={index}>{image?<img src={image} alt={localizedRoom.name+" "+(index+2)}/>:images[0]?<img src={images[0]} alt={localizedRoom.name}/>:<div className="roomDetailPlaceholder">M</div>}</div>)}</div>
      </div>
      <div className="roomDetailGrid">
        <div>
          <header className="roomDetailHeader">
            <small>{localizedRoom.sharedRoom?t.shared:localizedRoom.type}</small>
            <h1>{localizedRoom.name}</h1><p>{localizedRoom.description}</p>
            <div className="roomDetailBadges">
              <span><Users size={14}/>{localizedRoom.sharedRoom?localizedRoom.bedCount+" "+t.beds:(t.upTo+" "+localizedRoom.capacity+" "+t.guests)}</span>
              <span><Bath size={14}/>{localizedRoom.bathrooms} {t.bath}</span>
              {localizedRoom.areaSqm&&<span><Maximize2 size={14}/>{localizedRoom.areaSqm} m²</span>}
              <span><ShieldCheck size={14}/>{t.direct}</span>
            </div>
          </header>
          <section className="roomSection"><h2>{t.details}</h2><div className="roomSpecGrid">
            <div className="roomSpecCard"><small>{t.type}</small><b>{localizedRoom.sharedRoom?t.sharedLabel:localizedRoom.type}</b></div>
            <div className="roomSpecCard"><small>{t.bedsLabel}</small><b>{localizedRoom.sharedRoom?localizedRoom.bedCount:(localizedRoom.beds||t.consult)}</b></div>
            <div className="roomSpecCard"><small>Check-in</small><b>{localizedRoom.checkInTime}</b></div>
            <div className="roomSpecCard"><small>Check-out</small><b>{localizedRoom.checkOutTime}</b></div>
            {localizedRoom.floor&&<div className="roomSpecCard"><small>{t.floor}</small><b>{localizedRoom.floor}</b></div>}
          </div></section>
          {localizedRoom.amenities.length>0&&<section className="roomSection"><h2>{t.amenities}</h2><div className="roomAmenityGrid">{localizedRoom.amenities.map(item=><span key={item}>{item.replaceAll("_"," ")}</span>)}</div></section>}
          {localizedRoom.galleryImages.length>2&&<section className="roomSection"><h2>{t.gallery}</h2><div className="siteGalleryGrid">{localizedRoom.galleryImages.map((image,index)=><figure className={"siteGalleryTile tile-"+((index%6)+1)} key={image+index}><img src={image} alt={localizedRoom.name+" — foto "+(index+1)}/></figure>)}</div></section>}
          {localizedRoom.rules&&<section className="roomSection"><h2>{t.rules}</h2><p>{localizedRoom.rules}</p></section>}
        </div>
        <aside className="roomBookingCard">
          <small>{localizedRoom.sharedRoom?t.bedRate:t.directRate}</small>
          <div className="roomBookingPrice">{price||t.ask} {price&&<span>{localizedRoom.sharedRoom?t.perBed:t.perNight}</span>}</div>
          <p>{localizedRoom.sharedRoom?t.sharedCopy:t.privateCopy}</p>
          <form action="/reservar" method="get" className="roomBookingForm">
            <input type="hidden" name="accommodationId" value={localizedRoom.id}/>
            <label>Check-in<input type="date" name="checkIn" required/></label>
            <label>Check-out<input type="date" name="checkOut" required/></label>
            <label>{localizedRoom.sharedRoom?t.bedsGuests:t.guests}<input type="number" name="guests" min="1" max={localizedRoom.sharedRoom?localizedRoom.bedCount:localizedRoom.capacity} defaultValue="1" required/></label>
            <button type="submit">{t.availability}</button>
          </form>
          <div className="roomDetailBadges" style={{marginTop:16}}><span><Clock3 size={14}/>Check-in {localizedRoom.checkInTime}</span><span><BedDouble size={14}/>{localizedRoom.sharedRoom?t.byBed:t.byRoom}</span></div>
        </aside>
      </div>
    </div></section>
  </PublicSiteChrome>;
}
