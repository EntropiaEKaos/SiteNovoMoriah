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
  ["FOOD","Moriah Food"],
  ["STATS","Números / indicadores"],
  ["FAQ","Perguntas frequentes"],
  ["TESTIMONIALS","Depoimentos"],
  ["CONTACT","Contato"],
  ["VIDEO","Vídeo"]
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
  ["MOSAIC","Mosaico"],
  ["CARDS","Cards"]
] as const;

const ANIMATIONS=[
  ["NONE","Sem animação"],
  ["FADE_UP","Subir suavemente"],
  ["FADE","Fade"],
  ["SLIDE_LEFT","Entrar pela esquerda"],
  ["SLIDE_RIGHT","Entrar pela direita"],
  ["ZOOM","Zoom suave"]
] as const;

const WIDTHS=[
  ["NARROW","Estreito"],
  ["NORMAL","Normal"],
  ["WIDE","Amplo"],
  ["FULL","Tela inteira"]
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
  videoUrl?:string|null;
  anchorId?:string|null;
  backgroundImageUrl?:string|null;
  backgroundColor?:string|null;
  textColor?:string|null;
  animation?:string;
  animationDelay?:number;
  paddingY?:number;
  contentWidth?:string;
  hideMobile?:boolean;
  hideDesktop?:boolean;
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
      <div className="siteStudioSectionHead">
        <div><small>01 / BLOCO</small><h2>Estrutura da seção</h2></div>
        <span className="adminChip">Layout + publicação</span>
      </div>
      <p>Defina o tipo do bloco, posição, largura, tema e comportamento responsivo.</p>
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
        <label>Largura de conteúdo
          <select name="contentWidth" defaultValue={section?.contentWidth||"NORMAL"}>
            {WIDTHS.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Ordem
          <input name="sortOrder" type="number" min="0" max="9999" defaultValue={section?.sortOrder??100}/>
        </label>
        <label>Âncora
          <input name="anchorId" maxLength={80} defaultValue={section?.anchorId||""} placeholder="ex.: lazer"/>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <span><input name="active" type="checkbox" defaultChecked={section?.active??true}/> Seção publicada</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <span><input name="hideMobile" type="checkbox" defaultChecked={section?.hideMobile??false}/> Ocultar no celular</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <span><input name="hideDesktop" type="checkbox" defaultChecked={section?.hideDesktop??false}/> Ocultar no desktop</span>
        </label>
      </div>
    </section>

    <section className="adminSectionCard">
      <div className="siteStudioSectionHead">
        <div><small>02 / CONTEÚDO</small><h2>Textos que aparecem no site</h2></div>
      </div>
      <p>Preencha aqui o conteúdo visível desta parte da página. <b>Título</b> é a chamada principal, <b>Subtítulo</b> é a linha de apoio e <b>Texto</b> é a descrição. Para FAQ use <b>Pergunta | Resposta</b>; para números use <b>Valor | Rótulo</b>.</p>
      <div className="adminFormGrid">
        <label>Chamada pequena / categoria
          <input name="eyebrow" maxLength={120} defaultValue={section?.eyebrow||""} placeholder="Ex.: ESCOLHA SUA ESTADIA"/>
        </label>
        <label>Subtítulo / linha de apoio
          <input name="subtitle" maxLength={300} defaultValue={section?.subtitle||""} placeholder="Linha de apoio"/>
        </label>
        <label className="span2">Título
          <input name="title" maxLength={220} defaultValue={section?.title||""} placeholder="Título principal da seção"/>
        </label>
        <label className="span2">Texto principal / itens
          <textarea name="body" rows={9} maxLength={8000} defaultValue={section?.body||""} placeholder={"Texto editorial ou itens por linha.\nFAQ: Pergunta | Resposta\nNúmeros: 24h | Atendimento"}/>
        </label>
      </div>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <div className="siteStudioSectionHead">
          <div><small>03 / MÍDIA</small><h2>Imagem principal</h2></div>
        </div>
        <MediaPicker name="imageUrl" media={media} defaultValue={section?.imageUrl||""}/>
        <label style={{display:"grid",gap:6,marginTop:12,fontSize:10,fontWeight:850}}>
          Texto alternativo
          <input name="imageAlt" maxLength={300} defaultValue={section?.imageAlt||""} placeholder="Descrição acessível da imagem"/>
        </label>
      </article>

      <article className="adminSectionCard">
        <div className="siteStudioSectionHead">
          <div><small>04 / FUNDO</small><h2>Direção visual</h2></div>
        </div>
        <MediaPicker name="backgroundImageUrl" media={media} defaultValue={section?.backgroundImageUrl||""}/>
        <div className="adminFormGrid" style={{marginTop:12}}>
          <label>Cor de fundo personalizada
            <input name="backgroundColor" defaultValue={section?.backgroundColor||""} placeholder="#ffffff"/>
          </label>
          <label>Cor do texto personalizada
            <input name="textColor" defaultValue={section?.textColor||""} placeholder="#111111"/>
          </label>
        </div>
        <p className="adminHelp">As cores personalizadas sobrescrevem o tema somente nesta seção.</p>
      </article>
    </section>

    <section className="adminSectionCard">
      <div className="siteStudioSectionHead">
        <div><small>05 / GALERIA</small><h2>Múltiplas imagens</h2></div>
      </div>
      <MediaMultiPicker name="mediaUrls" media={media} defaultValues={section?.mediaUrls||[]} label="MÍDIAS DA SEÇÃO"/>
    </section>

    <section className="adminTwoCol">
      <article className="adminSectionCard">
        <div className="siteStudioSectionHead">
          <div><small>06 / MOVIMENTO</small><h2>Animação & ritmo</h2></div>
        </div>
        <div className="adminFormGrid">
          <label>Animação
            <select name="animation" defaultValue={section?.animation||"FADE_UP"}>
              {ANIMATIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Atraso
            <select name="animationDelay" defaultValue={String(section?.animationDelay??0)}>
              <option value="0">0 ms</option>
              <option value="100">100 ms</option>
              <option value="200">200 ms</option>
              <option value="300">300 ms</option>
              <option value="500">500 ms</option>
              <option value="700">700 ms</option>
            </select>
          </label>
          <label className="span2">Espaçamento vertical
            <input name="paddingY" type="range" min="0" max="240" step="8" defaultValue={section?.paddingY??96}/>
            <small>0–240 px</small>
          </label>
        </div>
      </article>

      <article className="adminSectionCard">
        <div className="siteStudioSectionHead">
          <div><small>07 / VÍDEO</small><h2>Conteúdo em movimento</h2></div>
        </div>
        <label style={{display:"grid",gap:6,fontSize:10,fontWeight:850}}>
          URL do vídeo
          <input name="videoUrl" type="url" maxLength={1200} defaultValue={section?.videoUrl||""} placeholder="https://youtube.com/watch?v=..."/>
        </label>
        <p className="adminHelp">O bloco Vídeo aceita YouTube/Vimeo ou um link HTTPS. Imagem principal funciona como capa.</p>
      </article>
    </section>

    <section className="adminSectionCard">
      <div className="siteStudioSectionHead">
        <div><small>08 / AÇÕES</small><h2>Botões e navegação</h2></div>
      </div>
      <p>Links internos podem usar caminhos como <b>/reservar</b>, páginas criadas no Studio ou âncoras como <b>#hospedagem</b>.</p>
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
