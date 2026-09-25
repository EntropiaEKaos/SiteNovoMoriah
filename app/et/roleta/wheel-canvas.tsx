"use client";

import {forwardRef,useEffect,useImperativeHandle,useRef} from "react";

export type WheelSlice={
  id:string;
  name:string;
  color:string;
  textColor:string;
  weight:number;
};

export type WheelHandle={
  spinTo:(winnerId:string,slices:WheelSlice[])=>Promise<void>;
};

type PixiModule=typeof import("pixi.js");

const TAU=Math.PI*2;

function cleanHex(value:string,fallback:number){
  return /^#[0-9a-f]{6}$/i.test(value)?Number.parseInt(value.slice(1),16):fallback;
}

const WheelCanvas=forwardRef<WheelHandle,{slices:WheelSlice[]}>(({slices},ref)=>{
  const hostRef=useRef<HTMLDivElement>(null);
  const pixiRef=useRef<PixiModule|null>(null);
  const appRef=useRef<InstanceType<PixiModule["Application"]>|null>(null);
  const wheelRef=useRef<InstanceType<PixiModule["Container"]>|null>(null);
  const geometryRef=useRef<Array<{id:string;center:number}>>([]);
  const readyRef=useRef<Promise<void>|null>(null);

  function draw(input:WheelSlice[]){
    const PIXI=pixiRef.current;
    const app=appRef.current;
    if(!PIXI||!app)return;
    app.stage.removeChildren();

    const wheel=new PIXI.Container();
    wheel.position.set(280,280);
    wheelRef.current=wheel;
    geometryRef.current=[];

    const total=input.reduce((sum,item)=>sum+Math.max(1,item.weight),0)||1;
    let cursor=-Math.PI/2;
    const radius=225;

    input.forEach((slice,index)=>{
      const span=TAU*(Math.max(1,slice.weight)/total);
      const end=cursor+span;
      const g=new PIXI.Graphics();
      g.moveTo(0,0).arc(0,0,radius,cursor,end).lineTo(0,0).fill({color:cleanHex(slice.color,index%2?0x0b607a:0xffc845)});
      g.moveTo(0,0).arc(0,0,radius,cursor,end).stroke({width:3,color:0xffffff,alpha:.9});
      wheel.addChild(g);

      const center=cursor+span/2;
      geometryRef.current.push({id:slice.id,center});
      const label=slice.name.length>20?slice.name.slice(0,18)+"…":slice.name;
      const txt=new PIXI.Text({
        text:label,
        style:new PIXI.TextStyle({
          fontFamily:"Arial",
          fontSize:Math.max(12,Math.min(19,160/input.length)),
          fontWeight:"800",
          fill:cleanHex(slice.textColor,0x1b252b),
          align:"center",
          wordWrap:true,
          wordWrapWidth:125
        })
      });
      txt.anchor.set(.5);
      txt.position.set(Math.cos(center)*142,Math.sin(center)*142);
      txt.rotation=center+Math.PI/2;
      const normalized=((txt.rotation%TAU)+TAU)%TAU;
      if(normalized>Math.PI/2&&normalized<Math.PI*1.5)txt.rotation+=Math.PI;
      wheel.addChild(txt);
      cursor=end;
    });

    const rim=new PIXI.Graphics().circle(0,0,radius+5).stroke({width:10,color:0x073b4c});
    wheel.addChild(rim);
    const hub=new PIXI.Graphics().circle(0,0,34).fill({color:0xffffff}).circle(0,0,24).fill({color:0x073b4c});
    wheel.addChild(hub);
    app.stage.addChild(wheel);

    const pointer=new PIXI.Graphics();
    pointer.moveTo(0,-235).lineTo(-19,-270).lineTo(19,-270).closePath().fill({color:0x073b4c});
    pointer.position.set(280,280);
    app.stage.addChild(pointer);
  }

  useEffect(()=>{
    let alive=true;
    readyRef.current=(async()=>{
      const PIXI=await import("pixi.js");
      if(!alive||!hostRef.current)return;
      pixiRef.current=PIXI;
      const app=new PIXI.Application();
      await app.init({width:560,height:560,backgroundAlpha:0,antialias:true,resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true});
      if(!alive){app.destroy(true);return;}
      appRef.current=app;
      app.canvas.setAttribute("aria-label","Roleta da Sorte Moriah");
      hostRef.current.appendChild(app.canvas);
      draw(slices);
    })();
    return()=>{
      alive=false;
      appRef.current?.destroy(true);
      appRef.current=null;
      wheelRef.current=null;
      pixiRef.current=null;
    };
  // initialization is intentionally one-time; redraws are handled below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    readyRef.current?.then(()=>draw(slices));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[slices]);

  useImperativeHandle(ref,()=>({
    async spinTo(winnerId:string,nextSlices:WheelSlice[]){
      await readyRef.current;
      const app=appRef.current;
      if(!app)throw new Error("Roleta ainda está carregando.");
      draw(nextSlices);
      const wheel=wheelRef.current;
      const geometry=geometryRef.current.find(item=>item.id===winnerId);
      if(!wheel||!geometry)throw new Error("Prêmio não encontrado na roleta.");

      const start=wheel.rotation;
      const currentMod=((start%TAU)+TAU)%TAU;
      const desiredRaw=-Math.PI/2-geometry.center;
      const desiredMod=((desiredRaw%TAU)+TAU)%TAU;
      let delta=desiredMod-currentMod;
      if(delta<=0)delta+=TAU;
      const target=start+TAU*6+delta;
      const duration=4600;
      const started=performance.now();

      await new Promise<void>(resolve=>{
        const tick=()=>{
          const t=Math.min(1,(performance.now()-started)/duration);
          const eased=1-Math.pow(1-t,4);
          wheel.rotation=start+(target-start)*eased;
          if(t>=1){
            app.ticker.remove(tick);
            resolve();
          }
        };
        app.ticker.add(tick);
      });
    }
  }),[]);

  return <div ref={hostRef} style={{width:"100%",maxWidth:560,margin:"0 auto"}}/>;
});

WheelCanvas.displayName="WheelCanvas";
export default WheelCanvas;
