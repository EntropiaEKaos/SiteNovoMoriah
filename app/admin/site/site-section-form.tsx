import MediaPicker from "../components/media-picker";
import MediaMultiPicker from "../components/media-multi-picker";

const TYPES=[
  ["HERO","Hero / abertura"],
  ["ACCOMMODATIONS","Hospedagens"],
  ["GALLERY","Galeria"],
  ["TRUST","Faixa de confiança"],
  ["FEATURES","Estrutura / diferenciais"],
  ["BLOG","Blog / Journal"],
  ["CTA","Chamada para reserva"],
  ["RICH_TEXT","Texto editorial"],
  ["FOOD","Moriah Food"]
] as const;

const THEMES=[
  ["LIGHT","Claro"],
  ["DARK","Escuro"],
  ["YELLOW","Amarelo Moriah"],
  ["SOFT","Suave"]
] as const;

const LAYOUTS=[
  ["DEFAULT","Padrão"],
  ["SPLIT","Dividido"],
  ["CENTERED","Centralizado"],
  ["WIDE","Amplo"],
  ["MOSAIC","Mosaico"]
] as const;

type SectionValue={
  id?:string;
  type?:string;
  eyebrow?:string|null;
  title?:string|null;
  subtitle?:string|null;
  body?:string|null;
  imageUrl?:string|null;
  imageAlt?:string|null;
  mediaUrls?:string[];
  ctaLabel?:string|null;
  ctaHref?:string|null;
  secondaryCtaLabel?:string|null;
  secondaryCtaHref?:string|null;
  theme?:string;
  layout?:string;
  sortOrder?:number;
  active?:boolean;
};

export default function SiteSectionForm({
  action,
  pageId,
  media,
  section
}:{
  action:(formData:FormData)=>void|Promise<void>;
  pageId:string;
  media:{id:string;url:string;alt:string|null}[];
  section?:SectionValue;
}){
  return <form action={action} className="adminStack siteBuilderForm">
    <input type="hidden" name="pageId" value={pageId}/>
    {section?.id&&<input type="hidden" name="id" value={section.id}/>}

    <section className="adminSectionCard">
      <h2>Estrutura da seção</h2>
      <p>Defina o bloco, sua posição e como ele se comporta na página.</p>
      <div className="adminFormGrid cols3">
        <label>Tipo
          <select name="type" defaultValue={section?.type||"RICH_TEXT"}>
            {TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Tema
          <select name="theme" defaultValue={section?.theme||"LIGHT"}>
            {THEMES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Layout
          <select name="layout" defaultValue={section?.layout||"DEFAULT"}>
            {LAYOUTS.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Ordem
          <input name="sortOrder" type="number" min="0" max="9999" defaultValue={section?.sortOrder??100}/>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <span><input name="active" type="checkbox" defaultChecked={section?.active??true}/> Seção publicada</span>
        </label>
      </div>
    </section>

    <section className="adminSectionCard">
      <h2>Conteúdo</h2>
      <p>Todos os campos são opcionais porque cada tipo de seção usa uma combinação diferente.</p>
      <div className="adminFormGrid">
        <label>Eyebrow / categoria
          <input name="eyebrow" maxLength={120} defaultValue={section?.eyebrow||""} placeholder="Ex.: ESCOLHA SUA ESTADIA"/>
        </label>
        <label>Subtítulo curto
          <input name="subtitle" maxLength={300} defaultValue={section?.subtitle||""} placeholder="Linha de apoio"/>
        </label>
        <label className="span2">Título
          <input name="title" maxLength={220} defaultValue={section?.title||""} placeholder="Título principal da seção"/>
        </label>
        <label className="span2">Texto
          <textarea name="body" rows={7} maxLength={6000} defaultValue={section?.body||""} placeholder="Texto editorial, descrição ou itens separados por quebra de linha."/>
        </label>
      </div>
    </section>

    <section className="adminSectionCard">
      <h2>Imagem principal</h2>
      <p>Hero, Moriah Food e seções editoriais podem usar uma imagem em destaque.</p>
      <MediaPicker name="imageUrl" media={media} defaultValue={section?.imageUrl||""}/>
      <label style={{display:"grid",gap:6,marginTop:12,fontSize:10,fontWeight:850}}>
        Texto alternativo
        <input name="imageAlt" maxLength={300} defaultValue={section?.imageAlt||""} placeholder="Descrição acessível da imagem"/>
      </label>
    </section>

    <section className="adminSectionCard">
      <h2>Galeria da seção</h2>
      <p>Use para mosaicos, ambientes, detalhes ou qualquer seção com múltiplas imagens.</p>
      <MediaMultiPicker name="mediaUrls" media={media} defaultValues={section?.mediaUrls||[]}/>
    </section>

    <section className="adminSectionCard">
      <h2>Ações</h2>
      <p>Configure até dois botões. Links internos podem usar caminhos como <b>/reservar</b> e âncoras como <b>#hospedagem</b>.</p>
      <div className="adminFormGrid">
        <label>Botão principal
          <input name="ctaLabel" maxLength={80} defaultValue={section?.ctaLabel||""} placeholder="Reservar agora"/>
        </label>
        <label>Destino principal
          <input name="ctaHref" maxLength={500} defaultValue={section?.ctaHref||""} placeholder="/reservar"/>
        </label>
        <label>Botão secundário
          <input name="secondaryCtaLabel" maxLength={80} defaultValue={section?.secondaryCtaLabel||""} placeholder="Conhecer acomodações"/>
        </label>
        <label>Destino secundário
          <input name="secondaryCtaHref" maxLength={500} defaultValue={section?.secondaryCtaHref||""} placeholder="#hospedagem"/>
        </label>
      </div>
    </section>

    <button className="adminPrimaryAction siteBuilderSave" style={{border:0,fontSize:13,padding:"15px 22px"}}>
      {section?.id?"Salvar seção":"Criar seção"}
    </button>
  </form>;
}
