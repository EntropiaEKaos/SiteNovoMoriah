import {NextRequest,NextResponse} from "next/server";
import {prisma} from "../../../lib/prisma";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const id=req.nextUrl.searchParams.get("accommodationId")||"";
  if(!id)return NextResponse.json({error:"accommodationId obrigatório"},{status:400});

  const room=await prisma.accommodation.findFirst({
    where:{id,active:true},
    select:{id:true}
  });
  if(!room)return NextResponse.json({error:"Hospedagem inválida"},{status:404});

  const from=new Date();
  from.setUTCHours(0,0,0,0);
  const to=new Date(from);
  to.setUTCMonth(to.getUTCMonth()+13);

  const [external,internal,holds,manual]=await Promise.all([
    prisma.channelBlock.findMany({
      where:{integration:{accommodationId:id,active:true},endsAt:{gt:from},startsAt:{lt:to}},
      select:{startsAt:true,endsAt:true}
    }),
    prisma.bookingLead.findMany({
      where:{
        accommodationId:id,
        status:{in:["CONFIRMED","CHECKED_IN"]},
        checkOut:{gt:from},
        checkIn:{lt:to}
      },
      select:{checkIn:true,checkOut:true}
    }),
    prisma.inventoryHold.findMany({
      where:{
        accommodationId:id,
        expiresAt:{gt:new Date()},
        checkOut:{gt:from},
        checkIn:{lt:to}
      },
      select:{checkIn:true,checkOut:true}
    }),
    prisma.manualInventoryBlock.findMany({
      where:{
        accommodationId:id,
        endsAt:{gt:from},
        startsAt:{lt:to}
      },
      select:{startsAt:true,endsAt:true}
    })
  ]);

  return NextResponse.json({
    blocks:[
      ...external.map(x=>({start:x.startsAt.toISOString().slice(0,10),end:x.endsAt.toISOString().slice(0,10),kind:"CHANNEL"})),
      ...internal.filter(x=>x.checkIn&&x.checkOut).map(x=>({start:x.checkIn!.toISOString().slice(0,10),end:x.checkOut!.toISOString().slice(0,10),kind:"BOOKING"})),
      ...holds.map(x=>({start:x.checkIn.toISOString().slice(0,10),end:x.checkOut.toISOString().slice(0,10),kind:"HOLD"})),
      ...manual.map(x=>({start:x.startsAt.toISOString().slice(0,10),end:x.endsAt.toISOString().slice(0,10),kind:"MANUAL"}))
    ]
  },{headers:{"Cache-Control":"private, max-age=15"}});
}
