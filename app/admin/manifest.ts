import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    name:"Moriah Admin",
    short_name:"Moriah Admin",
    description:"Central administrativa da Pousada Moriah",
    start_url:"/admin",
    scope:"/admin/",
    display:"standalone",
    background_color:"#0b0b0b",
    theme_color:"#0b2631",
    orientation:"any",
    icons:[
      {src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"maskable"}
    ]
  };
}
