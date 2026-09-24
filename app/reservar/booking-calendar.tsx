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
  initialGuests="1"
}:{
  rooms:Room[];
  selected:string;
  initialCheckIn?:string;
  initialCheckOut?:string;
  initialGuests?:string;
}){
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
        <small>MONTE SUA ESTADIA</small>
        <h2>Escolha sua hospedagem e período</h2>
      </div>
    </div>

    <div className="availabilityStatus" aria-live="polite">
      {loading
        ?"Consultando disponibilidade…"
        :selectedRoom
          ?selectedRoom.sharedRoom
            ?<><b>Quarto compartilhado.</b> {selectedRoom.bedCount} cama(s) no total; a disponibilidade abaixo considera {guestCount} cama(s).</>
            :<><b>Disponibilidade carregada.</b> {blocks.length} período(s) ocupado(s) nos próximos meses.</>
          :"Escolha uma hospedagem para consultar a disponibilidade."
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
        <option value="">Escolha a hospedagem</option>
        {rooms.map(item=><option key={item.id} value={item.id}>
          {item.name}{item.sharedRoom?" • compartilhado • "+item.bedCount+" camas":""}
        </option>)}
      </select>

      <label>Entrada
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

      <label>Saída
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

      <input name="name" required placeholder="Seu nome" style={{padding:15}}/>
      <input name="phone" required placeholder="WhatsApp" style={{padding:15}}/>
      <input name="email" type="email" placeholder="E-mail" style={{padding:15}}/>

      <label>
        {selectedRoom?.sharedRoom?"Camas / hóspedes":"Hóspedes"}
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
        placeholder="Observações"
        style={{padding:15,gridColumn:"1/-1"}}
      />

      <button
        className="bookingSubmit"
        disabled={!room||!start||!end||rangeBlocked||blocked(start)||invalidGuestCount}
      >
        {selectedRoom?.sharedRoom?"Solicitar cama(s)":"Solicitar reserva"}
      </button>
    </form>

    {invalidGuestCount&&<p style={{padding:12,background:"#fff3cd",border:"1px solid #e8b600"}}>
      {selectedRoom?.sharedRoom
        ?"Este dormitório possui "+sellableUnits+" cama(s). Reduza a quantidade solicitada."
        :"A quantidade de hóspedes excede a capacidade desta hospedagem."
      }
    </p>}

    {quoteLoading&&<p className="quoteLoading">Calculando melhor tarifa para o período…</p>}

    {quote&&<div className="quoteCard">
      <div>
        <small>
          MELHOR TARIFA • {quote.ratePlan}
          {selectedRoom?.sharedRoom&&quote.unitCount
            ?" • "+quote.unitCount+" cama(s)"
            :""
          }
        </small>
        <h3>{(quote.totalCents/100).toLocaleString("pt-BR",{
          style:"currency",
          currency:quote.currency
        })}</h3>
      </div>
      <p>
        {quote.nights} noite(s)<br/>
        <span>
          média de {(quote.averageNightCents/100).toLocaleString("pt-BR",{
            style:"currency",
            currency:quote.currency
          })} / noite
        </span>
      </p>
    </div>}

    {rangeBlocked&&<p style={{padding:12,background:"#fff3cd",border:"1px solid #e8b600"}}>
      {selectedRoom?.sharedRoom
        ?"Não há camas suficientes em todo o período selecionado. Escolha outras datas ou reduza a quantidade."
        :"O período selecionado cruza datas ocupadas. Escolha outro intervalo."
      }
    </p>}

    <details style={{marginTop:14}}>
      <summary>
        {selectedRoom?.sharedRoom
          ?"Ver períodos sem camas suficientes"
          :"Ver períodos já ocupados"
        }
      </summary>
      <ul>
        {blocks.map((block,index)=><li key={index}>
          {new Date(block.start+"T12:00:00").toLocaleDateString("pt-BR")}
          {" → "}
          {new Date(block.end+"T12:00:00").toLocaleDateString("pt-BR")}
        </li>)}
      </ul>
    </details>

    <p style={{marginTop:14,fontSize:14}}>
      A disponibilidade é validada novamente no servidor antes de registrar a solicitação.
    </p>
  </section>;
}
