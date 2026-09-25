"use client";
import {useState} from "react";
type MediaItem={id:string;url:string;alt:string|null};
export default function MediaMultiPicker({name,media,defaultValues=[],label="Galeria",help="Selecione imagens da Galeria / S3."}:{name:string;media:MediaItem[];defaultValues?:string[];label?:string;help?:string}){
 const [selected,setSelected]=useState<string[]>(defaultValues);
 const toggle=(url:string)=>setSelected(cur=>cur.includes(url)?cur.filter(x=>x!==url):[...cur,url]);
 return <div className="mediaMultiField"><div className="mediaPickerTitle"><b>{label}</b><small>{selected.length} selecionada(s)</small></div>
 {selected.map(url=><input key={url} type="hidden" name={name} value={url}/>)}
 <div className="mediaMultiGrid">{media.map(item=>{const active=selected.includes(item.url);return <button key={item.id} type="button" className={"mediaMultiItem"+(active?" isSelected":"")} onClick={()=>toggle(item.url)} aria-pressed={active}><img src={item.url} alt={item.alt||"Imagem"}/><span>{active?"✓ Selecionada":"Selecionar"}</span></button>})}</div>
 <small className="mediaPickerHelp">{help}</small></div>
}
