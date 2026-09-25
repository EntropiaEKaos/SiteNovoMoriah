import Link from "next/link";
import {prisma} from "../../../lib/prisma";
import {requireAdmin} from "../../../lib/admin-auth";
import MediaPicker from "../components/media-picker";
import {
  createRoulettePrize,
  redeemRouletteSpin,
  saveRouletteSettings,
  toggleRoulettePrize,
  updateRoulettePrize
} from "./actions";

export const dynamic="force-dynamic";
const local=(d:Date|null)=>d?new Date(d.getTime()-3*60*60_000).toISOString().slice(0,16):"";

type ReviewLink={key:string;label:string;url:string};

function reviewMap(raw:unknown){
  const result:Record<string,string>={};
  if(Array.isArray(raw)){
    for(const item of raw){
      if(item&&typeof item==="object"&&!Array.isArray(item)){
        const row=item as Record<string,unknown>;
        const key=String(row.key||"");
        const url=String(row.url||"");
        if(key&&url)result[key]=url;
      }
    }
  }
  return result;
}

function defaults(id:"main"|"delivery"){
  if(id==="delivery")return {
    id:"delivery",active:true,campaignKey:"moriah-delivery-demo",title:"Roleta Entregas Moriah",
    subtitle:"Seu pedido chegou. Agora é hora de tentar a sorte.",
    introText:"Se quiser, conte como foi sua experiência em um dos aplicativos abaixo. A avaliação é opcional e não altera sua chance nem o prêmio.",
    googleReviewUrl:null,googleReviewLabel:"Avaliar a Moriah",reviewLinks:[] as ReviewLink[],
    termsText:"Ao participar, você autoriza o uso do nome e telefone apenas para administrar esta promoção e validar a entrega do prêmio.",
    activeFrom:null,activeUntil:null,themeMode:"CUSTOM",themePreset:"NEON",themePrimaryColor:"#101010",
    themeSecondaryColor:"#181818",themeAccentColor:"#FFD400",themeSurfaceColor:"#FFFFFF",
    themeTextColor:"#101010",themeBackgroundImageUrl:null,animationStyle:"SPARKLES",showEventBanner:false
  };
  return {
    id:"main",active:false,campaignKey:"moriah-1",title:"Roleta da Sorte Moriah",
    subtitle:"Cadastre-se e descubra seu prêmio.",
    introText:"Sua participação é independente de avaliações. Se quiser, compartilhe sua experiência no Google.",
    googleReviewUrl:null,googleReviewLabel:"Avaliar a Moriah no Google",reviewLinks:[] as ReviewLink[],
    termsText:"Ao participar, você autoriza o uso do nome e telefone apenas para administrar esta promoção e validar a entrega do prêmio.",
    activeFrom:null,activeUntil:null,themeMode:"AUTO_EVENT",themePreset:"CELEBRATION",themePrimaryColor:"#0B607A",
    themeSecondaryColor:"#073B4C",themeAccentColor:"#FFC845",themeSurfaceColor:"#FFFFFF",
    themeTextColor:"#16333D",themeBackgroundImageUrl:null,animationStyle:"CONFETTI",showEventBanner:true
  };
}

type CampaignSettings=ReturnType<typeof defaults>&{reviewLinks:unknown};

function CampaignEditor({
  id,
  settings,
  media,
  prizes,
  publicHref
}:{
  id:"main"|"delivery";
  settings:CampaignSettings;
  media:Array<{id:string;url:string;alt:string|null}>;
  prizes:Array<{
    id:string;name:string;description:string|null;color:string;textColor:string;weight:number;
    quantityTotal:number|null;awardedCount:number;validityDays:number|null;active:boolean;sortOrder:number;
  }>;
  publicHref:string;
}){
  const reviews=reviewMap(settings.reviewLinks);
  const isDelivery=id==="delivery";
  return <section className="rouletteAdminCampaign">
    <header className="rouletteAdminCampaignHead">
      <div>
        <small>{isDelivery?"DELIVERY / AVALIAÇÕES OPCIONAIS":"EXPERIÊNCIA / HÓSPEDES & CLIENTES"}</small>
        <h2>{isDelivery?"Roleta Entregas":"Roleta principal"}</h2>
        <p>{isDelivery
          ?"Campanha separada para pedidos de delivery, com atalhos opcionais para iFood, 99Food e Keeta."
          :"Campanha principal da Moriah, com tema adaptável por evento e convite opcional para avaliação."
        }</p>
      </div>
      <Link className="adminSecondaryAction" href={publicHref} target="_blank">Abrir exemplo ↗</Link>
    </header>

    <div className="adminTwoCol rouletteAdminGrid">
      <article className="adminSectionCard">
        <h2>Campanha + visual</h2>
        <form action={saveRouletteSettings} className="adminFormGrid" data-feedback-success="Campanha salva com sucesso.">
          <input type="hidden" name="settingsId" value={id}/>
          <label className="span2"><span><input type="checkbox" name="active" defaultChecked={settings.active}/> Campanha ativa</span></label>
          <label>Identificador<input name="campaignKey" required defaultValue={settings.campaignKey}/></label>
          <label>Título<input name="title" required defaultValue={settings.title}/></label>
          <label className="span2">Subtítulo<input name="subtitle" defaultValue={settings.subtitle}/></label>
          <label className="span2">Texto inicial<textarea name="introText" rows={3} defaultValue={settings.introText}/></label>

          {!isDelivery&&<>
            <label className="span2">Link Google<input name="googleReviewUrl" type="url" defaultValue={settings.googleReviewUrl||reviews.GOOGLE||""}/></label>
            <input type="hidden" name="googleReviewLabel" value={settings.googleReviewLabel}/>
          </>}
          {isDelivery&&<>
            <label className="span2">Link de avaliação iFood<input name="ifoodReviewUrl" type="url" defaultValue={reviews.IFOOD||""} placeholder="https://..."/></label>
            <label className="span2">Link de avaliação 99Food<input name="food99ReviewUrl" type="url" defaultValue={reviews["99FOOD"]||""} placeholder="https://..."/></label>
            <label className="span2">Link de avaliação Keeta<input name="keetaReviewUrl" type="url" defaultValue={reviews.KEETA||""} placeholder="https://..."/></label>
          </>}

          <label>Início<input name="activeFrom" type="datetime-local" defaultValue={local(settings.activeFrom)}/></label>
          <label>Fim<input name="activeUntil" type="datetime-local" defaultValue={local(settings.activeUntil)}/></label>
          <label className="span2">Termos<textarea name="termsText" rows={4} defaultValue={settings.termsText}/></label>
          <label>Modo<select name="themeMode" defaultValue={settings.themeMode}><option value="AUTO_EVENT">Automático por evento/data</option><option value="CUSTOM">Sempre usar tema padrão</option></select></label>
          <label>Preset<select name="themePreset" defaultValue={settings.themePreset}><option value="CELEBRATION">Celebração</option><option value="SUMMER">Verão / Praia</option><option value="CHRISTMAS">Natal</option><option value="HALLOWEEN">Halloween</option><option value="ROMANCE">Romântico</option><option value="NEON">Neon / Delivery</option><option value="ELEGANT">Elegante</option></select></label>
          <label>Animação<select name="animationStyle" defaultValue={settings.animationStyle}><option value="CONFETTI">Confete</option><option value="SPARKLES">Brilhos</option><option value="BUBBLES">Bolhas</option><option value="SNOW">Neve</option><option value="NONE">Sem partículas</option></select></label>
          <label><span><input name="showEventBanner" type="checkbox" defaultChecked={settings.showEventBanner}/> Mostrar banner do evento</span></label>
          <label>Principal<input name="themePrimaryColor" type="color" defaultValue={settings.themePrimaryColor}/></label>
          <label>Secundária<input name="themeSecondaryColor" type="color" defaultValue={settings.themeSecondaryColor}/></label>
          <label>Destaque<input name="themeAccentColor" type="color" defaultValue={settings.themeAccentColor}/></label>
          <label>Superfície<input name="themeSurfaceColor" type="color" defaultValue={settings.themeSurfaceColor}/></label>
          <label>Texto<input name="themeTextColor" type="color" defaultValue={settings.themeTextColor}/></label>
          <div className="span2">
            <MediaPicker
              name="themeBackgroundImageUrl"
              media={media}
              defaultValue={settings.themeBackgroundImageUrl||""}
              label="Fundo da roleta"
              recommended="Horizontal • alta resolução"
            />
          </div>
          <button className="span2">Salvar campanha e visual</button>
        </form>
      </article>

      <article className="adminSectionCard">
        <h2>Novo prêmio</h2>
        <form action={createRoulettePrize} className="adminFormGrid" data-feedback-success="Prêmio criado com sucesso.">
          <input type="hidden" name="settingsId" value={id}/>
          <label className="span2">Nome<input name="name" required placeholder={isDelivery?"Ex.: Frete grátis":"Ex.: Refrigerante grátis"}/></label>
          <label className="span2">Descrição<input name="description"/></label>
          <label>Cor<input name="color" type="color" defaultValue="#ffc845"/></label>
          <label>Texto<input name="textColor" type="color" defaultValue="#1b252b"/></label>
          <label>Peso<input name="weight" type="number" min="1" defaultValue="1"/></label>
          <label>Quantidade<input name="quantityTotal" type="number" min="1"/></label>
          <label>Validade dias<input name="validityDays" type="number" min="1" max="365" defaultValue="14"/></label>
          <label>Ordem<input name="sortOrder" type="number" min="0" defaultValue="100"/></label>
          <label className="span2"><span><input type="checkbox" name="active" defaultChecked/> Ativo</span></label>
          <button className="span2">Adicionar prêmio</button>
        </form>
        <div className="roulettePrizeHint">
          <small>PLACEHOLDERS DE AVALIAÇÃO</small>
          <p>{isDelivery
            ?"10% OFF • Refrigerante grátis • Sobremesa grátis • Frete grátis • Upgrade de bebida • Brinde surpresa."
            :"5% OFF • 10% OFF • Refrigerante grátis • Sobremesa grátis • Brinde surpresa."
          }</p>
        </div>
      </article>
    </div>

    <article className="adminSectionCard" style={{marginTop:14}}>
      <div className="inventorySectionHead" style={{marginTop:0}}>
        <div><small>PRÊMIOS DA CAMPANHA</small><h2>{prizes.length} configurado(s)</h2></div>
        <p>Os prêmios são isolados por campanha; alterar a roleta de Entregas não interfere na principal.</p>
      </div>
      <div className="adminStack">
        {prizes.map(prize=><details key={prize.id} className="adminPageNote">
          <summary><strong>{prize.name}</strong> • peso {prize.weight} • {prize.awardedCount}{prize.quantityTotal!==null?" / "+prize.quantityTotal:" / ∞"}</summary>
          <form action={updateRoulettePrize} className="adminFormGrid" data-feedback-success="Prêmio salvo com sucesso.">
            <input type="hidden" name="id" value={prize.id}/>
            <label className="span2">Nome<input name="name" defaultValue={prize.name}/></label>
            <label className="span2">Descrição<input name="description" defaultValue={prize.description||""}/></label>
            <label>Cor<input name="color" type="color" defaultValue={prize.color}/></label>
            <label>Texto<input name="textColor" type="color" defaultValue={prize.textColor}/></label>
            <label>Peso<input name="weight" type="number" min="1" defaultValue={prize.weight}/></label>
            <label>Quantidade<input name="quantityTotal" type="number" min={Math.max(1,prize.awardedCount)} defaultValue={prize.quantityTotal??""}/></label>
            <label>Validade<input name="validityDays" type="number" min="1" max="365" defaultValue={prize.validityDays??""}/></label>
            <label>Ordem<input name="sortOrder" type="number" min="0" defaultValue={prize.sortOrder}/></label>
            <label className="span2"><span><input type="checkbox" name="active" defaultChecked={prize.active}/> Ativo</span></label>
            <button className="span2">Salvar prêmio</button>
          </form>
          <form action={toggleRoulettePrize} data-feedback-success="Status do prêmio atualizado.">
            <input type="hidden" name="id" value={prize.id}/>
            <button>{prize.active?"Pausar":"Reativar"}</button>
          </form>
        </details>)}
        {!prizes.length&&<div className="adminEmptyState"><strong>Nenhum prêmio nesta campanha.</strong><p>Use o formulário acima para criar o primeiro.</p></div>}
      </div>
    </article>
  </section>;
}

export default async function Page(){
  await requireAdmin();
  const now=new Date();
  const [mainRaw,deliveryRaw,prizes,spins,media,events]=await Promise.all([
    prisma.rouletteSettings.findUnique({where:{id:"main"}}),
    prisma.rouletteSettings.findUnique({where:{id:"delivery"}}),
    prisma.roulettePrize.findMany({orderBy:[{campaignKey:"asc"},{sortOrder:"asc"},{createdAt:"asc"}]}),
    prisma.rouletteSpin.findMany({include:{entry:true,prize:true},orderBy:{createdAt:"desc"},take:150}),
    prisma.media.findMany({select:{id:true,url:true,alt:true},orderBy:{createdAt:"desc"},take:250}),
    prisma.moriahEvent.findMany({where:{rouletteThemeEnabled:true},orderBy:{startsAt:"desc"},take:12})
  ]);

  const main={...defaults("main"),...(mainRaw||{})} as CampaignSettings;
  const delivery={...defaults("delivery"),...(deliveryRaw||{})} as CampaignSettings;
  const mainPrizes=prizes.filter(prize=>prize.campaignKey===main.campaignKey);
  const deliveryPrizes=prizes.filter(prize=>prize.campaignKey===delivery.campaignKey);
  const todayStart=new Date(new Date().setHours(0,0,0,0));
  const today=spins.filter(spin=>spin.createdAt>=todayStart).length;
  const redeemed=spins.filter(spin=>spin.redeemedAt).length;

  return <main className="adminPage rouletteAdminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH / ENGAJAMENTO</small>
        <h1>Roletas <span>3.0</span></h1>
        <p>Motor PixiJS multi-campanha, prêmios isolados, temas sazonais e auditoria. Avaliações são sempre opcionais e não interferem no sorteio.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/eventos">Eventos</Link>
        <Link className="adminSecondaryAction" href="/etc/roleta?preview=1" target="_blank">Principal ↗</Link>
        <Link className="adminPrimaryAction" href="/etc/roleta/entregas?preview=1" target="_blank">Entregas ↗</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Jogadas auditadas</small><strong>{spins.length}</strong></div>
      <div><small>Hoje</small><strong>{today}</strong></div>
      <div><small>Entregues</small><strong>{redeemed}</strong></div>
      <div><small>Temas de evento</small><strong>{events.length}</strong></div>
    </section>

    <section className="adminPageNote" style={{marginBottom:24}}>
      <strong>Avaliações não liberam prêmio.</strong> Os links Google/iFood/99Food/Keeta são convites opcionais; nome, telefone, sorteio e auditoria funcionam independentemente deles.
    </section>

    <CampaignEditor id="main" settings={main} media={media} prizes={mainPrizes} publicHref="/etc/roleta?preview=1"/>
    <CampaignEditor id="delivery" settings={delivery} media={media} prizes={deliveryPrizes} publicHref="/etc/roleta/entregas?preview=1"/>

    <section className="adminSectionCard" style={{marginTop:28}}>
      <h2>Auditoria unificada</h2>
      <div style={{overflowX:"auto"}}>
        <table className="adminDataTable">
          <thead><tr><th>Campanha</th><th>Data</th><th>Cliente</th><th>Telefone</th><th>Prêmio</th><th>Código</th><th>Status</th><th>Ação</th></tr></thead>
          <tbody>{spins.map(spin=>{
            const expired=Boolean(spin.expiresAt&&spin.expiresAt<now&&!spin.redeemedAt);
            return <tr key={spin.id}>
              <td><b>{spin.entry.campaignKey===delivery.campaignKey?"ENTREGAS":"PRINCIPAL"}</b></td>
              <td>{spin.createdAt.toLocaleString("pt-BR")}</td>
              <td>{spin.entry.name}</td>
              <td>+{spin.entry.phone}</td>
              <td>{spin.prize.name}</td>
              <td><strong>{spin.claimCode}</strong></td>
              <td>{spin.redeemedAt?"ENTREGUE":expired?"EXPIRADO":"PENDENTE"}</td>
              <td>{!spin.redeemedAt&&!expired?<form action={redeemRouletteSpin} data-feedback-success="Prêmio marcado como entregue."><input type="hidden" name="id" value={spin.id}/><button>Marcar entregue</button></form>:spin.redeemedBy||"—"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  </main>;
}
