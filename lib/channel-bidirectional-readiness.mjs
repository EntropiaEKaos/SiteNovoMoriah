/** Capability-based certification. Import/export iCal is not a transactional two-way API. */
export function assessBidirectionalReadiness(input) {
 const {provider,importMode,exportMode,canReadReservations=false,canWriteAvailability=false,canWriteRates=false,canReadChanges=false,webhookVerified=false,mappingVerified=false,idempotencyVerified=false,cancellationVerified=false,conflictProtectionVerified=false,lastSuccessfulSyncAt=null}=input;
 const checks=[
  {id:"mapping",passed:mappingVerified,reason:"Quartos externos associados às acomodações corretas"},
  {id:"read",passed:canReadReservations,reason:"Reservas externas podem ser consultadas"},
  {id:"write_availability",passed:canWriteAvailability,reason:"Disponibilidade pode ser atualizada no canal"},
  {id:"write_rates",passed:canWriteRates,reason:"Tarifas podem ser atualizadas no canal"},
  {id:"changes",passed:canReadChanges,reason:"Alterações de reservas podem ser reconciliadas"},
  {id:"webhook",passed:webhookVerified,reason:"Notificações de alterações autenticadas e testadas"},
  {id:"idempotency",passed:idempotencyVerified,reason:"Eventos repetidos não duplicam reservas"},
  {id:"cancellations",passed:cancellationVerified,reason:"Cancelamentos não liberam inventário indevidamente"},
  {id:"conflicts",passed:conflictProtectionVerified,reason:"Concorrência e overbooking protegidos"}
 ];
 const apiTransport=importMode==="API"&&exportMode==="API";
 const transactional=apiTransport&&checks.every(x=>x.passed);
 return {provider,importMode,exportMode,status:transactional?"CERTIFIED":"NOT_CERTIFIED",checks:[{id:"api_transport",passed:apiTransport,reason:"Leitura e escrita transacionais usam API, não feeds iCal"},...checks],lastSuccessfulSyncAt,notes:importMode==="ICAL"||exportMode==="ICAL"?"iCal pode sincronizar calendários com atraso; não comprova API bidirecional em tempo real.":null};
}
export function assertCertifiedForOutboundWrite(report){
 if(report.status!=="CERTIFIED")throw new Error("Escrita externa bloqueada: integração bidirecional não certificada.");
}
