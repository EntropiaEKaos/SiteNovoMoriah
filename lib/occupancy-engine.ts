import {prisma} from "./prisma";
function nights(start:Date,end:Date){return Math.max(1,Math.ceil((end.getTime()-start.getTime())/86400000));}
export async function getOccupancyMetrics(start:Date,end:Date){
 if(!(start<end))throw new Error("Período inválido.");
 const rooms=await prisma.accommodation.findMany({where:{active:true},select:{id:true}});
 if(!rooms.length)return {occupancyPct:0,occupiedRoomNights:0,availableRoomNights:0,rooms:0};
 const totalNights=nights(start,end);const availableRoomNights=rooms.length*totalNights;
 const [bookings,blocks]=await Promise.all([
  prisma.bookingLead.findMany({where:{status:"CONFIRMED",accommodationId:{in:rooms.map(r=>r.id)},checkIn:{lt:end},checkOut:{gt:start}},select:{accommodationId:true,checkIn:true,checkOut:true}}),
  prisma.channelBlock.findMany({where:{startsAt:{lt:end},endsAt:{gt:start},integration:{active:true,accommodationId:{in:rooms.map(r=>r.id)}}},select:{startsAt:true,endsAt:true,integration:{select:{accommodationId:true}}}})
 ]);
 const occupied=new Set<string>();
 const mark=(roomId:string|null,s:Date,e:Date)=>{if(!roomId)return;const from=new Date(Math.max(start.getTime(),s.getTime())),to=new Date(Math.min(end.getTime(),e.getTime()));for(let d=new Date(from);d<to;d.setUTCDate(d.getUTCDate()+1))occupied.add(roomId+":"+d.toISOString().slice(0,10));};
 bookings.forEach(b=>{if(b.checkIn&&b.checkOut)mark(b.accommodationId,b.checkIn,b.checkOut)});blocks.forEach(b=>mark(b.integration.accommodationId,b.startsAt,b.endsAt));
 const occupiedRoomNights=occupied.size;return {occupancyPct:availableRoomNights?Math.round(occupiedRoomNights*100/availableRoomNights):0,occupiedRoomNights,availableRoomNights,rooms:rooms.length};
}
