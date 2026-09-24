"use client";

import {useMemo,useState} from "react";
import {pmsBookingAction} from "../actions";

type ExtraRow={
  id:string;
  description:string;
  amount:string;
};

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{
  style:"currency",
  currency:"BRL"
});

function parseMoney(value:string){
  const number=Number(value.trim().replace(",","."));
  return Number.isFinite(number)&&number>0?Math.round(number*100):0;
}

export default function CheckInForm({
  bookingId,
  lodgingTotalCents,
  alreadyPaidCents
}:{
  bookingId:string;
  lodgingTotalCents:number;
  alreadyPaidCents:number;
}){
  const [extras,setExtras]=useState<ExtraRow[]>([
    {id:"extra-initial",description:"",amount:""}
  ]);
  const [paymentMethod,setPaymentMethod]=useState("PENDING");
  const [paymentAmount,setPaymentAmount]=useState("");

  const extrasTotal=useMemo(
    ()=>extras.reduce((sum,item)=>sum+parseMoney(item.amount),0),
    [extras]
  );
  const accountTotal=lodgingTotalCents+extrasTotal;
  const checkInPaid=parseMoney(paymentAmount);
  const balance=Math.max(0,accountTotal-alreadyPaidCents-checkInPaid);

  const payload=JSON.stringify(
    extras.map(item=>({
      description:item.description,
      amount:item.amount
    }))
  );

  function updateExtra(id:string,key:"description"|"amount",value:string){
    setExtras(current=>current.map(item=>item.id===id?{...item,[key]:value}:item));
  }

  function addExtra(){
    if(extras.length>=30)return;
    setExtras(current=>[
      ...current,
      {id:crypto.randomUUID(),description:"",amount:""}
    ]);
  }

  function removeExtra(id:string){
    setExtras(current=>{
      const next=current.filter(item=>item.id!==id);
      return next.length?next:[{id:"extra-reset",description:"",amount:""}];
    });
  }

  return <form action={pmsBookingAction} className="checkInFinanceForm">
    <input type="hidden" name="id" value={bookingId}/>
    <input type="hidden" name="action" value="CHECK_IN"/>
    <input type="hidden" name="checkInExtras" value={payload}/>

    <div className="checkInFinanceHead">
      <div>
        <small>CHECK-IN / FINANCEIRO</small>
        <h3>Fechar entrada</h3>
        <p>Adicione taxas ou serviços, registre o pagamento e confira o saldo antes de confirmar.</p>
      </div>
      <div className="checkInFinanceTotal">
        <small>TOTAL DO CHECK-IN</small>
        <strong>{money(accountTotal)}</strong>
      </div>
    </div>

    <section className="checkInSummary">
      <div><small>Hospedagem</small><b>{money(lodgingTotalCents)}</b></div>
      <div><small>Adicionais</small><b>{money(extrasTotal)}</b></div>
      <div><small>Já pago</small><b>{money(alreadyPaidCents)}</b></div>
      <div><small>Saldo após entrada</small><b>{money(balance)}</b></div>
    </section>

    <div className="checkInExtras">
      <div className="checkInExtrasTitle">
        <div>
          <small>ADICIONAIS DO CHECK-IN</small>
          <b>Taxas, serviços e consumos extras</b>
        </div>
        <button type="button" onClick={addExtra} disabled={extras.length>=30}>+ Adicional</button>
      </div>

      {extras.map((item,index)=><div className="checkInExtraRow" key={item.id}>
        <span>{String(index+1).padStart(2,"0")}</span>
        <input
          value={item.description}
          maxLength={160}
          placeholder="Ex.: estacionamento, pet, café extra..."
          onChange={event=>updateExtra(item.id,"description",event.target.value)}
        />
        <input
          value={item.amount}
          inputMode="decimal"
          placeholder="R$ 0,00"
          onChange={event=>updateExtra(item.id,"amount",event.target.value)}
        />
        <button type="button" aria-label="Remover adicional" onClick={()=>removeExtra(item.id)}>×</button>
      </div>)}
    </div>

    <div className="adminFormGrid cols3 checkInPaymentGrid">
      <label>Forma de pagamento
        <select
          name="paymentMethod"
          value={paymentMethod}
          onChange={event=>{
            const next=event.target.value;
            setPaymentMethod(next);
            if(next==="PENDING")setPaymentAmount("");
          }}
        >
          <option value="PENDING">Pendente / pagar depois</option>
          <option value="PIX">PIX</option>
          <option value="CARD">Cartão</option>
          <option value="CASH">Dinheiro</option>
          <option value="TRANSFER">Transferência</option>
          <option value="EXTERNAL">Pagamento externo</option>
        </select>
      </label>

      <label>{paymentMethod==="EXTERNAL"?"Valor já pago externamente":"Valor recebido no check-in"}
        <input
          name="paymentAmount"
          inputMode="decimal"
          value={paymentAmount}
          onChange={event=>setPaymentAmount(event.target.value)}
          placeholder="R$ 0,00"
          disabled={paymentMethod==="PENDING"}
          required={paymentMethod==="EXTERNAL"}
        />
      </label>

      {paymentMethod==="EXTERNAL"?<label>Origem / referência
        <input
          name="externalReference"
          maxLength={240}
          placeholder="Booking, Airbnb, link, comprovante..."
        />
      </label>:<div className="checkInPaymentNote">
        <small>FORMA</small>
        <b>{paymentMethod==="PENDING"?"Sem recebimento agora":paymentMethod}</b>
      </div>}
    </div>

    {checkInPaid>Math.max(0,accountTotal-alreadyPaidCents)&&<div className="adminPageNote checkInWarning">
      O valor informado é maior que o saldo atual da conta.
    </div>}

    <button
      className="adminPrimaryAction checkInConfirm"
      disabled={checkInPaid>Math.max(0,accountTotal-alreadyPaidCents)}
    >
      Confirmar check-in • {money(accountTotal)}
    </button>
  </form>;
}
