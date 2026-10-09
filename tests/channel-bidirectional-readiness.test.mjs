import test from "node:test";
import assert from "node:assert/strict";
import {assessBidirectionalReadiness,assertCertifiedForOutboundWrite} from "../lib/channel-bidirectional-readiness.mjs";
const base={provider:"BOOKING",importMode:"ICAL",exportMode:"ICAL",canReadReservations:true,mappingVerified:true};
test("iCal não recebe certificação bidirecional",()=>{
 const report=assessBidirectionalReadiness(base);
 assert.equal(report.status,"NOT_CERTIFIED");
 assert.match(report.notes,/iCal/);
 assert.throws(()=>assertCertifiedForOutboundWrite(report),/bloqueada/);
});
test("leitura e mapeamento não bastam para escrita externa",()=>{
 const report=assessBidirectionalReadiness({...base,canWriteAvailability:true,canWriteRates:true});
 assert.equal(report.status,"NOT_CERTIFIED");
 assert.equal(report.checks.find(x=>x.id==="idempotency").passed,false);
});
test("certificação exige todos os controles explícitos",()=>{
 const report=assessBidirectionalReadiness({...base,importMode:"API",exportMode:"API",canWriteAvailability:true,canWriteRates:true,canReadChanges:true,webhookVerified:true,idempotencyVerified:true,cancellationVerified:true,conflictProtectionVerified:true});
 assert.equal(report.status,"CERTIFIED");
 assert.doesNotThrow(()=>assertCertifiedForOutboundWrite(report));
});
