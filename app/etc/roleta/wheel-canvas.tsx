"use client";

import {forwardRef,useEffect,useImperativeHandle,useRef} from "react";
import styles from "./roleta.module.css";

export type WheelSlice={
  id:string;
  name:string;
  color:string;
  textColor:string;
  weight:number;
};

export type WheelTheme={
  primary:string;
  secondary:string;
  accent:string;
  surface:string;
};

export type WheelHandle={
  spinTo:(winnerId:string,slices:WheelSlice[])=>Promise<void>;
};

type PixiModule=typeof import("pixi.js");
const TAU=Math.PI*2;

function cleanHex(value:string,fallback:number){
  return /^#[0-9a-f]{6}$/i.test(value)
    ?Number.parseInt(value.slice(1),16)
    :fallback;
}

const WheelCanvas=forwardRef<WheelHandle,{slices:WheelSlice[];theme:WheelTheme}>(
  ({slices,theme},ref)=>{
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

      const primary=cleanHex(theme.primary,0x0b607a);
      const secondary=cleanHex(theme.secondary,0x073b4c);
      const accent=cleanHex(theme.accent,0xffc845);
      const surface=cleanHex(theme.surface,0xffffff);

      const aura=new PIXI.Graphics();
      aura.circle(280,280,246).fill({color:secondary,alpha:.2});
      aura.circle(280,280,240).stroke({width:2,color:accent,alpha:.5});
      app.stage.addChild(aura);

      const wheel=new PIXI.Container();
      wheel.position.set(280,280);
      wheelRef.current=wheel;
      geometryRef.current=[];

      const total=input.reduce((sum,item)=>sum+Math.max(1,item.weight),0)||1;
      let cursor=-Math.PI/2;
      const radius=220;

      input.forEach((slice,index)=>{
        const span=TAU*(Math.max(1,slice.weight)/total);
        const end=cursor+span;

        const segment=new PIXI.Graphics();
        segment
          .moveTo(0,0)
          .arc(0,0,radius,cursor,end)
          .lineTo(0,0)
          .fill({color:cleanHex(slice.color,index%2?primary:accent)});
        segment
          .moveTo(0,0)
          .arc(0,0,radius,cursor,end)
          .stroke({width:3,color:surface,alpha:.9});
        wheel.addChild(segment);

        const center=cursor+span/2;
        geometryRef.current.push({id:slice.id,center});

        const label=slice.name.length>22?slice.name.slice(0,20)+"…":slice.name;
        const text=new PIXI.Text({
          text:label,
          style:new PIXI.TextStyle({
            fontFamily:"Arial",
            fontSize:Math.max(12,Math.min(19,170/input.length)),
            fontWeight:"800",
            fill:cleanHex(slice.textColor,0x1b252b),
            align:"center",
            wordWrap:true,
            wordWrapWidth:126
          })
        });
        text.anchor.set(.5);
        text.position.set(Math.cos(center)*140,Math.sin(center)*140);
        text.rotation=center+Math.PI/2;
        const normalized=((text.rotation%TAU)+TAU)%TAU;
        if(normalized>Math.PI/2&&normalized<Math.PI*1.5)text.rotation+=Math.PI;
        wheel.addChild(text);

        cursor=end;
      });

      const rim=new PIXI.Graphics();
      rim.circle(0,0,radius+8).stroke({width:14,color:secondary});
      rim.circle(0,0,radius+1).stroke({width:3,color:accent});
      wheel.addChild(rim);

      for(let index=0;index<28;index++){
        const angle=(index/28)*TAU;
        const light=new PIXI.Graphics();
        light
          .circle(Math.cos(angle)*230,Math.sin(angle)*230,4)
          .fill({color:index%2?surface:accent});
        wheel.addChild(light);
      }

      const hub=new PIXI.Graphics();
      hub.circle(0,0,39).fill({color:surface});
      hub.circle(0,0,29).fill({color:secondary});
      hub.circle(0,0,24).stroke({width:2,color:accent});
      wheel.addChild(hub);

      const mark=new PIXI.Text({
        text:"M",
        style:new PIXI.TextStyle({
          fontFamily:"Arial",
          fontSize:22,
          fontWeight:"900",
          fill:accent
        })
      });
      mark.anchor.set(.5);
      wheel.addChild(mark);

      app.stage.addChild(wheel);

      const pointer=new PIXI.Graphics();
      pointer
        .moveTo(0,-226)
        .lineTo(-21,-270)
        .lineTo(21,-270)
        .closePath()
        .fill({color:accent})
        .stroke({width:4,color:secondary});
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
        await app.init({
          width:560,
          height:560,
          backgroundAlpha:0,
          antialias:true,
          resolution:Math.min(window.devicePixelRatio||1,2),
          autoDensity:true
        });

        if(!alive){
          app.destroy(true);
          return;
        }

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
    // initialization intentionally happens only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    useEffect(()=>{
      readyRef.current?.then(()=>draw(slices));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[slices,theme.primary,theme.secondary,theme.accent,theme.surface]);

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

        const target=start+TAU*7+delta;
        const duration=5200;
        const started=performance.now();

        await new Promise<void>(resolve=>{
          const tick=()=>{
            const progress=Math.min(1,(performance.now()-started)/duration);
            const eased=1-Math.pow(1-progress,4);
            wheel.rotation=start+(target-start)*eased;

            if(progress>=1){
              app.ticker.remove(tick);
              resolve();
            }
          };
          app.ticker.add(tick);
        });
      }
    }),[theme.primary,theme.secondary,theme.accent,theme.surface]);

    return <div ref={hostRef} className={styles.wheelHost}/>;
  }
);

WheelCanvas.displayName="WheelCanvas";
export default WheelCanvas;
