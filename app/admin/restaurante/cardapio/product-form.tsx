import MediaPicker from "../../components/media-picker";

const DAYS=[
  [0,"Dom"],
  [1,"Seg"],
  [2,"Ter"],
  [3,"Qua"],
  [4,"Qui"],
  [5,"Sex"],
  [6,"Sáb"]
] as const;

type ProductValue={
  id?:string;
  categoryId?:string;
  name?:string;
  description?:string|null;
  imageUrl?:string|null;
  priceCents?:number;
  promotionalPriceCents?:number|null;
  costCents?:number|null;
  sku?:string|null;
  active?:boolean;
  featured?:boolean;
  soldOut?:boolean;
  badge?:string|null;
  tags?:string[];
  allergens?:string[];
  sortOrder?:number;
  prepMinutes?:number|null;
  maxPerOrder?:number;
  allowNotes?:boolean;
  availableFrom?:string|null;
  availableUntil?:string|null;
  availableDays?:number[];
  trackStock?:boolean;
  stockQty?:number;
  minStockQty?:number;
  modifierLinks?:Array<{groupId:string}>;
  recipes?:Array<{ingredientId:string;quantity:number}>;
};

export default function MenuProductForm({
  action,
  product,
  categories,
  media,
  modifierGroups,
  ingredients
}:{
  action:(formData:FormData)=>void|Promise<void>;
  product?:ProductValue;
  categories:Array<{id:string;name:string;active:boolean}>;
  media:Array<{id:string;url:string;alt:string|null}>;
  modifierGroups:Array<{
    id:string;
    name:string;
    required:boolean;
    minSelect:number;
    maxSelect:number;
    active:boolean;
    options:Array<{id:string;name:string;priceCents:number}>;
  }>;
  ingredients:Array<{
    id:string;
    name:string;
    unit:string;
    stockQty:number;
    active:boolean;
  }>;
}){
  const daySet=new Set(product?.availableDays||[]);
  const linkedGroups=new Set(product?.modifierLinks?.map(link=>link.groupId)||[]);
  const recipeMap=new Map(product?.recipes?.map(recipe=>[recipe.ingredientId,recipe.quantity])||[]);

  return <form action={action} className="adminStack menuStudioProductForm">
    {product?.id&&<input type="hidden" name="id" value={product.id}/>}

    <section className="adminSectionCard">
      <div className="menuStudioSectionTitle">
        <div><small>01 / IDENTIDADE</small><h2>Produto</h2></div>
        <span className="adminChip">O que o cliente vê</span>
      </div>
      <div className="adminFormGrid cols3">
        <label className="span2">Nome do item
          <input name="name" required maxLength={160} defaultValue={product?.name||""} placeholder="Ex.: X-Bacon Moriah"/>
        </label>
        <label>Categoria
          <select name="categoryId" required defaultValue={product?.categoryId||categories[0]?.id||""}>
            <option value="">Selecione</option>
            {categories.map(category=><option key={category.id} value={category.id}>
              {category.name}{category.active?"":" • oculta"}
            </option>)}
          </select>
        </label>
        <label className="span2">Descrição
          <textarea name="description" rows={5} maxLength={4000} defaultValue={product?.description||""} placeholder="Ingredientes, preparo e diferenciais do prato."/>
        </label>
        <label>SKU / código
          <input name="sku" maxLength={80} defaultValue={product?.sku||""} placeholder="FOOD-001"/>
        </label>
        <label>Badge
          <input name="badge" maxLength={80} defaultValue={product?.badge||""} placeholder="Mais pedido / Novo"/>
        </label>
        <label>Tags
          <input name="tags" defaultValue={(product?.tags||[]).join(", ")} placeholder="lanche, artesanal, jantar"/>
        </label>
        <label>Alérgenos
          <input name="allergens" defaultValue={(product?.allergens||[]).join(", ")} placeholder="glúten, lactose, amendoim"/>
        </label>
      </div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <div className="menuStudioSectionTitle">
          <div><small>02 / IMAGEM</small><h2>Apresentação</h2></div>
        </div>
        <MediaPicker name="imageUrl" media={media} defaultValue={product?.imageUrl||""}/>
        {product?.imageUrl&&<div className="menuStudioImagePreview">
          <img src={product.imageUrl} alt={product.name||""}/>
        </div>}
      </article>

      <article className="adminSectionCard">
        <div className="menuStudioSectionTitle">
          <div><small>03 / PREÇO</small><h2>Venda & CMV</h2></div>
        </div>
        <div className="adminFormGrid">
          <label>Preço normal
            <input name="price" required inputMode="decimal" defaultValue={product?.priceCents==null?"":(product.priceCents/100).toFixed(2)}/>
          </label>
          <label>Preço promocional
            <input name="promotionalPrice" inputMode="decimal" defaultValue={product?.promotionalPriceCents==null?"":(product.promotionalPriceCents/100).toFixed(2)} placeholder="Opcional"/>
          </label>
          <label>Custo estimado
            <input name="cost" inputMode="decimal" defaultValue={product?.costCents==null?"":(product.costCents/100).toFixed(2)} placeholder="Opcional"/>
          </label>
          <label>Tempo de preparo
            <input name="prepMinutes" type="number" min="1" max="240" defaultValue={product?.prepMinutes??""} placeholder="min"/>
          </label>
          <label>Máx. por pedido
            <input name="maxPerOrder" type="number" min="1" max="100" defaultValue={product?.maxPerOrder??20}/>
          </label>
          <label>Ordem
            <input name="sortOrder" type="number" min="0" max="100000" defaultValue={product?.sortOrder??100}/>
          </label>
        </div>
      </article>
    </section>

    <section className="adminSectionCard">
      <div className="menuStudioSectionTitle">
        <div><small>04 / PUBLICAÇÃO</small><h2>Estado do item</h2></div>
      </div>
      <div className="menuStudioSwitchGrid">
        <label><input name="active" type="checkbox" defaultChecked={product?.active??true}/><span><b>Publicado</b><small>Aparece no cardápio quando disponível.</small></span></label>
        <label><input name="featured" type="checkbox" defaultChecked={product?.featured??false}/><span><b>Destaque</b><small>Prioridade visual no cardápio.</small></span></label>
        <label><input name="soldOut" type="checkbox" defaultChecked={product?.soldOut??false}/><span><b>Esgotado manual</b><small>Bloqueia venda sem alterar estoque.</small></span></label>
        <label><input name="allowNotes" type="checkbox" defaultChecked={product?.allowNotes??true}/><span><b>Aceitar observações</b><small>Permite observação especial no pedido.</small></span></label>
      </div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <div className="menuStudioSectionTitle">
          <div><small>05 / ESTOQUE</small><h2>Controle direto</h2></div>
        </div>
        <div className="adminFormGrid">
          <label style={{display:"flex",alignItems:"center",gap:8}}>
            <input name="trackStock" type="checkbox" defaultChecked={product?.trackStock??true}/> Controlar estoque por unidade
          </label>
          <label>Estoque atual
            <input name="stockQty" type="number" min="0" max="1000000" defaultValue={product?.stockQty??0}/>
          </label>
          <label>Estoque mínimo
            <input name="minStockQty" type="number" min="0" max="1000000" defaultValue={product?.minStockQty??0}/>
          </label>
        </div>
      </article>

      <article className="adminSectionCard">
        <div className="menuStudioSectionTitle">
          <div><small>06 / JANELA DE VENDA</small><h2>Disponibilidade</h2></div>
        </div>
        <div className="adminFormGrid">
          <label>Disponível a partir de
            <input name="availableFrom" type="time" defaultValue={product?.availableFrom||""}/>
          </label>
          <label>Disponível até
            <input name="availableUntil" type="time" defaultValue={product?.availableUntil||""}/>
          </label>
        </div>
        <div className="menuStudioDays">
          {DAYS.map(([value,label])=><label key={value}>
            <input type="checkbox" name="availableDays" value={value} defaultChecked={daySet.has(value)}/>
            <span>{label}</span>
          </label>)}
        </div>
        <p className="adminHelp">Nenhum dia marcado = todos os dias. Horário vazio = sem restrição específica do produto.</p>
      </article>
    </section>

    <section className="adminSectionCard">
      <div className="menuStudioSectionTitle">
        <div><small>07 / PERSONALIZAÇÃO</small><h2>Adicionais & escolhas</h2></div>
        <span className="adminChip">{modifierGroups.length} grupo(s)</span>
      </div>

      {modifierGroups.length===0?<div className="adminPageNote">
        Nenhum grupo de adicionais criado. Use Moriah Food → Adicionais para criar opções.
      </div>:<div className="menuStudioChoiceGrid">
        {modifierGroups.map(group=><label key={group.id} className={!group.active?"isMuted":""}>
          <input
            type="checkbox"
            name="modifierGroupIds"
            value={group.id}
            defaultChecked={linkedGroups.has(group.id)}
          />
          <span>
            <b>{group.name}</b>
            <small>{group.required?"Obrigatório":"Opcional"} • {group.minSelect}–{group.maxSelect} escolha(s)</small>
            <em>{group.options.map(option=>option.name).join(" • ")||"Sem opções"}</em>
          </span>
        </label>)}
      </div>}
    </section>

    <section className="adminSectionCard">
      <div className="menuStudioSectionTitle">
        <div><small>08 / FICHA TÉCNICA</small><h2>Ingredientes por unidade vendida</h2></div>
        <span className="adminChip">{ingredients.length} insumo(s)</span>
      </div>

      {ingredients.length===0?<div className="adminPageNote">
        Nenhum insumo ativo cadastrado. O produto pode ser salvo sem ficha técnica.
      </div>:<div className="menuStudioRecipeGrid">
        {ingredients.map(ingredient=><label key={ingredient.id} className={ingredient.active?"":"isMuted"}>
          <span><b>{ingredient.name}{ingredient.active?"":" • inativo"}</b><small>Estoque: {ingredient.stockQty} {ingredient.unit}</small></span>
          <input
            name={"ingredient_"+ingredient.id}
            type="number"
            min="0"
            step=".001"
            defaultValue={recipeMap.get(ingredient.id)??""}
            placeholder={"Qtd. em "+ingredient.unit}
          />
        </label>)}
      </div>}
    </section>

    <button className="adminPrimaryAction menuStudioSave" style={{border:0}}>
      {product?.id?"Salvar produto":"Criar produto"}
    </button>
  </form>;
}
