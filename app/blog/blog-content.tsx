import type {ReactNode} from "react";

function renderInline(text:string,keyPrefix:string){
  const parts=text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part,index)=>{
    if(part.startsWith("**")&&part.endsWith("**")){
      return <strong key={keyPrefix+"-"+index}>{part.slice(2,-2)}</strong>;
    }
    return <span key={keyPrefix+"-"+index}>{part}</span>;
  });
}

export default function BlogContent({content}:{content:string}){
  const lines=content.replace(/\r/g,"").split("\n");
  const nodes:ReactNode[]=[];
  let list:string[]=[];

  function flushList(){
    if(!list.length)return;
    const items=list;
    list=[];
    nodes.push(<ul key={"list-"+nodes.length}>{items.map((item,index)=><li key={index}>{renderInline(item,"li-"+nodes.length+"-"+index)}</li>)}</ul>);
  }

  lines.forEach((raw,index)=>{
    const line=raw.trim();
    if(!line){
      flushList();
      return;
    }

    if(line.startsWith("- ")){
      list.push(line.slice(2));
      return;
    }

    flushList();

    const image=line.match(/^!\[([^\]]*)\]\((https:\/\/[^)]+|\/api\/media\/[^)]+)\)$/i);
    if(image){
      nodes.push(<figure className="blogArticleInlineImage" key={"image-"+index}><img src={image[2]} alt={image[1]||"Imagem da publicação"}/>{image[1]&&<figcaption>{image[1]}</figcaption>}</figure>);
    }else if(line==="---"){
      nodes.push(<hr key={"hr-"+index}/>);
    }else if(line.startsWith("### ")){
      nodes.push(<h3 key={"h3-"+index}>{renderInline(line.slice(4),"h3-"+index)}</h3>);
    }else if(line.startsWith("## ")){
      nodes.push(<h2 key={"h2-"+index}>{renderInline(line.slice(3),"h2-"+index)}</h2>);
    }else if(line.startsWith("# ")){
      nodes.push(<h2 key={"h2a-"+index}>{renderInline(line.slice(2),"h2a-"+index)}</h2>);
    }else if(line.startsWith("> ")){
      nodes.push(<blockquote key={"quote-"+index}>{renderInline(line.slice(2),"quote-"+index)}</blockquote>);
    }else{
      nodes.push(<p key={"p-"+index}>{renderInline(line,"p-"+index)}</p>);
    }
  });

  flushList();
  return <div className="blogArticleContentV6">{nodes}</div>;
}
