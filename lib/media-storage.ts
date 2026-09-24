import "server-only";
import {DeleteObjectCommand,GetObjectCommand,HeadObjectCommand,PutObjectCommand,S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const ALLOWED_MEDIA_TYPES=new Set(["image/jpeg","image/png","image/webp"]);
const ALLOWED_EXTENSIONS=new Set(["jpg","jpeg","png","webp"]);
export const DIRECT_UPLOAD_MAX_BYTES=10*1024*1024;
export const SERVER_FALLBACK_MAX_BYTES=3_500_000;

function cfg(){
  const region=process.env.AWS_REGION;
  const bucket=process.env.AWS_S3_BUCKET;
  if(!region||!bucket)throw new Error("S3 não configurado.");
  return {region,bucket};
}

function client(){
  const {region}=cfg();
  return new S3Client({region});
}

function cleanExtension(extension:string){
  const ext=extension.toLowerCase().replace(/[^a-z0-9]/g,"");
  if(!ALLOWED_EXTENSIONS.has(ext))throw new Error("Extensão inválida.");
  return ext;
}

function validateMediaInput(input:{mimeType:string;size:number;extension:string},maxBytes=DIRECT_UPLOAD_MAX_BYTES){
  if(!ALLOWED_MEDIA_TYPES.has(input.mimeType))throw new Error("Formato não permitido. Use JPEG, PNG ou WebP.");
  if(!Number.isFinite(input.size)||input.size<=0||input.size>maxBytes){
    throw new Error("Imagem acima do tamanho permitido.");
  }
  return cleanExtension(input.extension);
}

function createKey(ext:string){
  return "media/"+new Date().toISOString().slice(0,7).replace("-","/")+"/"+crypto.randomUUID()+"."+ext;
}

export async function createMediaUpload(input:{mimeType:string;size:number;extension:string}){
  const ext=validateMediaInput(input);
  const {bucket}=cfg();
  const key=createKey(ext);
  const command=new PutObjectCommand({
    Bucket:bucket,
    Key:key,
    ContentType:input.mimeType,
    CacheControl:"public,max-age=31536000,immutable"
  });
  const uploadUrl=await getSignedUrl(client(),command,{expiresIn:300});
  return {key,uploadUrl,publicUrl:mediaPublicUrl(key)};
}

export async function uploadMediaBuffer(input:{
  bytes:Uint8Array;
  mimeType:string;
  size:number;
  extension:string;
}){
  const ext=validateMediaInput(input,SERVER_FALLBACK_MAX_BYTES);
  const {bucket}=cfg();
  const key=createKey(ext);
  await client().send(new PutObjectCommand({
    Bucket:bucket,
    Key:key,
    Body:input.bytes,
    ContentType:input.mimeType,
    CacheControl:"public,max-age=31536000,immutable"
  }));
  return {key,publicUrl:mediaPublicUrl(key)};
}

export function validateMediaKey(key:string){
  if(!/^media\/[0-9]{4}\/[0-9]{2}\/[0-9a-f-]+\.(jpg|jpeg|png|webp)$/i.test(key)){
    throw new Error("Chave de mídia inválida.");
  }
  return key;
}

export function mediaPublicUrl(key:string){
  validateMediaKey(key);
  return "/api/media/file?key="+encodeURIComponent(key);
}

export async function readMediaObject(key:string){
  validateMediaKey(key);
  const {bucket}=cfg();
  const out=await client().send(new GetObjectCommand({Bucket:bucket,Key:key}));
  if(!out.Body)throw new Error("Objeto de mídia sem conteúdo.");
  const bytes=await out.Body.transformToByteArray();
  const mimeType=String(out.ContentType||"application/octet-stream");
  if(!ALLOWED_MEDIA_TYPES.has(mimeType))throw new Error("Tipo de mídia inválido.");
  return {
    bytes,
    mimeType,
    etag:String(out.ETag||"").replaceAll('"',""),
    lastModified:out.LastModified||null
  };
}

export async function deleteMediaObject(key:string){
  const {bucket}=cfg();
  await client().send(new DeleteObjectCommand({Bucket:bucket,Key:key}));
}

export async function verifyMediaObject(key:string){
  mediaPublicUrl(key);
  const {bucket}=cfg();
  const out=await client().send(new HeadObjectCommand({Bucket:bucket,Key:key}));
  const type=String(out.ContentType||"");
  const size=Number(out.ContentLength||0);
  if(!ALLOWED_MEDIA_TYPES.has(type)||size<=0||size>DIRECT_UPLOAD_MAX_BYTES){
    throw new Error("Objeto de mídia inválido.");
  }
  return {mimeType:type,sizeBytes:size};
}
