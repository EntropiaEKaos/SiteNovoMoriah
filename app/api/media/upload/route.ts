import {NextRequest,NextResponse} from "next/server";
import {isAdmin} from "../../../../lib/admin-auth";
import {prisma} from "../../../../lib/prisma";
import {
  createMediaUpload,
  SERVER_FALLBACK_MAX_BYTES,
  uploadMediaBuffer
} from "../../../../lib/media-storage";

export const runtime="nodejs";

export async function POST(req:NextRequest){
  if(!(await isAdmin()))return NextResponse.json({error:"unauthorized"},{status:401});

  try{
    const contentType=req.headers.get("content-type")||"";

    if(contentType.includes("multipart/form-data")){
      const form=await req.formData();
      const file=form.get("file");
      const alt=String(form.get("alt")||"").trim().slice(0,300)||null;

      if(!(file instanceof File))return NextResponse.json({error:"Arquivo obrigatório."},{status:400});
      if(file.size>SERVER_FALLBACK_MAX_BYTES){
        return NextResponse.json({
          error:"Arquivo muito grande para o upload protegido pelo servidor."
        },{status:413});
      }

      const extension=file.name.split(".").pop()||"";
      const bytes=new Uint8Array(await file.arrayBuffer());
      const uploaded=await uploadMediaBuffer({
        bytes,
        mimeType:file.type,
        size:file.size,
        extension
      });

      const row=await prisma.media.create({
        data:{
          url:uploaded.publicUrl,
          alt,
          storageKey:uploaded.key,
          mimeType:file.type,
          sizeBytes:file.size,
          provider:"S3"
        }
      });

      return NextResponse.json({
        id:row.id,
        key:uploaded.key,
        publicUrl:uploaded.publicUrl,
        mode:"server"
      });
    }

    const body=await req.json();
    const result=await createMediaUpload({
      mimeType:String(body.mimeType||""),
      size:Number(body.size||0),
      extension:String(body.extension||"")
    });
    return NextResponse.json({...result,mode:"direct"});
  }catch(error){
    console.error("MEDIA_UPLOAD_FAILED",error);
    return NextResponse.json({
      error:error instanceof Error?error.message:"upload error"
    },{status:400});
  }
}
