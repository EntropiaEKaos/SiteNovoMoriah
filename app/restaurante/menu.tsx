"use client";

import {useMemo,useState} from "react";
import {placeRestaurantOrder} from "../../lib/restaurant-order-actions";

type ModifierGroup={
  id:string;
  name:string;
  required:boolean;
  minSelect:number;
  maxSelect:number;
  options:Array<{id:string;name:string;priceCents:number}>;
};

type Product={
  id:string;
  name:string;
  description:string|null;
  imageUrl:string|null;
  priceCents:number;
  originalPriceCents:number|null;
  stockQty:number;
  trackStock:boolean;
  category:string;
  categoryId:string;
  categoryDescription:string|null;
  categoryImageUrl:string|null;
  badge:string|null;
  tags:string[];
  allergens:string[];
  prepMinutes:number|null;
  featured:boolean;
  soldOut:boolean;
  available:boolean;
  maxPerOrder:number;
  allowNotes:boolean;
  groups:ModifierGroup[];
};

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function slug(value:string){
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

export default function Menu({
  products,
  bookingToken,
  accepting
}:{
  products:Product[];
  bookingToken:string;
  accepting:boolean;
}){
  const [cart,setCart]=useState<Record<string,number>>({});
  const [mods,setMods]=useState<Record<string,string[]>>({});
  const [itemNotes,setItemNotes]=useState<Record<string,string>>({});

  const categories=useMemo(()=>{
    const map=new Map<string,{
      id:string;
      name:string;
      description:string|null;
      imageUrl:string|null;
      products:Product[];
    }>();

    for(const product of products){
      const existing=map.get(product.categoryId);
      if(existing){
        existing.products.push(product);
      }else{
        map.set(product.categoryId,{
          id:product.categoryId,
          name:product.category,
          description:product.categoryDescription,
          imageUrl:product.categoryImageUrl,
          products:[product]
        });
      }
    }

    return [...map.values()];
  },[products]);

  const total=useMemo(()=>products.reduce((sum,product)=>{
    const quantity=cart[product.id]||0;
    const extras=product.groups
      .flatMap(group=>group.options)
      .filter(option=>(mods[product.id]||[]).includes(option.id))
      .reduce((value,option)=>value+option.priceCents,0);

    return sum+(product.priceCents+extras)*quantity;
  },0),[cart,mods,products]);

  const itemCount=useMemo(
    ()=>Object.values(cart).reduce((sum,quantity)=>sum+quantity,0),
    [cart]
  );

  const payload=JSON.stringify(
    Object.entries(cart)
      .filter(([,quantity])=>quantity>0)
      .map(([id,quantity])=>({id,q:quantity,options:mods[id]||[],note:(itemNotes[id]||"").trim().slice(0,500)}))
  );

  function toggle(product:Product,group:ModifierGroup,id:string){
    setMods(currentState=>{
      const current=currentState[product.id]||[];
      const groupIds=new Set(group.options.map(option=>option.id));
      const selected=current.filter(optionId=>groupIds.has(optionId));
      let next=current;

      if(selected.includes(id)){
        next=current.filter(optionId=>optionId!==id);
      }else if(group.maxSelect===1){
        next=[...current.filter(optionId=>!groupIds.has(optionId)),id];
      }else if(selected.length<group.maxSelect){
        next=[...current,id];
      }

      return {...currentState,[product.id]:next};
    });
  }

  function choicesValid(product:Product){
    const selected=new Set(mods[product.id]||[]);
    return product.groups.every(group=>{
      const count=group.options.filter(option=>selected.has(option.id)).length;
      return count>=group.minSelect&&count<=group.maxSelect;
    });
  }

  function add(product:Product){
    if(!product.available||!choicesValid(product))return;
    setCart(current=>{
      const currentQty=current[product.id]||0;
      return {
        ...current,
        [product.id]:Math.min(product.maxPerOrder,currentQty+1)
      };
    });
  }

  return <div className="foodLayout foodMenuV2">
    <section className="foodMenuMain">
      {categories.length>0&&<nav className="foodCategoryNav" aria-label="Categorias do cardápio">
        {categories.map(category=><a key={category.id} href={"#food-"+slug(category.name)}>
          {category.name}
        </a>)}
      </nav>}

      {categories.length===0&&<div className="blogEmpty">
        <h2>Cardápio em atualização.</h2>
        <p>Nenhum item está publicado neste momento.</p>
      </div>}

      {categories.map(category=><section
        className="foodCategorySection"
        id={"food-"+slug(category.name)}
        key={category.id}
      >
        <div className="foodCategoryHead">
          <div>
            <small>MORIAH FOOD / CATEGORIA</small>
            <h2>{category.name}</h2>
            {category.description&&<p>{category.description}</p>}
          </div>
          {category.imageUrl&&<img src={category.imageUrl} alt={category.name}/>}
        </div>

        <div className="foodMenuGrid">
          {category.products.map(product=>{
            const validChoices=choicesValid(product);
            const currentQty=cart[product.id]||0;
            const maxReached=currentQty>=product.maxPerOrder;

            return <article
              className={
                "foodCard foodCardV2"+
                (product.featured?" isFeatured":"")+
                (!product.available?" isUnavailable":"")
              }
              key={product.id}
            >
              <div className="foodProductVisual">
                {product.imageUrl
                  ?<img src={product.imageUrl} alt={product.name}/>
                  :<div className="foodProductPlaceholder">MF</div>}
                <div className="foodProductBadges">
                  {product.badge&&<span>{product.badge}</span>}
                  {product.featured&&<span>DESTAQUE</span>}
                  {!product.available&&<span className="isUnavailable">INDISPONÍVEL</span>}
                </div>
              </div>

              <div className="foodProductBody">
                <small>{product.category}</small>
                <h2>{product.name}</h2>
                <p>{product.description||"Preparado pela cozinha Moriah."}</p>

                {(product.tags.length>0||product.allergens.length>0||product.prepMinutes)&&<div className="foodProductMeta">
                  {product.tags.map(tag=><span key={tag}>#{tag}</span>)}
                  {product.prepMinutes&&<span>~{product.prepMinutes} min</span>}
                  {product.allergens.length>0&&<span>Alérgenos: {product.allergens.join(", ")}</span>}
                </div>}

                <div className="foodPriceRow">
                  <b className="foodPrice">{money(product.priceCents)}</b>
                  {product.originalPriceCents!=null&&<del>{money(product.originalPriceCents)}</del>}
                </div>

                {product.groups.map(group=><div className="foodModifier" key={group.id}>
                  <div>
                    <b>{group.name}</b>
                    <small>
                      {group.required?" • obrigatório":""} • {group.minSelect===group.maxSelect
                        ?group.minSelect+" escolha(s)"
                        :"de "+group.minSelect+" até "+group.maxSelect}
                    </small>
                  </div>
                  {group.options.map(option=><label key={option.id}>
                    <input
                      type={group.maxSelect===1?"radio":"checkbox"}
                      name={product.id+group.id}
                      disabled={!product.available}
                      checked={(mods[product.id]||[]).includes(option.id)}
                      onChange={()=>toggle(product,group,option.id)}
                    />
                    <span>{option.name}{option.priceCents>0?" +"+money(option.priceCents):""}</span>
                  </label>)}
                </div>)}

                {!validChoices&&product.available&&<div className="foodChoiceWarning">
                  Complete as escolhas obrigatórias para adicionar.
                </div>}

                {product.allowNotes&&product.available&&<label className="foodItemNote">
                  <span>Observação deste item</span>
                  <input
                    value={itemNotes[product.id]||""}
                    maxLength={500}
                    placeholder="Ex.: sem cebola, molho separado..."
                    onChange={event=>setItemNotes(current=>({
                      ...current,
                      [product.id]:event.target.value
                    }))}
                  />
                </label>}

                <div className="foodQty">
                  <button
                    type="button"
                    aria-label={"Remover uma unidade de "+product.name}
                    disabled={currentQty===0}
                    onClick={()=>setCart(current=>({
                      ...current,
                      [product.id]:Math.max(0,(current[product.id]||0)-1)
                    }))}
                  >−</button>
                  <b>{currentQty}</b>
                  <button
                    type="button"
                    aria-label={"Adicionar uma unidade de "+product.name}
                    disabled={!product.available||!validChoices||maxReached}
                    onClick={()=>add(product)}
                  >+</button>
                </div>

                {maxReached&&<small className="foodLimit">Limite de {product.maxPerOrder} por pedido.</small>}
              </div>
            </article>;
          })}
        </div>
      </section>)}
    </section>

    <aside className="foodCart">
      <small>SEU PEDIDO • {itemCount} ITEM(NS)</small>
      <h2>{money(total)}</h2>

      {itemCount>0&&<div className="foodCartLines">
        {products.filter(product=>(cart[product.id]||0)>0).map(product=><div key={product.id}>
          <span>{cart[product.id]}× {product.name}</span>
          <b>{money(product.priceCents*(cart[product.id]||0))}</b>
        </div>)}
      </div>}

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
        <textarea name="notes" placeholder="Observações gerais do pedido"/>
        <button disabled={!total||!accepting}>
          {accepting?"Enviar pedido":"Pedidos pausados"}
        </button>
      </form>

      <p>Preço, adicionais, agenda, hospedagem e estoque são validados novamente no servidor.</p>
    </aside>
  </div>;
}
