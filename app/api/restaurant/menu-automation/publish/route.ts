import {NextRequest,NextResponse} from "next/server";
import {isMenuAutomationAuthorized} from "../../../../../lib/menu-automation-auth";
import {prisma} from "../../../../../lib/prisma";
import {mediaPublicUrl,verifyMediaObject} from "../../../../../lib/media-storage";
export async function POST(req:NextRequest){
  if(!isMenuAutomationAuthorized(req.headers.get("authorization")))return NextResponse.json({error:"unauthorized"},{status:401});
  try{
    const body=await req.json();
    const candidateId=String(body.candidateId||"").trim();
    if(!candidateId)return NextResponse.json({error:"candidateId obrigatório"},{status:400});
    const candidate=await prisma.restaurantProductImageCandidate.findUnique({where:{id:candidateId}});
    if(!candidate||candidate.status!=="READY"||!candidate.storageKey)return NextResponse.json({error:"candidato READY não encontrado"},{status:409});
    await verifyMediaObject(candidate.storageKey);
    const imageUrl=mediaPublicUrl(candidate.storageKey);
    await prisma.$transaction([
      prisma.restaurantProduct.update({where:{id:candidate.productId},data:{imageUrl}}),
      prisma.restaurantProductImageCandidate.update({where:{id:candidate.id},data:{status:"APPROVED",imageUrl,approvedAt:new Date()}}),
      prisma.restaurantProductImageCandidate.updateMany({where:{productId:candidate.productId,id:{not:candidate.id},status:{in:["DRAFT","READY"]}},data:{status:"REJECTED",rejectedAt:new Date()}}),
      prisma.adminAuditLog.create({data:{action:"RESTAURANT_IMAGE_AUTOMATION_PUBLISH",targetType:"RestaurantProduct",targetId:candidate.productId,details:{candidateId}}})
    ]);
    return NextResponse.json({ok:true,productId:candidate.productId,candidateId,imageUrl});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"publish error"},{status:400});}
}
