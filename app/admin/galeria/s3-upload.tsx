"use client";

import {useRef,useState} from "react";

const SERVER_LIMIT=3_500_000;

async function optimizeImage(file:File){
  if(file.size<=SERVER_LIMIT)return file;
  try{
    const bitmap=await createImageBitmap(file);
    const maxSide=2200;
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*scale));
    const height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement("canvas");
    canvas.width=width;
    canvas.height=height;
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Canvas indisponível.");
    ctx.drawImage(bitmap,0,0,width,height);
    bitmap.close();
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",0.88));
    if(!blob)return file;
    return new File([blob],file.name.replace(/.[^.]+$/,"")+".webp",{type:"image/webp"});
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

export default function S3Upload(){
  const fileInput=useRef<HTMLInputElement>(null);
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);

  async function upload(){
    const original=fileInput.current?.files?.[0];
    if(!original||busy)return;

    const alt=(document.getElementById("s3-alt") as HTMLInputElement)?.value||"";
    setBusy(true);

    try{
      setStatus("Otimizando imagem…");
      const file=await optimizeImage(original);

      if(file.size<=SERVER_LIMIT){
        setStatus("Enviando imagem com segurança…");
        await uploadViaServer(file,alt);
      }else{
        setStatus("Enviando diretamente para o S3…");
        try{
          await uploadDirect(file,alt);
        }catch(error){
          if(error instanceof TypeError||String(error).includes("Failed to fetch")){
            throw new Error("O navegador bloqueou o envio direto ao S3. Reduza a imagem para menos de 3,5 MB ou configure o CORS do bucket.");
          }
          throw error;
        }
      }

      setStatus("Upload concluído.");
      location.reload();
    }catch(error){
      console.error("MEDIA_UPLOAD_CLIENT_FAILED",error);
      setStatus(error instanceof Error?error.message:"Erro no upload.");
    }finally{
      setBusy(false);
    }
  }

  return <section className="adminSectionCard" style={{padding:0,border:0}}>
    <div className="adminPageNote" style={{marginBottom:14}}>
      JPEG, PNG ou WebP. Fotos grandes são otimizadas automaticamente antes do envio.
    </div>
    <div className="adminFormGrid">
      <label className="span2">Arquivo
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp"/>
      </label>
      <label className="span2">Texto alternativo
        <input id="s3-alt" placeholder="Ex.: Quarto casal com janela"/>
      </label>
      <button className="span2" type="button" onClick={upload} disabled={busy}>
        {busy?"Enviando…":"Enviar imagem"}
      </button>
    </div>
    {status&&<p aria-live="polite" style={{marginTop:14,fontWeight:800}}>{status}</p>}
  </section>;
}
