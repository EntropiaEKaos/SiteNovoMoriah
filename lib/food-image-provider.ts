import "server-only";

export type GeneratedFoodImage={bytes:Uint8Array;mimeType:"image/png"|"image/jpeg";extension:"png"|"jpg";provider:string};

function providerKey(){return "";}
export function foodImageProviderStatus(){
  return {configured:false,provider:"none"};
}

export async function generateFoodImage(_prompt:string,_negativePrompt?:string|null):Promise<GeneratedFoodImage>{
  throw new Error("Gerador de imagens não configurado.");
}
