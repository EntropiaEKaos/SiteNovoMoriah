import MediaPicker from "../components/media-picker";

type PostValue={
  id?:string;
  title?:string;
  slug?:string;
  excerpt?:string|null;
  coverImage?:string|null;
  content?:string;
  published?:boolean;
};

export default function BlogEditor({
  action,
  media,
  post
}:{
  action:(formData:FormData)=>void|Promise<void>;
  media:{id:string;url:string;alt:string|null}[];
  post?:PostValue;
}){
  return <form action={action} className="adminStack">
    {post?.id&&<input type="hidden" name="id" value={post.id}/>}

    <section className="adminSectionCard">
      <h2>Publicação</h2>
      <p>Defina título, URL, resumo e estado editorial.</p>
      <div className="adminFormGrid">
        <label className="span2">Título
          <input name="title" required maxLength={180} defaultValue={post?.title||""} placeholder="Título da publicação"/>
        </label>
        <label>Slug
          <input name="slug" required maxLength={180} defaultValue={post?.slug||""} placeholder="titulo-da-publicacao"/>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <span><input type="checkbox" name="published" defaultChecked={post?.published??false}/> Publicar no Journal</span>
        </label>
        <label className="span2">Resumo
          <textarea name="excerpt" rows={3} maxLength={500} defaultValue={post?.excerpt||""} placeholder="Resumo usado no card e na abertura do artigo."/>
        </label>
      </div>
    </section>

    <section className="adminSectionCard">
      <h2>Imagem de capa</h2>
      <p>Escolha uma imagem da biblioteca de mídia.</p>
      <MediaPicker name="coverImage" media={media} defaultValue={post?.coverImage||""}/>
    </section>

    <section className="adminSectionCard">
      <h2>Conteúdo</h2>
      <p>Escreva o conteúdo completo do artigo. Quebras de linha são preservadas no site.</p>
      <textarea
        name="content"
        required
        rows={22}
        defaultValue={post?.content||""}
        placeholder="Escreva aqui a publicação..."
        style={{width:"100%",padding:16,lineHeight:1.7}}
      />
    </section>

    <button className="adminPrimaryAction" style={{border:0,fontSize:13,padding:"15px 22px"}}>
      {post?.id?"Salvar alterações":"Criar publicação"}
    </button>
  </form>;
}
