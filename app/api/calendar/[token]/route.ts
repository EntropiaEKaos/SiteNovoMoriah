import {NextRequest,NextResponse} from "next/server";
import {prisma} from "../../../../lib/prisma";

export const dynamic="force-dynamic";

function esc(value:string){
  return value.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n");
}
function stamp(date:Date){
  return date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
}

export async function GET(_req:NextRequest,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const integration=await prisma.channelIntegration.findUnique({
    where:{exportToken:token},
    select:{id:true,active:true,accommodationId:true}
  });
  if(!integration?.active||!integration.accommodationId)return new NextResponse("Not found",{status:404});

  const [bookings,manual]=await Promise.all([
    prisma.bookingLead.findMany({
      where:{
        accommodationId:integration.accommodationId,
        status:{in:["CONFIRMED","CHECKED_IN"]},
        checkIn:{not:null},
        checkOut:{not:null}
      },
      select:{id:true,checkIn:true,checkOut:true}
    }),
    prisma.manualInventoryBlock.findMany({
      where:{accommodationId:integration.accommodationId},
      select:{id:true,startsAt:true,endsAt:true,reason:true}
    })
  ]);

  const events=[
    ...bookings.map(row=>({
      uid:row.id+"@moriah",
      start:row.checkIn!,
      end:row.checkOut!,
      summary:"Moriah - indisponível"
    })),
    ...manual.map(row=>({
      uid:"manual-"+row.id+"@moriah",
      start:row.startsAt,
      end:row.endsAt,
      summary:"Moriah - "+row.reason
    }))
  ];

  const lines=[
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pousada Moriah//Reservas//PT",
    "CALSCALE:GREGORIAN",
    ...events.flatMap(event=>[
      "BEGIN:VEVENT",
      "UID:"+esc(event.uid),
      "DTSTAMP:"+stamp(new Date()),
      "DTSTART:"+stamp(event.start),
      "DTEND:"+stamp(event.end),
      "SUMMARY:"+esc(event.summary),
      "END:VEVENT"
    ]),
    "END:VCALENDAR"
  ];

  return new NextResponse(lines.join("\r\n"),{
    headers:{
      "content-type":"text/calendar; charset=utf-8",
      "cache-control":"no-store"
    }
  });
}
