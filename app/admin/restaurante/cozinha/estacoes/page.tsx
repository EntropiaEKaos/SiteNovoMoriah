import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {
  createDefaultKitchenStations,
  createKitchenStation,
  saveKitchenSettings,
  updateKitchenStation
} from "../../../../../lib/kitchen-actions";
import KitchenNav from "../kitchen-nav";

export const dynamic="force-dynamic";

export default async function Page(){
  await requireAdmin();
  const [stations,settings]=await Promise.all([
    prisma.restaurantStation.findMany({
      include:{_count:{select:{products:true,orderItems:true}}},
      orderBy:[{sortOrder:"asc"},{name:"asc"}]
    }),
    prisma.restaurantSettings.findUnique({where:{id:"main"}})
  ]);

  return <main className="adminPage kitchen40">
    <section className="kitchenHero compact">
      <div><small>MORIAH KITCHEN 4.0</small><h1>Estações</h1><p>Organize a produção por chapa, fritadeira, cozinha, bebidas, sobremesas ou qualquer fluxo da operação.</p></div>
    </section>
    <KitchenNav active="/admin/restaurante/cozinha/estacoes"/>

    <div className="kitchenPresetBar">
      <div><b>Começando agora?</b><span>Crie Chapa, Fritadeira, Cozinha, Bebidas e Sobremesas automaticamente.</span></div>
      <form action={createDefaultKitchenStations}><button className="kitchenPrimary">Criar estações padrão</button></form>
    </div>

    <section className="kitchenTwoCol">
      <form action={createKitchenStation} className="kitchenPanel kitchenForm">
        <div className="kitchenPanelHead"><div><small>NOVA ESTAÇÃO</small><h2>Criar estação</h2></div></div>
        <label>Nome<input name="name" required placeholder="Ex.: Chapa"/></label>
        <label>Código<input name="code" placeholder="Ex.: CHAPA"/></label>
        <label>Descrição<textarea name="description" rows={3} placeholder="Responsabilidade da estação"/></label>
        <div className="kitchenFormGrid">
          <label>Meta em minutos<input name="targetMinutes" type="number" min="1" max="240" defaultValue={15}/></label>
          <label>Ordem<input name="sortOrder" type="number" defaultValue={100}/></label>
        </div>
        <label>Cor operacional<input name="color" type="color" defaultValue="#0b607a"/></label>
        <label className="kitchenCheck"><input name="active" type="checkbox" defaultChecked/> Estação ativa</label>
        <button className="kitchenPrimary">Criar estação</button>
      </form>

      <form action={saveKitchenSettings} className="kitchenPanel kitchenForm">
        <div className="kitchenPanelHead"><div><small>COMPORTAMENTO</small><h2>Regras do KDS</h2></div></div>
        <div className="kitchenFormGrid">
          <label>Alerta amarelo<input name="kitchenWarningMinutes" type="number" min="1" defaultValue={settings?.kitchenWarningMinutes||20}/></label>
          <label>Crítico vermelho<input name="kitchenCriticalMinutes" type="number" min="2" defaultValue={settings?.kitchenCriticalMinutes||35}/></label>
        </div>
        <label className="kitchenCheck"><input name="stationMode" type="checkbox" defaultChecked={settings?.stationMode!==false}/> Usar estações no KDS</label>
        <label className="kitchenCheck"><input name="expeditionEnabled" type="checkbox" defaultChecked={settings?.expeditionEnabled!==false}/> Ativar tela de expedição</label>
        <label className="kitchenCheck"><input name="autoReadyOrder" type="checkbox" defaultChecked={settings?.autoReadyOrder!==false}/> Marcar pedido pronto quando todos os itens estiverem prontos</label>
        <button className="kitchenPrimary">Salvar regras</button>
      </form>
    </section>

    <section className="kitchenStationGrid">
      {stations.map(station=><form action={updateKitchenStation} className={"kitchenStationCard"+(station.active?"":" isDisabled")} key={station.id}>
        <input type="hidden" name="id" value={station.id}/>
        <div className="kitchenStationColor" style={{background:station.color}}/>
        <div className="kitchenStationEdit">
          <div className="kitchenStationTop">
            <span>{station.code}</span>
            <b>{station._count.products} produtos</b>
          </div>
          <input className="kitchenStationNameInput" name="name" defaultValue={station.name}/>
          <textarea name="description" rows={2} defaultValue={station.description||""} placeholder="Descrição"/>
          <div className="kitchenFormGrid">
            <label>Código<input name="code" defaultValue={station.code}/></label>
            <label>Meta<input name="targetMinutes" type="number" min="1" max="240" defaultValue={station.targetMinutes}/></label>
            <label>Ordem<input name="sortOrder" type="number" defaultValue={station.sortOrder}/></label>
            <label>Cor<input name="color" type="color" defaultValue={station.color}/></label>
          </div>
          <label className="kitchenCheck"><input name="active" type="checkbox" defaultChecked={station.active}/> Ativa</label>
          <button>Salvar estação</button>
        </div>
      </form>)}
      {stations.length===0&&<div className="kitchenEmpty"><strong>Nenhuma estação criada.</strong><p>Crie Chapa, Fritadeira, Cozinha, Bebidas ou as estações que fizerem sentido para sua operação.</p></div>}
    </section>
  </main>;
}
