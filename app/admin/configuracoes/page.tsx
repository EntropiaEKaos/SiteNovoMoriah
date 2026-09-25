import {prisma} from "../../../lib/prisma";
import MediaPicker from "../components/media-picker";
import {saveSettings} from "../actions";

export const dynamic="force-dynamic";

const DEFAULT_BRANDING={
  logoUrl:"",
  logoLightUrl:"",
  faviconUrl:"",
  defaultBackgroundImageUrl:"",
  primaryColor:"#0b607a",
  secondaryColor:"#073b4c",
  accentColor:"#ffc845",
  backgroundColor:"#f4f7f8",
  textColor:"#1b252b",
  buttonColor:"#0b607a",
  whatsappFloatingEnabled:true,
  whatsappFloatingMessage:"Olá! Vim pelo site da Moriah e gostaria de atendimento.",
  whatsappFloatingLabel:"Fale no WhatsApp",
  whatsappFloatingPosition:"LEFT"
};

export default async function Page(){
  const [baseSettings,media]=await Promise.all([
    prisma.siteSettings.findUnique({
      where:{id:"main"},
      select:{id:true,siteName:true,tagline:true,whatsapp:true,instagram:true,address:true}
    }),
    prisma.media.findMany({
      orderBy:[{sortOrder:"asc"},{createdAt:"desc"}],
      select:{id:true,url:true,alt:true},
      take:250
    })
  ]);

  let branding={...DEFAULT_BRANDING};
  let brandingSchemaReady=true;

  try{
    const row=await prisma.siteSettings.findUnique({
      where:{id:"main"},
      select:{
        logoUrl:true,
        logoLightUrl:true,
        faviconUrl:true,
        defaultBackgroundImageUrl:true,
        primaryColor:true,
        secondaryColor:true,
        accentColor:true,
        backgroundColor:true,
        textColor:true,
        buttonColor:true,
        whatsappFloatingEnabled:true,
        whatsappFloatingMessage:true,
        whatsappFloatingLabel:true,
        whatsappFloatingPosition:true
      }
    });
    if(row){
      branding={
        logoUrl:row.logoUrl||"",
        logoLightUrl:row.logoLightUrl||"",
        faviconUrl:row.faviconUrl||"",
        defaultBackgroundImageUrl:row.defaultBackgroundImageUrl||"",
        primaryColor:row.primaryColor||DEFAULT_BRANDING.primaryColor,
        secondaryColor:row.secondaryColor||DEFAULT_BRANDING.secondaryColor,
        accentColor:row.accentColor||DEFAULT_BRANDING.accentColor,
        backgroundColor:row.backgroundColor||DEFAULT_BRANDING.backgroundColor,
        textColor:row.textColor||DEFAULT_BRANDING.textColor,
        buttonColor:row.buttonColor||DEFAULT_BRANDING.buttonColor,
        whatsappFloatingEnabled:row.whatsappFloatingEnabled,
        whatsappFloatingMessage:row.whatsappFloatingMessage||DEFAULT_BRANDING.whatsappFloatingMessage,
        whatsappFloatingLabel:row.whatsappFloatingLabel||DEFAULT_BRANDING.whatsappFloatingLabel,
        whatsappFloatingPosition:row.whatsappFloatingPosition==="RIGHT"?"RIGHT":"LEFT"
      };
    }
  }catch(error){
    brandingSchemaReady=false;
    console.error("SITE_BRANDING_SCHEMA_PENDING",error);
  }

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / IDENTIDADE VISUAL</small>
        <h1>Configurações</h1>
        <p>Controle dados institucionais, logos, paleta global e imagem padrão do site sem editar código.</p>
      </div>
      <div className="adminPageHeroActions">
        <a className="adminSecondaryAction" href="/">Ver site ↗</a>
        <a className="adminSecondaryAction" href="/admin/galeria">Galeria / S3 →</a>
      </div>
    </section>

    {!brandingSchemaReady&&<section className="adminPageNote" style={{marginBottom:20}}>
      O Preview ainda não recebeu a migration de Identidade Visual. A tela continua acessível, mas os campos de branding só poderão ser salvos depois da migration do Preview.
    </section>}

    <form action={saveSettings} className="adminStack" data-feedback-success="Configurações salvas com sucesso.">
      <section className="adminTwoCol">
        <article className="adminSectionCard">
          <h2>Identidade pública</h2>
          <p>Nome, slogan e canais usados no site e no contexto do assistente.</p>
          <div className="adminFormGrid">
            <label className="span2">Nome do site
              <input name="siteName" defaultValue={baseSettings?.siteName||"Pousada Moriah"}/>
            </label>
            <label className="span2">Slogan
              <input name="tagline" defaultValue={baseSettings?.tagline||"Seu lugar perto de tudo. Do seu jeito."}/>
            </label>
            <label>WhatsApp
              <input name="whatsapp" defaultValue={baseSettings?.whatsapp||""} placeholder="5513999999999"/>
            </label>
            <label>Instagram
              <input name="instagram" defaultValue={baseSettings?.instagram||""} placeholder="@pousadamoriah"/>
            </label>
            <label className="span2">Endereço
              <input name="address" defaultValue={baseSettings?.address||""}/>
            </label>
          </div>
        </article>

        <article className="adminSectionCard">
          <h2>WhatsApp flutuante</h2>
          <p>Configure o atalho de atendimento que acompanha o visitante nas páginas públicas.</p>
          <div className="adminFormGrid">
            <label className="span2" style={{display:"flex",alignItems:"center",gap:10}}>
              <span><input name="whatsappFloatingEnabled" type="checkbox" defaultChecked={branding.whatsappFloatingEnabled}/> Exibir botão flutuante</span>
            </label>
            <label className="span2">Texto do botão
              <input name="whatsappFloatingLabel" defaultValue={branding.whatsappFloatingLabel} maxLength={40} placeholder="Fale no WhatsApp"/>
            </label>
            <label className="span2">Mensagem automática
              <textarea name="whatsappFloatingMessage" rows={3} maxLength={500} defaultValue={branding.whatsappFloatingMessage}/>
            </label>
            <label className="span2">Posição
              <select name="whatsappFloatingPosition" defaultValue={branding.whatsappFloatingPosition}>
                <option value="LEFT">Esquerda</option>
                <option value="RIGHT">Direita</option>
              </select>
            </label>
          </div>
          <p className="adminHelp">O número usado é o WhatsApp configurado em Identidade pública. O botão fica oculto dentro do painel administrativo.</p>
        </article>

        <article className="adminSectionCard">
          <h2>Logos & ícone</h2>
          <p>Escolha imagens já enviadas à Galeria/S3.</p>
          <div className="adminStack">
            <MediaPicker
              name="logoUrl"
              media={media}
              defaultValue={branding.logoUrl}
              label="Logo principal — cabeçalho"
              help="Esta é a marca exibida no topo do site, ao lado do menu."
              recommended="PNG/SVG horizontal • fundo transparente"
            />
            <MediaPicker
              name="logoLightUrl"
              media={media}
              defaultValue={branding.logoLightUrl}
              label="Logo clara — rodapé e fundos escuros"
              help="Use uma versão branca/clara da marca para áreas escuras."
              recommended="PNG/SVG claro • fundo transparente"
            />
            <MediaPicker
              name="faviconUrl"
              media={media}
              defaultValue={branding.faviconUrl}
              label="Favicon — ícone da aba"
              help="Ícone pequeno que aparece na aba do navegador e nos favoritos."
              recommended="Quadrado • 32×32, 64×64 ou 512×512"
            />
          </div>
          <p className="adminHelp">Logo principal: cabeçalho. Logo clara: rodapé/fundos escuros. Favicon: ícone da aba do navegador.</p>
        </article>
      </section>

      <section className="adminTwoCol">
        <article className="adminSectionCard">
          <h2>Paleta global</h2>
          <p>Essas cores alimentam automaticamente cabeçalho, botões, destaques, fundos e tipografia do Visual 6.</p>
          <div className="adminFormGrid cols3">
            <label>Primária
              <input name="primaryColor" type="color" defaultValue={branding.primaryColor}/>
            </label>
            <label>Secundária
              <input name="secondaryColor" type="color" defaultValue={branding.secondaryColor}/>
            </label>
            <label>Destaque
              <input name="accentColor" type="color" defaultValue={branding.accentColor}/>
            </label>
            <label>Fundo
              <input name="backgroundColor" type="color" defaultValue={branding.backgroundColor}/>
            </label>
            <label>Texto
              <input name="textColor" type="color" defaultValue={branding.textColor}/>
            </label>
            <label>Botões
              <input name="buttonColor" type="color" defaultValue={branding.buttonColor}/>
            </label>
          </div>

          <div className="brandPreviewCard" style={{
            background:branding.backgroundColor,
            color:branding.textColor,
            borderColor:branding.primaryColor
          }}>
            <small style={{color:branding.primaryColor}}>PRÉVIA DA IDENTIDADE</small>
            <h3>{baseSettings?.siteName||"Pousada Moriah"}</h3>
            <p>{baseSettings?.tagline||"Seu lugar perto de tudo. Do seu jeito."}</p>
            <span style={{background:branding.buttonColor}}>Botão de reserva</span>
          </div>
        </article>

        <article className="adminSectionCard">
          <h2>Imagem de fundo padrão</h2>
          <p>Usada como imagem de abertura quando o Hero não tiver uma imagem específica. Cada seção ainda pode ter seu próprio fundo no Site Studio.</p>
          <MediaPicker
            name="defaultBackgroundImageUrl"
            media={media}
            defaultValue={branding.defaultBackgroundImageUrl}
            label="Imagem de fundo padrão do Hero"
            help="É usada na abertura da Home quando a seção Hero não tiver uma imagem própria."
            recommended="Horizontal • 1920×1080 ou maior"
          />
          <div className="adminStatusLine"><span>Fundo por seção</span><b>Site Studio</b></div>
          <div className="adminStatusLine"><span>Paleta global</span><b>Identidade</b></div>
          <div className="adminStatusLine"><span>Logo / favicon</span><b>Identidade</b></div>
        </article>
      </section>

      <button className="adminPrimaryAction" disabled={!brandingSchemaReady} style={{border:0,padding:"15px 22px"}}>
        Salvar identidade visual
      </button>
    </form>
  </main>;
}
