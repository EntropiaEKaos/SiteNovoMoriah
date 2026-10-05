import {NextRequest,NextResponse} from "next/server";
import {isMenuAutomationAuthorized} from "../../../../../lib/menu-automation-auth";
import {prisma} from "../../../../../lib/prisma";
export async function GET(req:NextRequest){
  if(!isMenuAutomationAuthorized(req.headers.get("authorization")))return NextResponse.json({error:"unauthorized"},{status:401});
  const products=await prisma.restaurantProduct.findMany({include:{category:true},orderBy:[{sortOrder:"asc"},{name:"asc"}]});
  return NextResponse.json({products:products.map(p=>({id:p.id,name:p.name,description:p.description,category:p.category.name,imageUrl:p.imageUrl,hasImage:Boolean(p.imageUrl)}))});
}
