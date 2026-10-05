import {NextRequest,NextResponse} from "next/server";
import {isMenuAutomationAuthorized} from "../../../../../lib/menu-automation-auth";
import {prisma} from "../../../../../lib/prisma";
import {uploadMediaBuffer} from "../../../../../lib/media-storage";

export const runtime="nodejs";

export async function POST(req:NextRequest){
  if(!isMenuAutomationAuthorized(req.headers.get("authorization")))return NextResponse.json({error:"unauthorized"},{status:401});
  try{
    const form=await req.formData();
    const productId=String(form.get("productId")||"").trim();
    const file=form.get("file");
    if(!productId)return NextResponse.json({error:"productId obrigatório"},{status:400});
    if(!(file instanceof File)||file.size<=0)return NextResponse.json({error:"arquivo obrigatório"},{status:400});
    if(file.size>3_500_000)return NextResponse.json({error:"imagem acima de 3,5 MB"},{status:413});
    const allowed:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
    const extension=allowed[file.type];
    if(!extension)return NextResponse.json({error:"formato inválido"},{status:415});
    const product=await prisma.restaurantProduct.findUnique({where:{id:productId},select:{id:true,name:true}});
    if(!product)return NextResponse.json({error:"produto não encontrado"},{status:404});
    const bytes=new Uint8Array(await file.arrayBuffer());
    const media=await uploadMediaBuffer({bytes,mimeType:file.type,size:bytes.length,extension});
    const [,candidate]=await prisma.$transaction([
      prisma.media.create({data:{url:media.publicUrl,alt:product.name,label:product.name,folder:"moriah-food",storageKey:media.key,mimeType:file.type,sizeBytes:bytes.length,provider:"S3"}}),
      prisma.restaurantProductImageCandidate.create({data:{productId:product.id,prompt:"Automation Import",provider:"automation-import",status:"READY",storageKey:media.key,imageUrl:media.publicUrl}})
    ]);
    await prisma.adminAuditLog.create({data:{action:"RESTAURANT_IMAGE_AUTOMATION_IMPORT",targetType:"RestaurantProduct",targetId:product.id,details:{candidateId:candidate.id,storageKey:media.key}}});
    return NextResponse.json({ok:true,productId:product.id,candidateId:candidate.id,status:"READY"});
  }catch(error){
    console.error("MENU_AUTOMATION_IMPORT_FAILED",error);
    return NextResponse.json({error:error instanceof Error?error.message:"upload error"},{status:400});
  }
}
