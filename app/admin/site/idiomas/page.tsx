import Link from "next/link";
import {requireAdmin} from "../../../../lib/admin-auth";
import {prisma} from "../../../../lib/prisma";
import {saveSiteTranslation} from "../i18n-actions";

export const dynamic="force-dynamic";

type Locale="en"|"es";
type Entity={
  type:string;
  id:string;
  title:string;
  subtitle?:string;
  translations:unknown;
  fields:Array<{name:string;label:string;long?:boolean;array?:boolean}>;
};

function localeValue(translations:unknown,locale:Locale,field:string){
  if(!translations||typeof translations!=="object"||Array.isArray(translations))return "";
  const group=(translations as Record<string,unknown>)[locale];
  if(!group||typeof group!=="object"||Array.isArray(group))return "";
  const value=(group as Record<string,unknown>)[field];
  return Array.isArray(value)?value.join("\n"):typeof value==="string"?value:"";
}

function TranslationForm({entity,locale}:{entity:Entity;locale:Locale}){
  return <form action={saveSiteTranslation} className="siteLocaleForm" data-feedback-success={locale==="en"?"English saved successfully.":"Español guardado correctamente."}>
    <input type="hidden" name="entityType" value={entity.type}/>
    <input type="hidden" name="entityId" value={entity.id}/>
    <input type="hidden" name="locale" value={locale}/>
    <div className="siteLocaleFormHead">
      <b>{locale==="en"?"EN • English":"ES • Español"}</b>
      <small>Campos vazios usam automaticamente o português.</small>
    </div>
    <div className="adminFormGrid">
      {entity.fields.map(field=><label className={field.long?"span2":undefined} key={field.name}>
        {field.label}
        {field.long?<textarea
          name={field.name}
          rows={field.name==="body"||field.name==="content"||field.name==="description"?5:3}
          defaultValue={localeValue(entity.translations,locale,field.name)}
          placeholder={field.array?"Um item por linha":undefined}
        />:<input name={field.name} defaultValue={localeValue(entity.translations,locale,field.name)}/>}
      </label>)}
    </div>
    <button>Salvar {locale==="en"?"inglês":"espanhol"}</button>
  </form>;
}

export default async function SiteLanguages(){
  await requireAdmin();
  const [settings,pages,sections,rooms,promotions,posts,categories,products,restaurantSettings,modifierGroups,modifierOptions,chatSettings,events]=await Promise.all([
    prisma.siteSettings.findUnique({where:{id:"main"}}),
    prisma.sitePage.findMany({orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}),
    prisma.siteSection.findMany({include:{page:{select:{title:true,slug:true}}},orderBy:[{pageId:"asc"},{sortOrder:"asc"}]}),
    prisma.accommodation.findMany({orderBy:{name:"asc"}}),
    prisma.promotion.findMany({orderBy:{createdAt:"desc"},take:40}),
    prisma.blogPost.findMany({orderBy:{createdAt:"desc"},take:60}),
    prisma.restaurantCategory.findMany({orderBy:{sortOrder:"asc"}}),
    prisma.restaurantProduct.findMany({include:{category:true},orderBy:{name:"asc"},take:150}),
    prisma.restaurantSettings.findUnique({where:{id:"main"}}),
    prisma.restaurantModifierGroup.findMany({orderBy:{name:"asc"}}),
    prisma.restaurantModifierOption.findMany({include:{group:true},orderBy:{name:"asc"}}),
    prisma.integrationSettings.findUnique({where:{id:"main"}}),
    prisma.moriahEvent.findMany({orderBy:{startsAt:"desc"},take:80})
  ]);

  const entities:Entity[]=[];
  if(settings)entities.push({
    type:"SETTINGS",id:settings.id,title:"Configurações gerais do site",subtitle:"Marca, slogan, contato e endereço",
    translations:settings.translations,
    fields:[
      {name:"siteName",label:"Nome do site"},
      {name:"tagline",label:"Slogan"},
      {name:"address",label:"Endereço"},
      {name:"whatsappFloatingLabel",label:"Texto do botão WhatsApp"},
      {name:"whatsappFloatingMessage",label:"Mensagem inicial do WhatsApp",long:true}
    ]
  });
  pages.forEach(page=>entities.push({
    type:"PAGE",id:page.id,title:"Página: "+page.title,subtitle:"/"+page.slug,translations:page.translations,
    fields:[
      {name:"title",label:"Título"},
      {name:"navLabel",label:"Nome no menu"},
      {name:"description",label:"Descrição",long:true},
      {name:"seoTitle",label:"SEO title"},
      {name:"seoDescription",label:"SEO description",long:true}
    ]
  }));
  sections.forEach(section=>entities.push({
    type:"SECTION",id:section.id,title:"Seção: "+(section.title||section.eyebrow||section.type),subtitle:section.page.title+" • /"+section.page.slug,
    translations:section.translations,
    fields:[
      {name:"eyebrow",label:"Chamada pequena"},
      {name:"title",label:"Título"},
      {name:"subtitle",label:"Subtítulo"},
      {name:"body",label:"Texto / itens",long:true},
      {name:"imageAlt",label:"Texto alternativo"},
      {name:"ctaLabel",label:"Botão principal"},
      {name:"secondaryCtaLabel",label:"Botão secundário"}
    ]
  }));
  rooms.forEach(room=>entities.push({
    type:"ACCOMMODATION",id:room.id,title:"Hospedagem: "+room.name,translations:room.translations,
    fields:[
      {name:"name",label:"Nome"},
      {name:"type",label:"Tipo"},
      {name:"description",label:"Descrição",long:true},
      {name:"beds",label:"Camas"},
      {name:"rules",label:"Regras",long:true},
      {name:"amenities",label:"Comodidades",long:true,array:true}
    ]
  }));
  promotions.forEach(row=>entities.push({
    type:"PROMOTION",id:row.id,title:"Promoção: "+row.title,translations:row.translations,
    fields:[{name:"title",label:"Título"},{name:"description",label:"Descrição",long:true}]
  }));
  posts.forEach(row=>entities.push({
    type:"BLOG",id:row.id,title:"Blog: "+row.title,translations:row.translations,
    fields:[{name:"title",label:"Título"},{name:"excerpt",label:"Resumo",long:true},{name:"content",label:"Conteúdo",long:true}]
  }));
  categories.forEach(row=>entities.push({
    type:"CATEGORY",id:row.id,title:"Moriah Food / categoria: "+row.name,translations:row.translations,
    fields:[{name:"name",label:"Nome"},{name:"description",label:"Descrição",long:true}]
  }));
  if(restaurantSettings)entities.push({
    type:"RESTAURANT_SETTINGS",id:restaurantSettings.id,title:"Moriah Food / textos gerais",translations:restaurantSettings.translations,
    fields:[{name:"menuTitle",label:"Título do cardápio"},{name:"menuSubtitle",label:"Subtítulo do cardápio",long:true}]
  });
  products.forEach(row=>entities.push({
    type:"PRODUCT",id:row.id,title:"Moriah Food: "+row.name,subtitle:row.category.name,translations:row.translations,
    fields:[
      {name:"name",label:"Nome"},
      {name:"description",label:"Descrição",long:true},
      {name:"badge",label:"Selo / badge"},
      {name:"tags",label:"Tags",long:true,array:true},
      {name:"allergens",label:"Alérgenos",long:true,array:true}
    ]
  }));
  modifierGroups.forEach(row=>entities.push({
    type:"MOD_GROUP",id:row.id,title:"Adicionais / grupo: "+row.name,translations:row.translations,
    fields:[{name:"name",label:"Nome do grupo"}]
  }));
  modifierOptions.forEach(row=>entities.push({
    type:"MOD_OPTION",id:row.id,title:"Adicional: "+row.name,subtitle:row.group.name,translations:row.translations,
    fields:[{name:"name",label:"Nome da opção"}]
  }));
  if(chatSettings)entities.push({
    type:"CHAT_SETTINGS",id:chatSettings.id,title:"Assistente virtual / Groq",translations:chatSettings.translations,
    fields:[{name:"chatName",label:"Nome do assistente"},{name:"chatWelcome",label:"Mensagem de boas-vindas",long:true}]
  });
  events.forEach(row=>entities.push({
    type:"EVENT",id:row.id,title:"Evento: "+row.title,translations:row.translations,
    fields:[
      {name:"title",label:"Título"},
      {name:"eyebrow",label:"Chamada pequena"},
      {name:"summary",label:"Resumo",long:true},
      {name:"description",label:"Descrição",long:true},
      {name:"category",label:"Categoria"},
      {name:"venue",label:"Local"},
      {name:"address",label:"Endereço"},
      {name:"badge",label:"Selo"},
      {name:"ctaLabel",label:"Botão"},
      {name:"priceLabel",label:"Preço / chamada comercial"}
    ]
  }));

  const groups=[
    ["SETTINGS","Geral"],
    ["PAGE","Páginas"],
    ["SECTION","Seções do Site Studio"],
    ["ACCOMMODATION","Hospedagens"],
    ["PROMOTION","Promoções"],
    ["BLOG","Blog"],
    ["RESTAURANT_SETTINGS","Moriah Food / textos gerais"],
    ["CATEGORY","Categorias do Moriah Food"],
    ["PRODUCT","Produtos do Moriah Food"],
    ["MOD_GROUP","Grupos de adicionais"],
    ["MOD_OPTION","Opções de adicionais"],
    ["CHAT_SETTINGS","Assistente virtual"],
    ["EVENT","Eventos"]
  ];

  return <main className="adminPage siteLanguagesPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH CMS / INTERNACIONALIZAÇÃO</small>
        <h1>Português, English <span>& Español</span></h1>
        <p>Português é a fonte principal. Inglês e espanhol são editáveis por conteúdo e usam fallback automático quando algum campo ainda não foi traduzido.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/site">← Site Studio</Link>
        <Link className="adminPrimaryAction" href="/" target="_blank">Abrir site ↗</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Idiomas</small><strong>3</strong></div>
      <div><small>Português</small><strong>BASE</strong></div>
      <div><small>English</small><strong>EN</strong></div>
      <div><small>Español</small><strong>ES</strong></div>
    </section>

    {groups.map(([type,label])=>{
      const rows=entities.filter(entity=>entity.type===type);
      if(!rows.length)return null;
      return <section className="siteLocaleGroup" key={type}>
        <div className="inventorySectionHead">
          <div><small>TRADUÇÕES</small><h2>{label}</h2></div>
          <p>{rows.length} item(ns). Campos não preenchidos continuam exibindo português.</p>
        </div>
        <div className="adminStack">
          {rows.map(entity=><details className="siteLocaleCard" key={entity.type+entity.id}>
            <summary>
              <span><b>{entity.title}</b>{entity.subtitle&&<small>{entity.subtitle}</small>}</span>
              <strong>EN / ES</strong>
            </summary>
            <div className="siteLocaleColumns">
              <TranslationForm entity={entity} locale="en"/>
              <TranslationForm entity={entity} locale="es"/>
            </div>
          </details>)}
        </div>
      </section>;
    })}
  </main>;
}
