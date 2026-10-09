/** Pure validation used before any external inventory reconciliation. */
export function validateChannelSnapshot(blocks:ReadonlyArray<{externalUid:string;startsAt:Date;endsAt:Date}>):string[]{
 const seen=new Set<string>();
 for(const block of blocks){
  const uid=block.externalUid?.trim();
  if(!uid||uid!==block.externalUid)throw new Error("Invalid external reservation UID");
  if(seen.has(uid))throw new Error("Duplicate external reservation UID in feed");
  if(!(block.startsAt instanceof Date)||!(block.endsAt instanceof Date)||!Number.isFinite(block.startsAt.getTime())||!Number.isFinite(block.endsAt.getTime())||block.startsAt>=block.endsAt)throw new Error("Invalid external reservation date range");
  seen.add(uid);
 }
 return [...seen];
}
