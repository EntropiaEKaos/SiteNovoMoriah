"use client";

import {useMemo,useState} from "react";

type MediaItem={id:string;url:string;alt:string|null};

export default function MediaPicker({
  name,
  media,
  defaultValue="",
  label="Imagem",
  help="Escolha uma imagem da Galeria / S3.",
  recommended,
  emptyLabel="Sem imagem"
}:{
  name:string;
  media:MediaItem[];
  defaultValue?:string;
  label?:string;
  help?:string;
  recommended?:string;
  emptyLabel?:string;
}){
  const [value,setValue]=useState(defaultValue);
  const selected=useMemo(()=>media.find(item=>item.url===value)||null,[media,value]);

  return <label className="mediaPickerField">
    <span className="mediaPickerTitle">
      <b>{label}</b>
      {recommended&&<small>{recommended}</small>}
    </span>

    <input type="hidden" name={name} value={value}/>
    <select value={value} onChange={event=>setValue(event.target.value)}>
      <option value="">{emptyLabel}</option>
      {defaultValue&&!media.some(item=>item.url===defaultValue)&&<option value={defaultValue}>Imagem atual</option>}
      {media.map(item=><option key={item.id} value={item.url}>{item.alt||item.url}</option>)}
    </select>

    {value&&<div className="mediaPickerPreview">
      <img src={value} alt={selected?.alt||label}/>
      <span>
        <b>{selected?.alt||"Imagem selecionada"}</b>
        <small>{label}</small>
      </span>
    </div>}

    <small className="mediaPickerHelp">{help}</small>
  </label>;
}
