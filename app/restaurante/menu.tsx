"use client";

import {useMemo,useState} from "react";
import {
  BedDouble,
  ChevronRight,
  Clock3,
  CreditCard,
  Minus,
  MessageSquareText,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
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

function money(value:number,locale:string){return (value/100).toLocaleString(locale==="en"?"en-US":locale==="es"?"es-ES":"pt-BR",{style:"currency",currency:"BRL"});}

function slug(value:string){
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

export default function Menu({
  products,
  bookingToken,
  accepting,
  locale,
  successPath="/restaurante/obrigado",
  standalone=false
}:{
  products:Product[];
  bookingToken:string;
  accepting:boolean;
  locale:"pt"|"en"|"es";
  successPath?:string;
  standalone?:boolean;
}){
  const t=locale==="en"?{
    search:"Search menu",clear:"Clear search",accepting:"Accepting orders",paused:"Orders paused",stayLinked:"Stay linked",categories:"Menu categories",empty:"No items found.",emptyHelp:"Try another name, ingredient or category.",item:"item",items:"items",featured:"Popular",prepared:"Prepared by the Moriah kitchen.",unavailable:"Unavailable",choose:"Choose",add:"Add",order:"YOUR ORDER",emptyCart:"Your cart is empty",emptyCartHelp:"Add menu items to build your order.",note:"Note:",edit:"Edit",subtotal:"Subtotal",finish:"CHECKOUT",delivery:"Delivery details",name:"Name",who:"Who will receive it?",room:"Room / location",linkedRoom:"Stay already linked",roomPickup:"Room or pickup",payment:"Payment",chargeStay:"Charge to stay",notes:"General notes",notesPlaceholder:"e.g. deliver at reception...",place:"Place order",addItem:"Add an item",pausedBtn:"Orders paused",trust:"Prices, add-ons and stock are validated again before confirmation.",viewOrder:"View order",closeCart:"Close cart",close:"Close",required:"Required",chooseOne:"Choose",chooseRange:"Choose from",observation:"Any notes?",obsPlaceholder:"e.g. no onion, sauce on the side...",allergens:"Allergens:",addMore:"Add more",addOrder:"Add to order",sharedSuffix:"shared"}:locale==="es"?{
    search:"Buscar en el menú",clear:"Limpiar búsqueda",accepting:"Aceptando pedidos",paused:"Pedidos pausados",stayLinked:"Hospedaje vinculado",categories:"Categorías del menú",empty:"No se encontraron productos.",emptyHelp:"Prueba otro nombre, ingrediente o categoría.",item:"ítem",items:"ítems",featured:"Más pedido",prepared:"Preparado por la cocina Moriah.",unavailable:"No disponible",choose:"Elegir",add:"Agregar",order:"TU PEDIDO",emptyCart:"Tu carrito está vacío",emptyCartHelp:"Agrega productos del menú para armar tu pedido.",note:"Obs.:",edit:"Editar",subtotal:"Subtotal",finish:"FINALIZAR PEDIDO",delivery:"Datos para entrega",name:"Nombre",who:"¿Quién recibe?",room:"Habitación / lugar",linkedRoom:"Hospedaje ya vinculado",roomPickup:"Habitación o retiro",payment:"Pago",chargeStay:"Cargar al hospedaje",notes:"Observaciones generales",notesPlaceholder:"Ej.: entregar en recepción...",place:"Hacer pedido",addItem:"Agrega un producto",pausedBtn:"Pedidos pausados",trust:"Valores, adicionales y stock se validan nuevamente antes de confirmar.",viewOrder:"Ver pedido",closeCart:"Cerrar carrito",close:"Cerrar",required:"Obligatorio",chooseOne:"Elige",chooseRange:"Elige de",observation:"¿Alguna observación?",obsPlaceholder:"Ej.: sin cebolla, salsa aparte...",allergens:"Alérgenos:",addMore:"Agregar más",addOrder:"Agregar al pedido",sharedSuffix:"compartido"}:{
    search:"Buscar no cardápio",clear:"Limpar busca",accepting:"Aceitando pedidos",paused:"Pedidos pausados",stayLinked:"Hospedagem vinculada",categories:"Categorias do cardápio",empty:"Nenhum item encontrado.",emptyHelp:"Tente outro nome, ingrediente ou categoria.",item:"item",items:"itens",featured:"Mais pedido",prepared:"Preparado pela cozinha Moriah.",unavailable:"Indisponível",choose:"Escolher",add:"Adicionar",order:"SEU PEDIDO",emptyCart:"Seu carrinho está vazio",emptyCartHelp:"Adicione itens do cardápio para montar seu pedido.",note:"Obs.:",edit:"Editar",subtotal:"Subtotal",finish:"FINALIZAR PEDIDO",delivery:"Dados para entrega",name:"Nome",who:"Quem vai receber?",room:"Quarto / local",linkedRoom:"Hospedagem já vinculada",roomPickup:"Quarto ou retirada",payment:"Pagamento",chargeStay:"Lançar na hospedagem",notes:"Observações gerais",notesPlaceholder:"Ex.: entregar na recepção...",place:"Fazer pedido",addItem:"Adicione um item",pausedBtn:"Pedidos pausados",trust:"Valores, adicionais e estoque são validados novamente antes da confirmação.",viewOrder:"Ver pedido",closeCart:"Fechar carrinho",close:"Fechar",required:"Obrigatório",chooseOne:"Escolha",chooseRange:"Escolha de",observation:"Alguma observação?",obsPlaceholder:"Ex.: sem cebola, molho separado...",allergens:"Alérgenos:",addMore:"Adicionar mais",addOrder:"Adicionar ao pedido",sharedSuffix:"compartilhado"};
  const [cart,setCart]=useState<Record<string,number>>({});
  const [mods,setMods]=useState<Record<string,string[]>>({});
  const [itemNotes,setItemNotes]=useState<Record<string,string>>({});
  const [query,setQuery]=useState("");
  const [selectedProduct,setSelectedProduct]=useState<Product|null>(null);
  const [cartOpen,setCartOpen]=useState(false);

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

  const normalizedQuery=query.trim().toLowerCase();

  const visibleCategories=useMemo(()=>categories
    .map(category=>({
      ...category,
      products:category.products.filter(product=>{
        if(!normalizedQuery)return true;
        return [
          product.name,
          product.description,
          product.category,
          ...product.tags
        ].some(value=>String(value||"").toLowerCase().includes(normalizedQuery));
      })
    }))
    .filter(category=>category.products.length>0),[categories,normalizedQuery]);

  const total=useMemo(()=>products.reduce((sum,product)=>{
    const quantity=cart[product.id]||0;
    const extras=product.groups
      .flatMap(group=>group.options)
      .filter(option=>(mods[product.id]||[]).includes(option.id))
      .reduce((value,option)=>value+option.priceCents,0);

    return sum+(product.priceCents+extras)*quantity;
  },0),[cart,mods,products]);

  const cartLines=useMemo(()=>products
    .filter(product=>(cart[product.id]||0)>0)
    .map(product=>{
      const quantity=cart[product.id]||0;
      const selectedIds=new Set(mods[product.id]||[]);
      const selectedOptions=product.groups
        .flatMap(group=>group.options)
        .filter(option=>selectedIds.has(option.id));
      const extras=selectedOptions.reduce((sum,option)=>sum+option.priceCents,0);

      return {
        product,
        quantity,
        selectedOptions,
        lineTotal:(product.priceCents+extras)*quantity
      };
    }),[cart,mods,products]);

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
      return {...current,[product.id]:Math.min(product.maxPerOrder,currentQty+1)};
    });
  }

  function remove(product:Product){
    setCart(current=>({...current,[product.id]:Math.max(0,(current[product.id]||0)-1)}));
  }

  function quickAdd(product:Product){
    if(!product.available)return;
    if(product.groups.length>0){
      setSelectedProduct(product);
      return;
    }
    add(product);
  }

  function selectedExtra(product:Product){
    return product.groups
      .flatMap(group=>group.options)
      .filter(option=>(mods[product.id]||[]).includes(option.id))
      .reduce((sum,option)=>sum+option.priceCents,0);
  }

  return <div className="foodDeliveryV3">
    <section className="foodDeliveryMain">
      <div className="foodDeliveryToolbar">
        <label className="foodDeliverySearch">
          <Search size={18}/>
          <input
            value={query}
            onChange={event=>setQuery(event.target.value)}
            placeholder={t.search}
            aria-label={t.search}
          />
          {query&&<button type="button" onClick={()=>setQuery("")} aria-label={t.clear}><X size={15}/></button>}
        </label>

        <div className="foodDeliveryInfo">
          <span><Clock3 size={14}/>{accepting?t.accepting:t.paused}</span>
          {bookingToken&&<span><BedDouble size={14}/>{t.stayLinked}</span>}
        </div>
      </div>

      {categories.length>0&&<nav className="foodCategoryNavV3" aria-label={t.categories}>
        {categories.map(category=><a key={category.id} href={"#food-"+slug(category.name)}>
          {category.name}
        </a>)}
      </nav>}

      {visibleCategories.length===0&&<div className="foodDeliveryEmpty">
        <Search size={28}/>
        <h2>{t.empty}</h2>
        <p>{t.emptyHelp}</p>
      </div>}

      {visibleCategories.map(category=><section
        className="foodCategoryV3"
        id={"food-"+slug(category.name)}
        key={category.id}
      >
        <header className="foodCategoryHeadV3">
          <div>
            <h2>{category.name}</h2>
            {category.description&&<p>{category.description}</p>}
          </div>
          <span>{category.products.length} {category.products.length===1?t.item:t.items}</span>
        </header>

        <div className="foodProductGridV3">
          {category.products.map(product=>{
            const currentQty=cart[product.id]||0;
            const hasPromo=product.originalPriceCents!=null&&product.originalPriceCents>product.priceCents;
            const discount=hasPromo
              ?Math.round((1-product.priceCents/product.originalPriceCents!)*100)
              :0;

            return <article
              className={
                "foodProductCardV3"+
                (product.featured?" isFeatured":"")+
                (!product.available?" isUnavailable":"")
              }
              key={product.id}
            >
              <button type="button" className="foodProductCardClick" onClick={()=>setSelectedProduct(product)}>
                <div className="foodProductCopyV3">
                  <div className="foodProductEyebrowV3">
                    {product.featured&&<span><Sparkles size={11}/>{t.featured}</span>}
                    {product.badge&&<span>{product.badge}</span>}
                    {discount>0&&<span className="isPromo">-{discount}%</span>}
                  </div>

                  <h3>{product.name}</h3>
                  <p>{product.description||t.prepared}</p>

                  <div className="foodProductMetaV3">
                    {product.prepMinutes&&<span><Clock3 size={11}/>~{product.prepMinutes} min</span>}
                    {product.tags.slice(0,2).map(tag=><span key={tag}>{tag}</span>)}
                  </div>

                  <div className="foodProductPriceV3">
                    {product.originalPriceCents!=null&&<del>{money(product.originalPriceCents,locale)}</del>}
                    <strong>{money(product.priceCents,locale)}</strong>
                  </div>
                </div>

                <div className="foodProductImageV3">
                  {product.imageUrl
                    ?<img src={product.imageUrl} alt={product.name}/>
                    :<div className="foodProductPlaceholderV3">MORIAH</div>}
                  {!product.available&&<span>{t.unavailable}</span>}
                </div>
              </button>

              <div className="foodProductCardActionV3">
                {currentQty>0?<div className="foodInlineQtyV3">
                  <button type="button" onClick={()=>remove(product)} aria-label={"Remover "+product.name}><Minus size={15}/></button>
                  <b>{currentQty}</b>
                  <button type="button" disabled={currentQty>=product.maxPerOrder} onClick={()=>quickAdd(product)} aria-label={"Adicionar "+product.name}><Plus size={15}/></button>
                </div>:<button
                  type="button"
                  className="foodQuickAddV3"
                  disabled={!product.available}
                  onClick={()=>quickAdd(product)}
                >
                  <Plus size={16}/>{product.groups.length?t.choose:t.add}
                </button>}
              </div>
            </article>;
          })}
        </div>
      </section>)}
    </section>

    <aside className={"foodCartV3"+(cartOpen?" isOpen":"")}>
      <div className="foodCartV3Head">
        <div>
          <span><ShoppingBag size={19}/></span>
          <div><small>{t.order}</small><h2>{itemCount} {itemCount===1?t.item:t.items}</h2></div>
        </div>
        <button type="button" className="foodCartCloseV3" onClick={()=>setCartOpen(false)} aria-label={t.closeCart}><X size={18}/></button>
      </div>

      {itemCount===0?<div className="foodCartEmptyV3">
        <ShoppingBag size={28}/>
        <b>{t.emptyCart}</b>
        <span>{t.emptyCartHelp}</span>
      </div>:<div className="foodCartLinesV3">
        {cartLines.map(({product,quantity,selectedOptions,lineTotal})=><div className="foodCartLineV3" key={product.id}>
          <div className="foodCartLineTopV3">
            <div><b>{quantity}× {product.name}</b>{selectedOptions.length>0&&<small>{selectedOptions.map(option=>option.name).join(" • ")}</small>}</div>
            <strong>{money(lineTotal,locale)}</strong>
          </div>
          {itemNotes[product.id]?.trim()&&<small className="foodCartNoteV3">{t.note} {itemNotes[product.id]}</small>}
          <div className="foodCartLineActionsV3">
            <button type="button" onClick={()=>setSelectedProduct(product)}>{t.edit}</button>
            <div><button type="button" onClick={()=>remove(product)}><Minus size={13}/></button><b>{quantity}</b><button type="button" onClick={()=>quickAdd(product)}><Plus size={13}/></button></div>
          </div>
        </div>)}
      </div>}

      <div className="foodOrderTotalV3">
        <span>{t.subtotal}</span><b>{money(total,locale)}</b>
      </div>

      <form action={placeRestaurantOrder} className="foodOrderFormV3">
        <input type="hidden" name="cart" value={payload}/>
        <input type="hidden" name="bookingToken" value={bookingToken}/>
        <input type="hidden" name="successPath" value={successPath}/>
        <input type="hidden" name="orderSource" value={standalone?"STANDALONE_MENU":bookingToken?"ROOM_QR":"PUBLIC_MENU"}/>

        <div className="foodCheckoutTitleV3">
          <small>{t.finish}</small>
          <b>{t.delivery}</b>
        </div>

        <label><span><UserRound size={14}/>{t.name}</span><input name="guestName" required placeholder={t.who}/></label>
        <label><span><BedDouble size={14}/>{standalone?"Entrega / retirada":t.room}</span><input name="roomLabel" placeholder={standalone?"Endereço, referência ou retirada no balcão":bookingToken?t.linkedRoom:t.roomPickup}/></label>
        <label><span><Phone size={14}/>WhatsApp</span><input name="phone" inputMode="tel" placeholder="(13) 99999-9999"/></label>
        <label><span><CreditCard size={14}/>{t.payment}</span>
          <select name="paymentMethod" defaultValue={bookingToken?"ROOM":"PIX"}>
            {bookingToken&&<option value="ROOM">{t.chargeStay}</option>}
            <option value="PIX">PIX</option><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option>
          </select>
        </label>
        <label><span><MessageSquareText size={14}/>{t.notes}</span><textarea name="notes" rows={2} maxLength={1000} placeholder={t.notesPlaceholder}/></label>

        <button className="foodOrderSubmitV3" disabled={!total||!accepting}>
          <span>{accepting?itemCount>0?t.place:t.addItem:t.pausedBtn}</span>
          {itemCount>0&&<b>{money(total,locale)}</b>}
          <ChevronRight size={18}/>
        </button>
      </form>

      <p className="foodOrderTrustV3">{t.trust}</p>
    </aside>

    {itemCount>0&&<button type="button" className="foodMobileCartBarV3" onClick={()=>setCartOpen(true)}>
      <span><i>{itemCount}</i><ShoppingBag size={18}/><b>{t.viewOrder}</b></span>
      <strong>{money(total,locale)}</strong>
    </button>}

    {selectedProduct&&<div className="foodProductModalBackdropV3" role="presentation" onMouseDown={event=>{
      if(event.currentTarget===event.target)setSelectedProduct(null);
    }}>
      <section className="foodProductModalV3" role="dialog" aria-modal="true" aria-label={selectedProduct.name}>
        <button type="button" className="foodModalCloseV3" onClick={()=>setSelectedProduct(null)} aria-label={t.close}><X size={20}/></button>

        <div className="foodModalHeroV3">
          {selectedProduct.imageUrl
            ?<img src={selectedProduct.imageUrl} alt={selectedProduct.name}/>
            :<div className="foodProductPlaceholderV3">MORIAH FOOD</div>}
        </div>

        <div className="foodModalBodyV3">
          <div className="foodModalTitleV3">
            <div><small>{selectedProduct.category}</small><h2>{selectedProduct.name}</h2></div>
            <strong>{money(selectedProduct.priceCents,locale)}</strong>
          </div>
          <p>{selectedProduct.description||t.prepared}</p>

          {(selectedProduct.prepMinutes||selectedProduct.tags.length>0)&&<div className="foodModalMetaV3">
            {selectedProduct.prepMinutes&&<span><Clock3 size={12}/>~{selectedProduct.prepMinutes} min</span>}
            {selectedProduct.tags.map(tag=><span key={tag}>{tag}</span>)}
          </div>}

          {selectedProduct.groups.map(group=><div className="foodModifierV3" key={group.id}>
            <header>
              <div><b>{group.name}</b><small>{group.minSelect===group.maxSelect?t.chooseOne+" "+group.minSelect:t.chooseRange+" "+group.minSelect+" a "+group.maxSelect}</small></div>
              {group.required&&<span>{t.required}</span>}
            </header>
            <div>
              {group.options.map(option=><label key={option.id}>
                <span>
                  <input
                    type={group.maxSelect===1?"radio":"checkbox"}
                    name={selectedProduct.id+group.id}
                    checked={(mods[selectedProduct.id]||[]).includes(option.id)}
                    onChange={()=>toggle(selectedProduct,group,option.id)}
                  />
                  <b>{option.name}</b>
                </span>
                {option.priceCents>0&&<strong>+ {money(option.priceCents,locale)}</strong>}
              </label>)}
            </div>
          </div>)}

          {selectedProduct.allowNotes&&<label className="foodModalNoteV3">
            <b>{t.observation}</b>
            <textarea
              value={itemNotes[selectedProduct.id]||""}
              maxLength={500}
              rows={3}
              placeholder={t.obsPlaceholder}
              onChange={event=>setItemNotes(current=>({...current,[selectedProduct.id]:event.target.value}))}
            />
          </label>}

          {selectedProduct.allergens.length>0&&<div className="foodAllergenV3"><b>{t.allergens}</b> {selectedProduct.allergens.join(", ")}</div>}
        </div>

        <footer className="foodModalFooterV3">
          {(cart[selectedProduct.id]||0)>0?<div className="foodModalQtyV3">
            <button type="button" onClick={()=>remove(selectedProduct)}><Minus size={17}/></button>
            <b>{cart[selectedProduct.id]||0}</b>
            <button type="button" disabled={(cart[selectedProduct.id]||0)>=selectedProduct.maxPerOrder||!choicesValid(selectedProduct)} onClick={()=>add(selectedProduct)}><Plus size={17}/></button>
          </div>:<div/>}
          <button
            type="button"
            className="foodModalAddV3"
            disabled={!selectedProduct.available||!choicesValid(selectedProduct)||(cart[selectedProduct.id]||0)>=selectedProduct.maxPerOrder}
            onClick={()=>{
              add(selectedProduct);
              if(choicesValid(selectedProduct))setSelectedProduct(null);
            }}
          >
            <span>{(cart[selectedProduct.id]||0)>0?t.addMore:t.addOrder}</span>
            <b>{money(selectedProduct.priceCents+selectedExtra(selectedProduct),locale)}</b>
          </button>
        </footer>
      </section>
    </div>}
  </div>;
}
