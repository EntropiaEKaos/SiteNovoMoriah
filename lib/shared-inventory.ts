export type CapacityInterval={
  start:Date;
  end:Date;
  units:number;
};

export function maxConcurrentUnits(
  intervals:CapacityInterval[],
  windowStart:Date,
  windowEnd:Date
){
  const events:{time:number;delta:number}[]=[];

  for(const interval of intervals){
    const start=Math.max(windowStart.getTime(),interval.start.getTime());
    const end=Math.min(windowEnd.getTime(),interval.end.getTime());
    const units=Math.max(0,Math.floor(interval.units||0));
    if(start>=end||units<=0)continue;
    events.push({time:start,delta:units});
    events.push({time:end,delta:-units});
  }

  events.sort((a,b)=>a.time-b.time||a.delta-b.delta);

  let current=0;
  let peak=0;
  for(const event of events){
    current+=event.delta;
    peak=Math.max(peak,current);
  }
  return peak;
}

export function hasUnitCapacity(
  totalUnits:number,
  requestedUnits:number,
  intervals:CapacityInterval[],
  windowStart:Date,
  windowEnd:Date
){
  const total=Math.max(0,Math.floor(totalUnits||0));
  const requested=Math.max(1,Math.floor(requestedUnits||1));
  if(requested>total)return false;
  return maxConcurrentUnits(intervals,windowStart,windowEnd)+requested<=total;
}
