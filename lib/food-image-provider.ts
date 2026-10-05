import "server-only";

export type GeneratedFoodImage={bytes:Uint8Array;mimeType:"image/png"|"image/jpeg";extension:"png"|"jpg";provider:string};

function geminiKey(){return String(process.env.GEMINI_API_KEY||"").trim();}
export function foodImageProviderStatus(){
  return geminiKey()?{configured:true,provider:"gemini"}:{configured:false,provider:"gemini"};
}

export async function generateFoodImage(prompt:string,negativePrompt?:string|null):Promise<GeneratedFoodImage>{
  const key=geminiKey();
  if(!key)throw new Error("Geração de imagens não configurada. Defina GEMINI_API_KEY no servidor.");
  const fullPrompt=[prompt,negativePrompt?"Avoid: "+negativePrompt:""].filter(Boolean).join("\n\n");
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/interactions",{
    method:"POST",
    headers:{"x-goog-api-key":key,"content-type":"application/json"},
    body:JSON.stringify({
      model:process.env.MORIAH_IMAGE_MODEL||"gemini-3.1-flash-image",
      input:[{type:"text",text:fullPrompt}],
      response_format:{type:"image",mime_type:"image/png",aspect_ratio:"1:1",image_size:"1K"}
    }),
    signal:AbortSignal.timeout(120000)
  });
  if(!response.ok)throw new Error("Falha no provedor de imagens ("+response.status+").");
  const json=await response.json() as {output_image?:{data?:string;mime_type?:string}};
  const data=json.output_image?.data;
  if(!data)throw new Error("O provedor não retornou uma imagem.");
  const bytes=Uint8Array.from(Buffer.from(data,"base64"));
  if(!bytes.length)throw new Error("Imagem gerada vazia.");
  return {bytes,mimeType:"image/png",extension:"png",provider:"gemini"};
}
