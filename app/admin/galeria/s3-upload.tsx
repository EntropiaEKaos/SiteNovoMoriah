"use client";

import {useRef,useState} from "react";

const SERVER_LIMIT=3_500_000;
const MAX_FILES=20;

type UploadState={
  name:string;
  status:"queued"|"optimizing"|"uploading"|"done"|"error";
  message?:string;
};

async function optimizeImage(file:File){
  if(file.size<=SERVER_LIMIT)return file;

  try{
    const bitmap=await createImageBitmap(file);
    const plans=[
      {maxSide:2200,quality:.84},
      {maxSide:1900,quality:.78},
      {maxSide:1700,quality:.72},
      {maxSide:1500,quality:.66}
    ];

    let best:File=file;

    for(const plan of plans){
      const scale=Math.min(1,plan.maxSide/Math.max(bitmap.width,bitmap.height));
      const width=Math.max(1,Math.round(bitmap.width*scale));
      const height=Math.max(1,Math.round(bitmap.height*scale));
      const canvas=document.createElement("canvas");
      canvas.width=width;
      canvas.height=height;

      const ctx=canvas.getContext("2d");
      if(!ctx)continue;

      ctx.drawImage(bitmap,0,0,width,height);

      const blob=await new Promise<Blob|null>(
        resolve=>canvas.toBlob(resolve,"image/webp",plan.quality)
      );
      if(!blob)continue;

      const candidate=new File(
        [blob],
        file.name.replace(/\.[^.]+$/,"")+".webp",
        {type:"image/webp"}
      );

      if(candidate.size<best.size)best=candidate;
      if(candidate.size<=SERVER_LIMIT){
        bitmap.close();
        return candidate;
      }
    }

    bitmap.close();
    return best;
  }catch{
    return file;
  }
}

async function uploadViaServer(file:File,alt:string){
  const form=new FormData();
  form.append("file",file);
  form.append("alt",alt);
  const response=await fetch("/api/media/upload",{method:"POST",body:form});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"Falha no upload protegido.");
  return data;
}

async function uploadDirect(file:File,alt:string){
  const ext=file.name.split(".").pop()||"";
  const auth=await fetch("/api/media/upload",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({mimeType:file.type,size:file.size,extension:ext})
  });
  const data=await auth.json().catch(()=>({}));
  if(!auth.ok)throw new Error(data.error||"Falha ao autorizar upload.");

  const put=await fetch(data.uploadUrl,{
    method:"PUT",
    headers:{"content-type":file.type},
    body:file
  });
  if(!put.ok)throw new Error("Falha no envio direto ao S3.");

  const save=await fetch("/api/media/complete",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({key:data.key,alt})
  });
  const saved=await save.json().catch(()=>({}));
  if(!save.ok)throw new Error(saved.error||"Falha ao registrar mídia.");
  return saved;
}

function fallbackAlt(file:File){
  return file.name
    .replace(/\.[^.]+$/,"")
    .replace(/[-_]+/g," ")
    .replace(/\s+/g," ")
    .trim()
    .slice(0,300);
}

export default function S3Upload(){
  const fileInput=useRef<HTMLInputElement>(null);
  const altInput=useRef<HTMLInputElement>(null);
  const [items,setItems]=useState<UploadState[]>([]);
  const [busy,setBusy]=useState(false);

  function patch(index:number,patch:Partial<UploadState>){
    setItems(current=>current.map((item,i)=>i===index?{...item,...patch}:item));
  }

  async function upload(){
    const originals=Array.from(fileInput.current?.files||[]).slice(0,MAX_FILES);
    if(!originals.length||busy)return;

    setBusy(true);
    setItems(originals.map(file=>({name:file.name,status:"queued"})));

    let success=0;
    const sharedAlt=altInput.current?.value.trim()||"";

    for(let index=0;index<originals.length;index++){
      const original=originals[index];
      try{
        patch(index,{status:"optimizing",message:"Otimizando…"});

        const file=await optimizeImage(original);
        const alt=sharedAlt||fallbackAlt(original);

        patch(index,{status:"uploading",message:file.size<=SERVER_LIMIT?"Upload protegido…":"Upload direto ao S3…"});

        if(file.size<=SERVER_LIMIT){
          await uploadViaServer(file,alt);
        }else{
          try{
            await uploadDirect(file,alt);
          }catch(error){
            if(error instanceof TypeError||String(error).includes("Failed to fetch")){
              throw new Error("Envio direto bloqueado pelo navegador. Reduza a imagem ou revise o CORS do bucket.");
            }
            throw error;
          }
        }

        success++;
        patch(index,{status:"done",message:"Concluído"});
      }catch(error){
        console.error("MEDIA_UPLOAD_CLIENT_FAILED",original.name,error);
        patch(index,{
          status:"error",
          message:error instanceof Error?error.message:"Falha no upload."
        });
      }
    }

    setBusy(false);

    if(success===originals.length){
      window.setTimeout(()=>location.reload(),650);
    }
  }

  const completed=items.filter(item=>item.status==="done").length;
  const failed=items.filter(item=>item.status==="error").length;

  return <section className="mediaUploadCenter">
    <div className="adminPageNote">
      Selecione até {MAX_FILES} imagens. JPEG, PNG e WebP. Fotos grandes são otimizadas automaticamente antes do envio.
    </div>

    <div className="adminFormGrid" style={{marginTop:14}}>
      <label className="span2">Arquivos
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
        />
      </label>
      <label className="span2">Texto alternativo compartilhado
        <input
          ref={altInput}
          placeholder="Opcional. Se vazio, cada arquivo usa o nome da imagem."
          disabled={busy}
        />
      </label>
      <button className="span2" type="button" onClick={upload} disabled={busy}>
        {busy?"Enviando lote…":"Enviar imagens"}
      </button>
    </div>

    {items.length>0&&<div className="mediaUploadQueue" aria-live="polite">
      <div className="mediaUploadSummary">
        <b>{completed}/{items.length} concluída(s)</b>
        {failed>0&&<span>{failed} falha(s)</span>}
      </div>
      {items.map((item,index)=><div className={"mediaUploadRow is-"+item.status} key={item.name+index}>
        <span>{item.name}</span>
        <b>{item.message||item.status}</b>
      </div>)}
    </div>}
  </section>;
}
