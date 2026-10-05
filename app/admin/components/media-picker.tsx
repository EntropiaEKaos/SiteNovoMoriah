"use client";

import {useMemo,useRef,useState} from "react";

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
  const [uploaded,setUploaded]=useState<MediaItem[]>([]);
  const [uploading,setUploading]=useState(false);
  const [uploadError,setUploadError]=useState("");
  const fileInput=useRef<HTMLInputElement>(null);
  const allMedia=useMemo(()=>[...uploaded,...media],[uploaded,media]);
  const selected=useMemo(()=>allMedia.find(item=>item.url===value)||null,[allMedia,value]);

  async function uploadImage(){
    const file=fileInput.current?.files?.[0];
    if(!file||uploading)return;
    setUploading(true);setUploadError("");
    try{
      const form=new FormData();form.append("file",file);form.append("alt",file.name.replace(/\\.[^.]+$/,""));
      const response=await fetch("/api/media/upload",{method:"POST",body:form});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Falha ao enviar imagem.");
      const item={id:String(data.id),url:String(data.publicUrl),alt:file.name.replace(/\\.[^.]+$/,"")};
      setUploaded(current=>[item,...current]);setValue(item.url);
    }catch(error){setUploadError(error instanceof Error?error.message:"Falha ao enviar imagem.");}
    finally{setUploading(false);}
  }

  return <label className="mediaPickerField">
    <span className="mediaPickerTitle">
      <b>{label}</b>
      {recommended&&<small>{recommended}</small>}
    </span>

    <input type="hidden" name={name} value={value}/>
    <select value={value} onChange={event=>setValue(event.target.value)}>
      <option value="">{emptyLabel}</option>
      {defaultValue&&!media.some(item=>item.url===defaultValue)&&<option value={defaultValue}>Imagem atual</option>}
      {allMedia.map(item=><option key={item.id} value={item.url}>{item.alt||item.url}</option>)}
    </select>

    {value&&<div className="mediaPickerPreview">
      <img src={value} alt={selected?.alt||label}/>
      <span>
        <b>{selected?.alt||"Imagem selecionada"}</b>
        <small>{label}</small>
      </span>
    </div>}

    <div className="adminInlineActions" style={{marginTop:8}}>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}/>
      <button type="button" onClick={uploadImage} disabled={uploading}>{uploading?"Enviando…":"Enviar nova imagem"}</button>
    </div>
    {uploadError&&<small className="adminPageNote">{uploadError}</small>}
    <small className="mediaPickerHelp">{help} Você também pode enviar uma nova imagem aqui (até 3,5 MB).</small>
  </label>;
}
