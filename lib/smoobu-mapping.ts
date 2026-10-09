/** Pure safety checks for explicit Smoobu-to-PMS mappings. */
export type SmoobuMapping={smoobuApartmentId:number;accommodationId:string};
export function validateSmoobuMappings(mappings:ReadonlyArray<SmoobuMapping>,validApartmentIds:ReadonlyArray<number>,validAccommodationIds:ReadonlyArray<string>){
 const apartments=new Set(validApartmentIds);
 const accommodations=new Set(validAccommodationIds);
 const usedApartments=new Set<number>();
 const usedAccommodations=new Set<string>();
 for(const mapping of mappings){
  if(!Number.isSafeInteger(mapping.smoobuApartmentId)||!apartments.has(mapping.smoobuApartmentId))throw new Error("Unidade Smoobu inexistente.");
  if(!mapping.accommodationId||!accommodations.has(mapping.accommodationId))throw new Error("Acomodação PMS inexistente.");
  if(usedApartments.has(mapping.smoobuApartmentId))throw new Error("Unidade Smoobu mapeada mais de uma vez.");
  if(usedAccommodations.has(mapping.accommodationId))throw new Error("Acomodação PMS associada a múltiplas unidades Smoobu; revisão manual obrigatória.");
  usedApartments.add(mapping.smoobuApartmentId);
  usedAccommodations.add(mapping.accommodationId);
 }
 return mappings.length;
}
