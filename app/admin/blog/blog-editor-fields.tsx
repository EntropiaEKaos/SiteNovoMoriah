"use client";

import {useMemo,useRef,useState} from "react";

type PostValue={
  title?:string;
  slug?:string;
  excerpt?:string|null;
  content?:string;
  published?:boolean;
};

function slugify(value:string){
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,180);
}

function previewBlocks(content:string){
  return content.split(/\n{2,}/).filter(Boolean).slice(0,8);
}

export default function BlogEditorFields({
  post,
  media
}:{
  post?:PostValue;
  media:{id:string;url:string;alt:string|null}[];
}){
  const [title,setTitle]=useState(post?.title||"");
  const [slug,setSlug]=useState(post?.slug||"");
  const [slugEdited,setSlugEdited]=useState(Boolean(post?.slug));
  const [excerpt,setExcerpt]=useState(post?.excerpt||"");
  const [content,setContent]=useState(post?.content||"");
  const [imageToInsert,setImageToInsert]=useState("");
  const textarea=useRef<HTMLTextAreaElement|null>(null);

  const words=useMemo(()=>content.trim()?content.trim().split(/\s+/).length:0,[content]);
  const readingMinutes=Math.max(1,Math.ceil(words/200));

  function updateTitle(value:string){
    setTitle(value);
    if(!slugEdited)setSlug(slugify(value));
  }

  function insert(prefix:string,suffix="",placeholder="texto"){
    const el=textarea.current;
    const start=el?.selectionStart??content.length;
    const end=el?.selectionEnd??content.length;
    const selected=content.slice(start,end)||placeholder;
    const next=content.slice(0,start)+prefix+selected+suffix+content.slice(end);
    setContent(next);
    requestAnimationFrame(()=>{
      if(!el)return;
      const pos=start+prefix.length+selected.length+suffix.length;
      el.focus();
      el.setSelectionRange(pos,pos);
    });
  }

  function insertLine(value:string){
    const el=textarea.current;
    const start=el?.selectionStart??content.length;
    const before=content.slice(0,start);
    const needsBreak=before.length>0&&!before.endsWith("\n")?"\n":"";
    const next=before+needsBreak+value+"\n"+content.slice(start);
    setContent(next);
  }

  return <>
    <section className="adminTwoCol blogStudioTop">
      <article className="adminSectionCard">
        <div className="siteStudioSectionHead">
          <div><small>01 / PUBLICAÇÃO</small><h2>Título, URL e resumo</h2></div>
          <span className={"adminChip "+(post?.published?"ok":"warn")}>{post?.published?"NO AR":"EDITORIAL"}</span>
        </div>
        <div className="adminFormGrid">
          <label className="span2">Título
            <input
              name="title"
              required
              maxLength={180}
              value={title}
              onChange={event=>updateTitle(event.target.value)}
              placeholder="Ex.: 7 lugares para conhecer em Praia Grande"
            />
            <small>{title.length}/180</small>
          </label>
          <label className="span2">URL da publicação
            <div className="blogSlugField">
              <span>/blog/</span>
              <input
                name="slug"
                required
                maxLength={180}
                value={slug}
                onChange={event=>{
                  setSlugEdited(true);
                  setSlug(slugify(event.target.value));
                }}
                placeholder="7-lugares-para-conhecer"
              />
            </div>
          </label>
          <label className="span2">Resumo / descrição para busca
            <textarea
              name="excerpt"
              rows={4}
              maxLength={500}
              value={excerpt}
              onChange={event=>setExcerpt(event.target.value)}
              placeholder="Um resumo curto e convidativo. Ele aparece no card, no topo do artigo e ajuda o SEO."
            />
            <small>{excerpt.length}/500</small>
          </label>
          <label className="blogPublishToggle">
            <input type="checkbox" name="published" defaultChecked={post?.published??false}/>
            <span><b>Publicar no Journal</b><small>Desmarcado = rascunho</small></span>
          </label>
        </div>
      </article>

      <aside className="adminSectionCard blogSeoPreview">
        <small>PRÉVIA / GOOGLE + CARD</small>
        <div className="blogSeoUrl">pousadamoriah.com.br › blog › {slug||"sua-publicacao"}</div>
        <h3>{title||"Título da sua publicação"}</h3>
        <p>{excerpt||"O resumo aparecerá aqui e também será usado na apresentação do artigo."}</p>
        <div className="adminMetaRow">
          <span className="adminChip">{words} palavras</span>
          <span className="adminChip">≈ {readingMinutes} min de leitura</span>
        </div>
      </aside>
    </section>

    <section className="adminSectionCard">
      <div className="siteStudioSectionHead">
        <div><small>02 / CONTEÚDO</small><h2>Editor da matéria</h2></div>
        <span className="adminChip">{words} PALAVRAS</span>
      </div>
      <p>Use os botões para estruturar a matéria. O site converte essa sintaxe em títulos, listas, citações, imagens e parágrafos — sem aceitar HTML inseguro.</p>

      <div className="blogEditorToolbar">
        <button type="button" onClick={()=>insert("## ","","Título da seção")}>Título H2</button>
        <button type="button" onClick={()=>insert("### ","","Subtítulo")}>H3</button>
        <button type="button" onClick={()=>insert("**","**","texto em destaque")}>Negrito</button>
        <button type="button" onClick={()=>insertLine("- Item da lista")}>Lista</button>
        <button type="button" onClick={()=>insertLine("> Frase ou destaque")}>Citação</button>
        <button type="button" onClick={()=>insertLine("---")}>Separador</button>
        <select value={imageToInsert} onChange={event=>setImageToInsert(event.target.value)}>
          <option value="">Imagem da Galeria…</option>
          {media.map(item=><option value={item.url} key={item.id}>{item.alt||item.url}</option>)}
        </select>
        <button
          type="button"
          disabled={!imageToInsert}
          onClick={()=>{
            const item=media.find(mediaItem=>mediaItem.url===imageToInsert);
            insertLine("!["+(item?.alt||"Imagem da publicação")+"]("+imageToInsert+")");
          }}
        >Inserir imagem</button>
      </div>

      <div className="blogEditorWorkspace">
        <label>
          <span className="blogEditorLabel">CONTEÚDO</span>
          <textarea
            ref={textarea}
            name="content"
            required
            rows={26}
            value={content}
            onChange={event=>setContent(event.target.value)}
            placeholder={"Comece com uma introdução.\n\n## Um novo tópico\n\nEscreva os parágrafos da matéria...\n\n- Item de uma lista\n- Outro item\n\n> Uma frase em destaque"}
          />
        </label>

        <aside className="blogLivePreview">
          <small>PRÉVIA RÁPIDA</small>
          <h2>{title||"Título da matéria"}</h2>
          {excerpt&&<p className="blogPreviewLead">{excerpt}</p>}
          <div>
            {previewBlocks(content).length===0
              ?<p className="blogPreviewEmpty">Comece a escrever para visualizar a estrutura aqui.</p>
              :previewBlocks(content).map((block,index)=>{
                if(block.startsWith("## "))return <h3 key={index}>{block.slice(3)}</h3>;
                if(block.startsWith("### "))return <h4 key={index}>{block.slice(4)}</h4>;
                if(block.startsWith("> "))return <blockquote key={index}>{block.slice(2)}</blockquote>;
                if(block==="---")return <hr key={index}/>;
                return <p key={index}>{block.slice(0,280)}</p>;
              })}
          </div>
        </aside>
      </div>
    </section>
  </>;
}
