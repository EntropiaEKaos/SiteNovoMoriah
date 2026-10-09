/** Pure reservation preview validation. Never authorizes inventory writes. */
export type SmoobuReservationPreview={externalId:number;apartmentId:number|null;arrival:string|null;departure:string|null;status:string};
export type SmoobuReservationDiagnostic={reservation:SmoobuReservationPreview;issues:string[];mappedAccommodationId:string|null};
export function diagnoseSmoobuReservations(rows:ReadonlyArray<SmoobuReservationPreview>,mapping:ReadonlyArray<{smoobuApartmentId:number;accommodationId:string}>):SmoobuReservationDiagnostic[]{
 const seen=new Set<number>();
 const ids=new Map(mapping.map(x=>[x.smoobuApartmentId,x.accommodationId]));
 return rows.map(reservation=>{
  const issues:string[]=[];
  if(!Number.isSafeInteger(reservation.externalId)||reservation.externalId<=0)issues.push("ID de reserva inválido");
  if(seen.has(reservation.externalId))issues.push("ID de reserva duplicado na resposta");
  seen.add(reservation.externalId);
  const accommodationId=reservation.apartmentId===null?null:ids.get(reservation.apartmentId)||null;
  if(!accommodationId)issues.push("Unidade ainda não vinculada ao PMS");
  if(!reservation.arrival||!reservation.departure||!/^\d{4}-\d{2}-\d{2}$/.test(reservation.arrival)||!/^\d{4}-\d{2}-\d{2}$/.test(reservation.departure)||!Number.isFinite(Date.parse(reservation.arrival+"T00:00:00Z"))||!Number.isFinite(Date.parse(reservation.departure+"T00:00:00Z"))||reservation.arrival>=reservation.departure)issues.push("Datas de hospedagem inválidas");
  return {reservation,issues,mappedAccommodationId:accommodationId};
 });
}
