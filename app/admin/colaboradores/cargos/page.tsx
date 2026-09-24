import Link from "next/link";
import {requireAdmin} from "../../../../lib/admin-auth";
import {prisma} from "../../../../lib/prisma";
import {
  createStaffPosition,
  deleteStaffPosition,
  toggleStaffPosition,
  updateStaffPosition
} from "./actions";

export const dynamic="force-dynamic";

export default async function StaffPositionsPage(){
  await requireAdmin();

  let schemaReady=true;
  let positions:Array<{
    id:string;
    name:string;
    description:string|null;
    active:boolean;
    sortOrder:number;
    _count:{assignments:number};
  }>=[];

  try{
    positions=await prisma.staffPosition.findMany({
      include:{_count:{select:{assignments:true}}},
      orderBy:[{sortOrder:"asc"},{name:"asc"}]
    });
  }catch(error){
    schemaReady=false;
    console.error("STAFF_POSITION_SCHEMA_PENDING",error);
  }

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH / EQUIPE</small>
        <h1>Cargos de colaboradores</h1>
        <p>Crie as categorias usadas no cadastro dos colaboradores e descreva a função de cada cargo.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/hospedes?type=EMPLOYEE">Ver colaboradores →</Link>
        <Link className="adminSecondaryAction" href="/admin/hospedes">Cadastros →</Link>
      </div>
    </section>

    {!schemaReady&&<section className="adminPageNote" style={{marginBottom:20}}>
      <b>Módulo aguardando migration.</b><br/>
      O restante do admin continua funcionando. Quando a migration de produção for aplicada, esta tela será ativada automaticamente.
    </section>}

    <section className="adminTwoCol" style={{marginBottom:20}}>
      <article className="adminSectionCard">
        <h2>Novo cargo / categoria</h2>
        <p>Exemplos: Recepção, Cozinha, Limpeza, Manutenção, Gerência ou Administrativo.</p>
        <form action={createStaffPosition} className="adminFormGrid">
          <label>Nome do cargo
            <input name="name" required maxLength={120} placeholder="Ex.: Recepcionista" disabled={!schemaReady}/>
          </label>
          <label>Ordem
            <input name="sortOrder" type="number" min="0" max="9999" defaultValue={100} disabled={!schemaReady}/>
          </label>
          <label className="span2">Descrição da função
            <textarea name="description" rows={5} maxLength={1200} placeholder="Responsabilidades, área e observações sobre o cargo..." disabled={!schemaReady}/>
          </label>
          <button className="span2" disabled={!schemaReady}>Criar cargo</button>
        </form>
      </article>

      <aside className="adminSectionCard isDark">
        <small>COMO FUNCIONA</small>
        <h2>Cadastro operacional</h2>
        <div className="adminStatusLine"><span>1. Crie o cargo</span><b>AQUI</b></div>
        <div className="adminStatusLine"><span>2. Cadastre a pessoa</span><b>HÓSPEDES</b></div>
        <div className="adminStatusLine"><span>3. Marque colaborador</span><b>SIM</b></div>
        <div className="adminStatusLine"><span>4. Escolha o cargo</span><b>CATEGORIA</b></div>
        <p style={{marginTop:18}}>Colaboradores continuam independentes de reserva ou hospedagem.</p>
      </aside>
    </section>

    <section className="adminStack">
      {schemaReady&&positions.length===0?<div className="adminEmptyState">
        <strong>Nenhum cargo cadastrado.</strong>
        <p>Crie o primeiro cargo no formulário acima.</p>
      </div>:positions.map(position=><article className="adminListCard" key={position.id}>
        <div className="adminListCardHead">
          <div>
            <small>ORDEM {position.sortOrder} • {position.active?"ATIVO":"INATIVO"}</small>
            <h3>{position.name}</h3>
            <p>{position.description||"Sem descrição operacional."}</p>
          </div>
          <span className={"adminChip "+(position.active?"ok":"warn")}>{position._count.assignments} colaborador(es)</span>
        </div>

        <form action={updateStaffPosition} className="adminFormGrid" style={{marginTop:16}}>
          <input type="hidden" name="id" value={position.id}/>
          <label>Nome
            <input name="name" required defaultValue={position.name}/>
          </label>
          <label>Ordem
            <input name="sortOrder" type="number" min="0" max="9999" defaultValue={position.sortOrder}/>
          </label>
          <label className="span2">Descrição
            <textarea name="description" rows={3} maxLength={1200} defaultValue={position.description||""}/>
          </label>
          <button>Salvar cargo</button>
        </form>

        <div className="adminInlineActions" style={{marginTop:12}}>
          <form action={toggleStaffPosition}>
            <input type="hidden" name="id" value={position.id}/>
            <button>{position.active?"Desativar":"Ativar"}</button>
          </form>
          <form action={deleteStaffPosition}>
            <input type="hidden" name="id" value={position.id}/>
            <button className="danger" disabled={position._count.assignments>0}>Excluir</button>
          </form>
        </div>
      </article>)}
    </section>
  </main>;
}
