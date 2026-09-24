import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import MediaPicker from "../../components/media-picker";
import {
  deleteMenuCategory,
  deleteMenuProduct,
  duplicateMenuProduct,
  moveMenuCategory,
  moveMenuProduct,
  saveRestaurantMenuSettings,
  toggleMenuProduct,
  updateMenuCategory,
  createMenuCategory
} from "../../../../lib/restaurant-actions";
import {effectiveRestaurantPrice,isMenuScheduleAvailable} from "../../../../lib/restaurant-menu";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dayLabels=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function scheduleLabel(item:{
  availableFrom:string|null;
  availableUntil:string|null;
  availableDays:number[];
}){
  const days=item.availableDays.length
    ?item.availableDays.map(day=>dayLabels[day]).join(", ")
    :"Todos os dias";
  const hours=item.availableFrom||item.availableUntil
    ?`${item.availableFrom||"00:00"}–${item.availableUntil||"24:00"}`
    :"Dia inteiro";
  return days+" • "+hours;
}

export default async function MenuStudio(){
  await requireAdmin();

  const [settings,categories,media]=await Promise.all([
    prisma.restaurantSettings.findUnique({where:{id:"main"}}),
    prisma.restaurantCategory.findMany({
      include:{
        products:{
          include:{recipes:{include:{ingredient:true}}},
          orderBy:[{sortOrder:"asc"},{name:"asc"}]
        }
      },
      orderBy:[{sortOrder:"asc"},{name:"asc"}]
    }),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:250})
  ]);

  const products=categories.flatMap(category=>category.products);
  const active=products.filter(product=>product.active).length;
  const featured=products.filter(product=>product.featured).length;
  const soldOut=products.filter(product=>product.soldOut).length;
  const scheduled=products.filter(product=>product.availableDays.length||product.availableFrom||product.availableUntil).length;

  return <main className="adminPage menuStudio">
    <section className="adminPageHero menuStudioHero">
      <div>
        <small>MORIAH FOOD / CARDÁPIO STUDIO 1.0</small>
        <h1>Cardápio completo.</h1>
        <p>Crie, organize, precifique e publique o cardápio conectado ao estoque, ficha técnica, adicionais e cozinha.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/restaurante" target="_blank">Ver cardápio ↗</Link>
        <Link className="adminPrimaryAction" href="/admin/restaurante/cardapio/novo">+ Novo produto</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Produtos</small><strong>{products.length}</strong></div>
      <div><small>Publicados</small><strong>{active}</strong></div>
      <div><small>Destaques</small><strong>{featured}</strong></div>
      <div><small>Esgotados</small><strong>{soldOut}</strong></div>
    </section>

    <section className="adminTwoCol" style={{marginBottom:22}}>
      <article className="adminSectionCard">
        <div className="menuStudioSectionTitle">
          <div><small>APRESENTAÇÃO</small><h2>Capa do cardápio</h2></div>
          <span className="adminChip">{scheduled} item(ns) com agenda</span>
        </div>
        <form action={saveRestaurantMenuSettings} className="adminFormGrid">
          <label className="span2">Título
            <input name="menuTitle" defaultValue={settings?.menuTitle||"Moriah Food"} maxLength={120}/>
          </label>
          <label className="span2">Subtítulo
            <textarea name="menuSubtitle" rows={3} maxLength={500} defaultValue={settings?.menuSubtitle||""} placeholder="Uma frase curta para apresentar a cozinha."/>
          </label>
          <div className="span2">
            <MediaPicker name="menuBannerUrl" media={media} defaultValue={settings?.menuBannerUrl||""}/>
          </div>
          <label className="span2" style={{display:"flex",alignItems:"center",gap:8}}>
            <input name="showSoldOut" type="checkbox" defaultChecked={settings?.showSoldOut!==false}/>
            Mostrar itens esgotados no cardápio em vez de escondê-los
          </label>
          <button className="span2">Salvar apresentação</button>
        </form>
      </article>

      <article className="adminSectionCard isDark">
        <small>FLUXO DE VENDA</small>
        <h2>Um único produto.</h2>
        <p>O item criado aqui é o mesmo usado no pedido, estoque, CMV, adicionais e KDS. Não há catálogo paralelo.</p>
        <div className="adminStatusLine"><span>Categorias</span><b>{categories.length}</b></div>
        <div className="adminStatusLine"><span>Itens publicados</span><b>{active}</b></div>
        <div className="adminStatusLine"><span>Com agenda própria</span><b>{scheduled}</b></div>
        <div className="adminInlineActions" style={{marginTop:18}}>
          <Link href="/admin/restaurante/adicionais">Adicionais →</Link>
          <Link href="/admin/restaurante/insumos">Insumos →</Link>
          <Link href="/admin/restaurante/pedidos">KDS →</Link>
        </div>
      </article>
    </section>

    <section className="adminSectionCard" style={{marginBottom:22}}>
      <div className="menuStudioSectionTitle">
        <div><small>ESTRUTURA</small><h2>Nova categoria</h2></div>
      </div>
      <form action={createMenuCategory} className="adminFormGrid cols3">
        <label>Nome
          <input name="name" required maxLength={120} placeholder="Lanches, pratos, bebidas..."/>
        </label>
        <label>Ordem
          <input name="sortOrder" type="number" min="0" defaultValue="100"/>
        </label>
        <div>
          <MediaPicker
            name="imageUrl"
            media={media}
            label="Imagem da categoria"
            help="Aparece na apresentação visual desta categoria do cardápio."
            recommended="Horizontal ou quadrada • boa resolução"
          />
        </div>
        <label className="span2">Descrição
          <input name="description" maxLength={1000} placeholder="Descrição curta da categoria"/>
        </label>
        <label style={{display:"flex",gap:8,alignItems:"center"}}><input name="active" type="checkbox" defaultChecked/> Publicada</label>
        <label style={{display:"flex",gap:8,alignItems:"center"}}><input name="featured" type="checkbox"/> Destaque</label>
        <label>De
          <input name="availableFrom" type="time"/>
        </label>
        <label>Até
          <input name="availableUntil" type="time"/>
        </label>
        <div className="span2 menuStudioDays">
          {[0,1,2,3,4,5,6].map(day=><label key={day}>
            <input name="availableDays" type="checkbox" value={day}/><span>{dayLabels[day]}</span>
          </label>)}
        </div>
        <button>Criar categoria</button>
      </form>
    </section>

    {categories.length===0?<section className="adminEmptyState">
      <strong>Crie a primeira categoria.</strong>
      <p>Depois você poderá adicionar os produtos completos dentro dela.</p>
    </section>:<section className="menuStudioCategories">
      {categories.map(category=>{
        const availableNow=isMenuScheduleAvailable(category);
        return <article className="menuStudioCategory" key={category.id}>
          <header>
            <div>
              <small>ORDEM {category.sortOrder} • {category.products.length} ITEM(NS)</small>
              <h2>{category.name}</h2>
              <p>{category.description||"Sem descrição."}</p>
            </div>
            <div className="adminMetaRow">
              <span className={"adminChip "+(category.active?"ok":"warn")}>{category.active?"PUBLICADA":"OCULTA"}</span>
              {category.featured&&<span className="adminChip">DESTAQUE</span>}
              <span className={"adminChip "+(availableNow?"ok":"warn")}>{availableNow?"AGORA":"FORA DO HORÁRIO"}</span>
            </div>
          </header>

          <details className="menuStudioCategoryEditor">
            <summary>Editar categoria e agenda</summary>
            <form action={updateMenuCategory} className="adminFormGrid cols3">
              <input type="hidden" name="id" value={category.id}/>
              <label>Nome<input name="name" required defaultValue={category.name}/></label>
              <label>Ordem<input name="sortOrder" type="number" min="0" defaultValue={category.sortOrder}/></label>
              <div>
                <MediaPicker
                  name="imageUrl"
                  media={media}
                  defaultValue={category.imageUrl||""}
                  label="Imagem da categoria"
                  help="Imagem persistida junto com a categoria."
                  recommended="Horizontal ou quadrada • boa resolução"
                />
              </div>
              <label className="span2">Descrição<input name="description" defaultValue={category.description||""}/></label>
              <label style={{display:"flex",gap:8,alignItems:"center"}}><input name="active" type="checkbox" defaultChecked={category.active}/> Publicada</label>
              <label style={{display:"flex",gap:8,alignItems:"center"}}><input name="featured" type="checkbox" defaultChecked={category.featured}/> Destaque</label>
              <label>De<input name="availableFrom" type="time" defaultValue={category.availableFrom||""}/></label>
              <label>Até<input name="availableUntil" type="time" defaultValue={category.availableUntil||""}/></label>
              <div className="span2 menuStudioDays">
                {[0,1,2,3,4,5,6].map(day=><label key={day}>
                  <input name="availableDays" type="checkbox" value={day} defaultChecked={category.availableDays.includes(day)}/><span>{dayLabels[day]}</span>
                </label>)}
              </div>
              <button>Salvar categoria</button>
            </form>
            <div className="adminInlineActions" style={{marginTop:10}}>
              <form action={moveMenuCategory}><input type="hidden" name="id" value={category.id}/><input type="hidden" name="direction" value="UP"/><button>↑ Subir</button></form>
              <form action={moveMenuCategory}><input type="hidden" name="id" value={category.id}/><input type="hidden" name="direction" value="DOWN"/><button>↓ Descer</button></form>
              {category.products.length===0&&<form action={deleteMenuCategory}><input type="hidden" name="id" value={category.id}/><button className="danger">Excluir categoria</button></form>}
            </div>
          </details>

          <div className="menuStudioCategoryMeta">{scheduleLabel(category)}</div>

          <div className="menuStudioProductGrid">
            {category.products.map(product=>{
              const price=effectiveRestaurantPrice(product);
              const productSchedule=isMenuScheduleAvailable(product);
              const ingredientBlocked=product.recipes.some(recipe=>!recipe.ingredient.active||recipe.ingredient.stockQty<recipe.quantity);
              const stockBlocked=product.trackStock&&product.stockQty<=0;
              const sellable=product.active&&!product.soldOut&&productSchedule&&!stockBlocked&&!ingredientBlocked&&category.active&&availableNow;

              return <div className={"menuStudioProductCard"+(sellable?"":" isUnavailable")} key={product.id}>
                <div className="menuStudioProductImage">
                  {product.imageUrl?<img src={product.imageUrl} alt={product.name}/>:<div>MF</div>}
                  {product.badge&&<span>{product.badge}</span>}
                </div>
                <div className="menuStudioProductBody">
                  <div className="menuStudioProductTop">
                    <div><small>{product.sku||"SEM SKU"}</small><h3>{product.name}</h3></div>
                    <b>{money(price)}</b>
                  </div>
                  {product.promotionalPriceCents!=null&&product.promotionalPriceCents<product.priceCents&&<p className="menuStudioOldPrice">{money(product.priceCents)}</p>}
                  <p>{product.description||"Sem descrição."}</p>
                  <div className="adminMetaRow">
                    <span className={"adminChip "+(sellable?"ok":"warn")}>{sellable?"VENDENDO":"INDISPONÍVEL"}</span>
                    {product.featured&&<span className="adminChip">DESTAQUE</span>}
                    {product.soldOut&&<span className="adminChip bad">ESGOTADO</span>}
                    {product.prepMinutes&&<span className="adminChip">{product.prepMinutes} min</span>}
                    {product.trackStock&&<span className="adminChip">Estoque {product.stockQty}</span>}
                  </div>
                  <small className="menuStudioSchedule">{scheduleLabel(product)}</small>
                  <div className="adminInlineActions">
                    <Link className="highlight" href={"/admin/restaurante/cardapio/"+product.id}>Editar</Link>
                    <form action={toggleMenuProduct}><input type="hidden" name="id" value={product.id}/><input type="hidden" name="field" value="active"/><button>{product.active?"Ocultar":"Publicar"}</button></form>
                    <form action={toggleMenuProduct}><input type="hidden" name="id" value={product.id}/><input type="hidden" name="field" value="featured"/><button>{product.featured?"Tirar destaque":"Destacar"}</button></form>
                    <form action={toggleMenuProduct}><input type="hidden" name="id" value={product.id}/><input type="hidden" name="field" value="soldOut"/><button>{product.soldOut?"Repor":"Esgotar"}</button></form>
                  </div>
                  <div className="adminInlineActions">
                    <form action={moveMenuProduct}><input type="hidden" name="id" value={product.id}/><input type="hidden" name="direction" value="UP"/><button>↑</button></form>
                    <form action={moveMenuProduct}><input type="hidden" name="id" value={product.id}/><input type="hidden" name="direction" value="DOWN"/><button>↓</button></form>
                    <form action={duplicateMenuProduct}><input type="hidden" name="id" value={product.id}/><button>Duplicar</button></form>
                    <form action={deleteMenuProduct}><input type="hidden" name="id" value={product.id}/><button className="danger">Excluir / arquivar</button></form>
                  </div>
                </div>
              </div>;
            })}

            <Link className="menuStudioAddProduct" href={"/admin/restaurante/cardapio/novo?category="+category.id}>
              <span>+</span><b>Novo produto</b><small>{category.name}</small>
            </Link>
          </div>
        </article>;
      })}
    </section>}
  </main>;
}
