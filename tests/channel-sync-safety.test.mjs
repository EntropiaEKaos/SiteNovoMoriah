import assert from "node:assert/strict";
import test from "node:test";
import {validateChannelSnapshot} from "../lib/channel-sync-safety.ts";

const start=new Date("2026-10-31T12:00:00.000Z");
const end=new Date("2026-11-02T12:00:00.000Z");
const block=(externalUid)=>({externalUid,startsAt:start,endsAt:end});

test("one external UID is accepted exactly once",()=>{
 assert.deepEqual(validateChannelSnapshot([block("booking-123")]),["booking-123"]);
});
test("duplicate external UID within one feed fails closed",()=>{
 assert.throws(()=>validateChannelSnapshot([block("booking-123"),block("booking-123")]),/Duplicate/);
});
test("empty snapshot is valid for inspection, never authorization to delete",()=>{
 assert.deepEqual(validateChannelSnapshot([]),[]);
});
test("blank and padded UIDs fail closed",()=>{
 assert.throws(()=>validateChannelSnapshot([block("")]),/Invalid external reservation UID/);
 assert.throws(()=>validateChannelSnapshot([block(" booking-123 ")]),/Invalid external reservation UID/);
});
test("invalid or reversed date ranges fail closed",()=>{
 assert.throws(()=>validateChannelSnapshot([{externalUid:"a",startsAt:end,endsAt:start}]),/Invalid external reservation date range/);
 assert.throws(()=>validateChannelSnapshot([{externalUid:"a",startsAt:new Date("bad"),endsAt:end}]),/Invalid external reservation date range/);
});
test("separate snapshots with the same UID preserve stable identity",()=>{
 assert.deepEqual(validateChannelSnapshot([block("booking-123")]),validateChannelSnapshot([block("booking-123")]));
});
