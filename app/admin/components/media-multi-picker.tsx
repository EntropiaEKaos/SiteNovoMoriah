export default function MediaMultiPicker({
  name,
  media,
  defaultValues=[],
  label="GALERIA / MÚLTIPLAS IMAGENS"
}:{
  name:string;
  media:{id:string;url:string;alt:string|null}[];
  defaultValues?:string[];
  label?:string;
}){
  if(media.length===0)return <div className="adminPageNote">
    Nenhuma imagem disponível. Envie imagens pela Galeria antes de montar a galeria do quarto.
  </div>;

  return <fieldset style={{border:"1px solid #ddd7c8",padding:16,margin:0}}>
    <legend style={{padding:"0 8px",fontSize:10,fontWeight:900}}>{label}</legend>
    <div className="adminImageGrid">
      {media.map(item=><label className="adminMediaCard" key={item.id} style={{cursor:"pointer"}}>
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
