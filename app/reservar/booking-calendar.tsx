"use client";

import {useEffect,useMemo,useState} from "react";
import {createBookingLead} from "../admin/actions";

type Room={
  id:string;
  name:string;
  sharedRoom:boolean;
  bedCount:number;
  capacity:number;
};

type Block={start:string;end:string;kind?:string};

type Quote={
  currency:string;
  nights:number;
  totalCents:number;
  averageNightCents:number;
  ratePlan:string;
  unitCount?:number;
  unitLabel?:string;
};

export default function BookingCalendar({
  rooms,
  selected,
  initialCheckIn="",
  initialCheckOut="",
  initialGuests="1",
  locale
}:{
  rooms:Room[];
  selected:string;
  initialCheckIn?:string;
  initialCheckOut?:string;
  initialGuests?:string;
  locale:"pt"|"en"|"es";
}){
  const localeTag=locale==="en"?"en-US":locale==="es"?"es-ES":"pt-BR";
  const t=locale==="en"?{
    step:"BUILD YOUR STAY",title:"Choose your stay and dates",loading:"Checking availability…",shared:"Shared room.",bedsTotal:"bed(s) total; availability below considers",beds:"bed(s).",loaded:"Availability loaded.",occupied:"occupied period(s) in the coming months.",chooseStay:"Choose a stay to check availability.",choose:"Choose a stay",sharedOpt:"shared",entry:"Check-in",exit:"Check-out",name:"Your name",bedsGuests:"Beds / guests",guests:"Guests",notes:"Notes",requestBeds:"Request bed(s)",request:"Request booking",tooManyBeds:"This dorm has",reduce:"bed(s). Reduce the requested quantity.",tooManyGuests:"The number of guests exceeds this stay capacity.",quote:"Calculating the best rate for your dates…",best:"BEST RATE",nights:"night(s)",avg:"average",perNight:"/ night",noBeds:"There are not enough beds for the whole selected period. Choose other dates or reduce the quantity.",blocked:"The selected period overlaps occupied dates. Choose another interval.",viewNoBeds:"See periods without enough beds",viewOccupied:"See occupied periods",validated:"Availability is validated again on the server before registering the request."}
  :locale==="es"?{
    step:"ARMA TU ESTANCIA",title:"Elige tu hospedaje y período",loading:"Consultando disponibilidad…",shared:"Habitación compartida.",bedsTotal:"cama(s) en total; la disponibilidad considera",beds:"cama(s).",loaded:"Disponibilidad cargada.",occupied:"período(s) ocupado(s) en los próximos meses.",chooseStay:"Elige un hospedaje para consultar disponibilidad.",choose:"Elige el hospedaje",sharedOpt:"compartido",entry:"Entrada",exit:"Salida",name:"Tu nombre",bedsGuests:"Camas / huéspedes",guests:"Huéspedes",notes:"Observaciones",requestBeds:"Solicitar cama(s)",request:"Solicitar reserva",tooManyBeds:"Este dormitorio tiene",reduce:"cama(s). Reduce la cantidad solicitada.",tooManyGuests:"La cantidad de huéspedes supera la capacidad de este hospedaje.",quote:"Calculando la mejor tarifa para el período…",best:"MEJOR TARIFA",nights:"noche(s)",avg:"promedio",perNight:"/ noche",noBeds:"No hay camas suficientes durante todo el período seleccionado. Elige otras fechas o reduce la cantidad.",blocked:"El período seleccionado cruza fechas ocupadas. Elige otro intervalo.",viewNoBeds:"Ver períodos sin camas suficientes",viewOccupied:"Ver períodos ocupados",validated:"La disponibilidad se valida nuevamente en el servidor antes de registrar la solicitud."}
  :{
    step:"MONTE SUA ESTADIA",title:"Escolha sua hospedagem e período",loading:"Consultando disponibilidade…",shared:"Quarto compartilhado.",bedsTotal:"cama(s) no total; a disponibilidade abaixo considera",beds:"cama(s).",loaded:"Disponibilidade carregada.",occupied:"período(s) ocupado(s) nos próximos meses.",chooseStay:t.chooseStay,choose:"Escolha a hospedagem",sharedOpt:"compartilhado",entry:"Entrada",exit:"Saída",name:"Seu nome",bedsGuests:"Camas / hóspedes",guests:"Hóspedes",notes:"Observações",requestBeds:"Solicitar cama(s)",request:"Solicitar reserva",tooManyBeds:"Este dormitório possui",reduce:"cama(s). Reduza a quantidade solicitada.",tooManyGuests :t.tooManyGuests,quote:"Calculando melhor tarifa para o período…",best:"MELHOR TARIFA",nights:"noite(s)",avg:"média de",perNight:"/ noite",noBeds:"Não há camas suficientes em todo o período selecionado. Escolha outras datas ou reduza a quantidade.",blocked :t.blocked,viewNoBeds:"Ver períodos sem camas suficientes",viewOccupied :t.viewOccupied,validated:"{t.validated}"};
  const [room,setRoom]=useState(selected);
  const [requestToken]=useState(()=>crypto.randomUUID());
  const [start,setStart]=useState(initialCheckIn);
  const [end,setEnd]=useState(initialCheckOut);
  const [guests,setGuests]=useState(initialGuests||"1");
  const [blocks,setBlocks]=useState<Block[]>([]);
  const [loading,setLoading]=useState(false);
  const [quote,setQuote]=useState<Quote|null>(null);
  const [quoteLoading,setQuoteLoading]=useState(false);

  const min=useMemo(()=>new Date().toISOString().slice(0,10),[]);
  const selectedRoom=rooms.find(item=>item.id===room)||null;
  const guestCount=Math.max(1,Number(guests)||1);
  const sellableUnits=selectedRoom
    ?selectedRoom.sharedRoom
      ?selectedRoom.bedCount
      :selectedRoom.capacity
    :0;
  const invalidGuestCount=Boolean(selectedRoom&&guestCount>sellableUnits);

  useEffect(()=>{
    if(!room){
      setBlocks([]);
      return;
    }

    let live=true;
    setLoading(true);
    fetch(
      "/api/availability?accommodationId="+encodeURIComponent(room)+
      "&guests="+encodeURIComponent(String(guestCount))
    )
      .then(response=>response.ok?response.json():Promise.reject())
      .then(data=>{
        if(live)setBlocks(Array.isArray(data.blocks)?data.blocks:[]);
      })
      .catch(()=>{
        if(live)setBlocks([]);
      })
      .finally(()=>{
        if(live)setLoading(false);
      });

    return()=>{live=false};
  },[room,guestCount]);

  useEffect(()=>{
    if(!room||!start||!end||end<=start||invalidGuestCount){
      setQuote(null);
      return;
    }

    let live=true;
    setQuoteLoading(true);
    fetch(
      "/api/rates/quote?accommodationId="+encodeURIComponent(room)+
      "&checkIn="+encodeURIComponent(start)+
      "&checkOut="+encodeURIComponent(end)+
      "&guests="+encodeURIComponent(String(guestCount))
    )
      .then(response=>response.ok?response.json():Promise.reject())
      .then(data=>{
        if(live)setQuote(data.available&&data.quote?data.quote:null);
      })
      .catch(()=>{
        if(live)setQuote(null);
      })
      .finally(()=>{
        if(live)setQuoteLoading(false);
      });

    return()=>{live=false};
  },[room,start,end,guestCount,invalidGuestCount]);

  const blocked=(date:string)=>blocks.some(block=>block.start<=date&&block.end>date);
  const rangeBlocked=Boolean(
    start&&end&&blocks.some(block=>block.start<end&&block.end>start)
  );

  return <section className="bookingPanel bookingPanelV2">
    <div className="bookingPanelHead">
      <span>01</span>
      <div>
        <small>{t.step}</small>
        <h2>{t.title}</h2>
      </div>
    </div>

    <div className="availabilityStatus" aria-live="polite">
      {loading
        ?t.loading
        :selectedRoom
          ?selectedRoom.sharedRoom
            ?<><b>{t.shared}</b> {selectedRoom.bedCount} {t.bedsTotal} {guestCount} {t.beds}</>
            :<><b>{t.loaded}</b> {blocks.length} {t.occupied}</>
          :t.chooseStay
      }
    </div>

    <form className="bookingForm bookingFormV2" action={createBookingLead}>
      <input type="hidden" name="publicRequestToken" value={requestToken}/>

      <select
        name="accommodationId"
        required
        value={room}
        onChange={event=>setRoom(event.target.value)}
        style={{padding:15}}
      >
        <option value="">{t.choose}</option>
        {rooms.map(item=><option key={item.id} value={item.id}>
          {item.name}{item.sharedRoom?" • "+t.sharedOpt+" • "+item.bedCount+" "+t.beds:""}
        </option>)}
      </select>

      <label>{t.entry}
        <input
          name="checkIn"
          type="date"
          min={min}
          required
          value={start}
          onChange={event=>{
            setStart(event.target.value);
            if(end&&end<=event.target.value)setEnd("");
          }}
          style={{padding:15,width:"100%"}}
        />
      </label>

      <label>{t.exit}
        <input
          name="checkOut"
          type="date"
          min={start||min}
          required
          value={end}
          onChange={event=>setEnd(event.target.value)}
          style={{padding:15,width:"100%"}}
        />
      </label>

      <input name="name" required placeholder={t.name} style={{padding:15}}/>
      <input name="phone" required placeholder="WhatsApp" style={{padding:15}}/>
      <input name="email" type="email" placeholder="E-mail" style={{padding:15}}/>

      <label>
        {selectedRoom?.sharedRoom?t.bedsGuests:t.guests}
        <input
          name="guests"
          type="number"
          min="1"
          max={sellableUnits||50}
          value={guests}
          onChange={event=>setGuests(event.target.value)}
          style={{padding:15,width:"100%"}}
        />
      </label>

      <textarea
        name="message"
        placeholder={t.notes}
        style={{padding:15,gridColumn:"1/-1"}}
      />

      <button
        className="bookingSubmit"
        disabled={!room||!start||!end||rangeBlocked||blocked(start)||invalidGuestCount}
      >
        {selectedRoom?.sharedRoom?t.requestBeds:t.request}
      </button>
    </form>

    {invalidGuestCount&&<p style={{padding:12,background:"#fff3cd",border:"1px solid #e8b600"}}>
      {selectedRoom?.sharedRoom
        ?t.tooManyBeds+" "+sellableUnits+" "+t.reduce
         :t.tooManyGuests
      }
    </p>}

    {quoteLoading&&<p className="quoteLoading">{t.quote}</p>}

    {quote&&<div className="quoteCard">
      <div>
        <small>
          {t.best} • {quote.ratePlan}
          {selectedRoom?.sharedRoom&&quote.unitCount
            ?" • "+quote.unitCount+" cama(s)"
            :""
          }
        </small>
        <h3>{(quote.totalCents/100).toLocaleString(localeTag,{
          style:"currency",
          currency:quote.currency
        })}</h3>
      </div>
      <p>
        {quote.nights} {t.nights}<br/>
        <span>
          {t.avg} {(quote.averageNightCents/100).toLocaleString(localeTag,{
            style:"currency",
            currency:quote.currency
          })} {t.perNight}
        </span>
      </p>
    </div>}

    {rangeBlocked&&<p style={{padding:12,background:"#fff3cd",border:"1px solid #e8b600"}}>
      {selectedRoom?.sharedRoom
        ?t.noBeds
         :t.blocked
      }
    </p>}

    <details style={{marginTop:14}}>
      <summary>
        {selectedRoom?.sharedRoom
          ?t.viewNoBeds
           :t.viewOccupied
        }
      </summary>
      <ul>
        {blocks.map((block,index)=><li key={index}>
          {new Date(block.start+"T12:00:00").toLocaleDateString(localeTag)}
          {" → "}
          {new Date(block.end+"T12:00:00").toLocaleDateString(localeTag)}
        </li>)}
      </ul>
    </details>

    <p style={{marginTop:14,fontSize:14}}>
      {t.validated}
    </p>
  </section>;
}
