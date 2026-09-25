import MediaPicker from "../components/media-picker";
import BlogEditorFields from "./blog-editor-fields";

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
  return <form action={action} className="adminStack blogStudioForm" data-feedback-success="Publicação salva com sucesso.">
    {post?.id&&<input type="hidden" name="id" value={post.id}/>}

    <BlogEditorFields post={post} media={media}/>

    <section className="adminSectionCard">
      <div className="siteStudioSectionHead">
        <div><small>03 / CAPA</small><h2>Imagem principal</h2></div>
        <span className="adminChip">CARD + ARTIGO + SEO</span>
      </div>
      <p>Escolha uma imagem horizontal da Galeria/S3. Ela aparece na listagem e na abertura da publicação.</p>
      <MediaPicker
        name="coverImage"
        media={media}
        defaultValue={post?.coverImage||""}
        label="Capa da publicação"
        help="Usada no card do Journal, no topo do artigo e no compartilhamento visual."
        recommended="Horizontal • 1200×630 ou maior"
      />
    </section>

    <div className="blogStudioSaveBar">
      <div>
        <b>{post?.id?"Atualizar publicação":"Criar publicação"}</b>
        <small>Você pode manter como rascunho e publicar depois.</small>
      </div>
      <button className="adminPrimaryAction" style={{border:0,fontSize:13,padding:"15px 22px"}}>
        {post?.id?"Salvar alterações":"Salvar publicação"}
      </button>
    </div>
  </form>;
}
