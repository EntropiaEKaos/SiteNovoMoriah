type MediaItem={id:string;url:string;alt:string|null};

export default function MediaMultiPicker({
  name,
  media,
  defaultValues=[],
  label="GALERIA / MÚLTIPLAS IMAGENS"
}:{
  name:string;
  media:MediaItem[];
  defaultValues?:string[];
  label?:string;
}){
  const known=new Set(media.map(item=>item.url));
  const preserved:MediaItem[]=defaultValues
    .filter(url=>url&&!known.has(url))
    .map((url,index)=>({
      id:"preserved-"+index,
      url,
      alt:"Imagem já vinculada"
    }));
  const choices=[...preserved,...media];

  if(choices.length===0)return <div className="adminPageNote">
    Nenhuma imagem disponível. Envie imagens pela Galeria antes de montar esta galeria.
  </div>;

  return <fieldset className="mediaMultiPicker">
    <legend>{label}</legend>
    {preserved.length>0&&<div className="adminPageNote mediaMultiPickerNotice">
      {preserved.length} imagem(ns) já vinculada(s) não estão entre as mídias mais recentes. Elas foram preservadas abaixo para não desaparecerem ao salvar.
    </div>}
    <div className="adminImageGrid">
      {choices.map(item=><label className="adminMediaCard" key={item.id} style={{cursor:"pointer"}}>
        <img src={item.url} alt={item.alt||""}/>
        <div className="adminMediaCardBody">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <input
              type="checkbox"
              name={name}
              value={item.url}
              defaultChecked={defaultValues.includes(item.url)}
            />
            <b>{item.alt||"Imagem sem descrição"}</b>
          </div>
        </div>
      </label>)}
    </div>
  </fieldset>;
}
