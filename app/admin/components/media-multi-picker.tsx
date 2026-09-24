"use client";

import {useMemo,useState} from "react";

type MediaItem={id:string;url:string;alt:string|null};

export default function MediaMultiPicker({
  name,
  media,
  defaultValues=[],
  label="GALERIA / MÚLTIPLAS IMAGENS",
  maxItems=20
}:{
  name:string;
  media:MediaItem[];
  defaultValues?:string[];
  label?:string;
  maxItems?:number;
}){
  const choices=useMemo(()=>{
    const known=new Set(media.map(item=>item.url));
    const preserved:MediaItem[]=defaultValues
      .filter(url=>url&&!known.has(url))
      .map((url,index)=>({
        id:"preserved-"+index,
        url,
        alt:"Imagem já vinculada"
      }));
    return [...preserved,...media];
  },[defaultValues,media]);

  const [selected,setSelected]=useState<string[]>(()=>{
    return [...new Set(defaultValues.filter(Boolean))].slice(0,maxItems);
  });

  if(choices.length===0)return <div className="adminPageNote">
    Nenhuma imagem disponível. Envie imagens pela Galeria antes de montar esta galeria.
  </div>;

  function toggle(url:string){
    setSelected(current=>{
      if(current.includes(url))return current.filter(item=>item!==url);
      if(current.length>=maxItems)return current;
      return [...current,url];
    });
  }

  return <fieldset className="mediaMultiPicker">
    <legend>{label}</legend>

    {selected.map(url=><input key={url} type="hidden" name={name} value={url}/>)}

    <div className="adminPageNote mediaMultiPickerNotice">
      <b>{selected.length}/{maxItems}</b> imagem(ns) selecionada(s). As escolhas abaixo são gravadas junto com o formulário.
    </div>

    <div className="adminImageGrid">
      {choices.map(item=>{
        const checked=selected.includes(item.url);
        const blocked=!checked&&selected.length>=maxItems;
        return <label className="adminMediaCard" key={item.id} style={{cursor:blocked?"not-allowed":"pointer",opacity:blocked?.55:1}}>
          <img src={item.url} alt={item.alt||""}/>
          <div className="adminMediaCardBody">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input
                type="checkbox"
                checked={checked}
                disabled={blocked}
                onChange={()=>toggle(item.url)}
              />
              <b>{item.alt||"Imagem sem descrição"}</b>
            </div>
          </div>
        </label>;
      })}
    </div>
  </fieldset>;
}
