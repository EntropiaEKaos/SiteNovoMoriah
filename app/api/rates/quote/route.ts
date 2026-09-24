import {NextRequest,NextResponse} from "next/server";
import {prisma} from "../../../../lib/prisma";
import {quoteAccommodation} from "../../../../lib/rate-engine";
import {isAccommodationAvailable} from "../../../../lib/inventory-engine";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const p=req.nextUrl.searchParams;
  const accommodationId=p.get("accommodationId")||"";
  const a=p.get("checkIn");
  const b=p.get("checkOut");
  const guestsRaw=Number(p.get("guests")||1);
  const guests=Number.isInteger(guestsRaw)&&guestsRaw>0?guestsRaw:1;

  if(!accommodationId||!a||!b){
    return NextResponse.json({error:"missing_parameters"},{status:400});
  }

  const checkIn=new Date(a+"T12:00:00Z");
  const checkOut=new Date(b+"T12:00:00Z");

  try{
    const room=await prisma.accommodation.findFirst({
      where:{id:accommodationId,active:true},
      select:{id:true,name:true,sharedRoom:true,bedCount:true,capacity:true}
    });
    if(!room)return NextResponse.json({error:"not_found"},{status:404});

    const [available,quote]=await Promise.all([
      isAccommodationAvailable(accommodationId,checkIn,checkOut,undefined,guests),
      quoteAccommodation(accommodationId,checkIn,checkOut,p.get("coupon"),guests)
    ]);

    return NextResponse.json({room,available,quote});
  }catch(e){
    return NextResponse.json({
      error:e instanceof Error?e.message:"invalid_request"
    },{status:400});
  }
}
