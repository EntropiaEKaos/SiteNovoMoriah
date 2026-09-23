"use client";

import {useMemo,useState} from "react";
import {placeRestaurantOrder} from "../../lib/restaurant-order-actions";

type G={
  id:string;
  name:string;
  required:boolean;
  minSelect:number;
  maxSelect:number;
  options:{id:string;name:string;priceCents:number}[];
};

type P={
  id:string;
  name:string;
  description:string|null;
  priceCents:number;
  stockQty:number;
  trackStock:boolean;
  category:string;
  groups:G[];
};

const money=(v:number)=>(v/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function Menu({products,bookingToken,accepting}:{products:P[];bookingToken:string;accepting:boolean}){
  const [cart,setCart]=useState<Record<string,number>>({});
  const [mods,setMods]=useState<Record<string,string[]>>({});

  const total=useMemo(()=>products.reduce((sum,p)=>{
    const quantity=cart[p.id]||0;
    const extra=p.groups
      .flatMap(g=>g.options)
      .filter(o=>(mods[p.id]||[]).includes(o.id))
      .reduce((value,o)=>value+o.priceCents,0);
    return sum+(p.priceCents+extra)*quantity;
  },0),[cart,mods,products]);

  const payload=JSON.stringify(
    Object.entries(cart)
      .filter(([,q])=>q>0)
      .map(([id,q])=>({id,q,options:mods[id]||[]}))
  );

  function toggle(p:P,g:G,id:string){
    setMods(currentState=>{
      const current=currentState[p.id]||[];
      const groupIds=new Set(g.options.map(o=>o.id));
      const selected=current.filter(x=>groupIds.has(x));
      let next=current;

      if(selected.includes(id)) next=current.filter(x=>x!==id);
      else if(g.maxSelect===1) next=[...current.filter(x=>!groupIds.has(x)),id];
      else if(selected.length<g.maxSelect) next=[...current,id];

      return {...currentState,[p.id]:next};
    });
  }

  return <div className="foodLayout">
    <section className="foodMenuGrid">
      {products.length===0&&<div className="blogEmpty">
        <h2>Cardápio em atualização.</h2>
        <p>Nenhum item está disponível neste momento.</p>
      </div>}

      {products.map(p=><article className="foodCard" key={p.id}>
        <small>{p.category}</small>
        <h2>{p.name}</h2>
        <p>{p.description||"Preparado pela cozinha Moriah."}</p>
        <b className="foodPrice">{money(p.priceCents)}</b>

        {p.groups.map(g=><div className="foodModifier" key={g.id}>
          <div><b>{g.name}</b> <small>{g.required?"• obrigatório":""} • até {g.maxSelect}</small></div>
          {g.options.map(o=><label key={o.id}>
            <input
              type={g.maxSelect===1?"radio":"checkbox"}
              name={p.id+g.id}
              checked={(mods[p.id]||[]).includes(o.id)}
              onChange={()=>toggle(p,g,o.id)}
            />
            <span>{o.name}{o.priceCents>0?" +"+money(o.priceCents):""}</span>
          </label>)}
        </div>)}

        <div className="foodQty">
          <button
            type="button"
            aria-label={"Remover uma unidade de "+p.name}
            onClick={()=>setCart(x=>({...x,[p.id]:Math.max(0,(x[p.id]||0)-1)}))}
          >−</button>
          <b>{cart[p.id]||0}</b>
          <button
            type="button"
            aria-label={"Adicionar uma unidade de "+p.name}
            disabled={p.trackStock&&(cart[p.id]||0)>=p.stockQty}
            onClick={()=>setCart(x=>({...x,[p.id]:(x[p.id]||0)+1}))}
          >+</button>
        </div>
      </article>)}
    </section>

    <aside className="foodCart">
      <small>SEU PEDIDO</small>
      <h2>{money(total)}</h2>
      <form action={placeRestaurantOrder}>
        <input type="hidden" name="cart" value={payload}/>
        <input type="hidden" name="bookingToken" value={bookingToken}/>
        <input name="guestName" required placeholder="Seu nome"/>
        <input name="roomLabel" placeholder="Quarto / acomodação"/>
        <input name="phone" placeholder="WhatsApp"/>
        <select name="paymentMethod" defaultValue="ROOM">
          <option value="ROOM">Lançar na hospedagem</option>
          <option value="PIX">PIX</option>
          <option value="CARD">Cartão</option>
          <option value="CASH">Dinheiro</option>
        </select>
        <textarea name="notes" placeholder="Observações"/>
        <button disabled={!total||!accepting}>{accepting?"Enviar pedido":"Pedidos pausados"}</button>
      </form>
      <p>Preço, adicionais, hospedagem e estoque são validados novamente no servidor.</p>
    </aside>
  </div>;
}
