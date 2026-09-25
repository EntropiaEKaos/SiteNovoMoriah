import Link from "next/link";
import {prisma} from "../../../../lib/prisma";
import {requireAdmin} from "../../../../lib/admin-auth";
import {
  createModifierGroup,
  createModifierOption,
  linkModifierGroup
} from "../../../../lib/restaurant-actions";

export const dynamic="force-dynamic";

const money=(value:number)=>(value/100).toLocaleString("pt-BR",{
  style:"currency",
  currency:"BRL"
});

export default async function Page(){
  await requireAdmin();

  const [groups,products]=await Promise.all([
    prisma.restaurantModifierGroup.findMany({
      include:{
        options:true,
        products:{include:{product:true}}
      },
      orderBy:{name:"asc"}
    }),
    prisma.restaurantProduct.findMany({
      where:{active:true},
      orderBy:{name:"asc"}
    })
  ]);

  const options=groups.reduce((sum,group)=>sum+group.options.length,0);
  const linkedProducts=new Set(
    groups.flatMap(group=>group.products.map(link=>link.productId))
  ).size;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / PERSONALIZAÇÃO</small>
        <h1>Adicionais <span>& combos</span></h1>
        <p>Crie grupos de personalização, opções extras e vincule cada conjunto aos produtos do cardápio sem editar código.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/restaurante">← Restaurante</Link>
        <Link className="adminSecondaryAction" href="/admin/restaurante/cardapio">Cardápio Studio →</Link>
        <Link className="adminPrimaryAction" href="/restaurante" target="_blank">Ver cardápio ↗</Link>
      </div>
    </section>

    <section className="adminMetricStrip">
      <div><small>Grupos</small><strong>{groups.length}</strong></div>
      <div><small>Opções</small><strong>{options}</strong></div>
      <div><small>Produtos vinculados</small><strong>{linkedProducts}</strong></div>
      <div><small>Produtos ativos</small><strong>{products.length}</strong></div>
    </section>

    <section className="modifierComposer">
      <form action={createModifierGroup} className="adminSectionCard isDark adminFormGrid" data-feedback-success="Grupo de adicionais criado com sucesso.">
        <div className="span2">
          <small>NOVO GRUPO</small>
          <h2>Regra de escolha</h2>
          <p>Ex.: “Escolha o ponto”, “Molhos” ou “Adicionais”.</p>
        </div>
        <label className="span2">Nome
          <input name="name" required placeholder="Escolha o ponto"/>
        </label>
        <label>Máximo de escolhas
          <input name="maxSelect" type="number" min="1" defaultValue="1"/>
        </label>
        <label className="modifierCheckLabel">
          <span><input name="required" type="checkbox"/> Obrigatório</span>
        </label>
        <button className="span2">Criar grupo</button>
      </form>

      <form action={createModifierOption} className="adminSectionCard modifierAccentCard adminFormGrid" data-feedback-success="Adicional criado com sucesso.">
        <div className="span2">
          <small>NOVA OPÇÃO</small>
          <h2>Item adicional</h2>
          <p>Cadastre opções e seus valores para cada grupo.</p>
        </div>
        <label className="span2">Grupo
          <select name="groupId" required defaultValue="">
            <option value="">Selecione</option>
            {groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <label>Nome
          <input name="name" required placeholder="Bacon extra"/>
        </label>
        <label>Preço
          <input name="price" inputMode="decimal" placeholder="R$ 0,00"/>
        </label>
        <button className="span2">Adicionar opção</button>
      </form>

      <form action={linkModifierGroup} className="adminSectionCard adminFormGrid" data-feedback-success="Grupo vinculado ao produto com sucesso.">
        <div className="span2">
          <small>VÍNCULO</small>
          <h2>Produto + grupo</h2>
          <p>Defina em quais produtos cada grupo aparece.</p>
        </div>
        <label className="span2">Produto
          <select name="productId" required defaultValue="">
            <option value="">Selecione</option>
            {products.map(product=><option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="span2">Grupo
          <select name="groupId" required defaultValue="">
            <option value="">Selecione</option>
            {groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <button className="span2">Vincular ao produto</button>
      </form>
    </section>

    <div className="adminSectionHead modifierSectionHead">
      <div>
        <small>ESTRUTURA ATUAL</small>
        <h2>Grupos configurados.</h2>
      </div>
      <p>{groups.length
        ? "Revise opções, obrigatoriedade e produtos vinculados."
        : "Crie o primeiro grupo acima."
      }</p>
    </div>

    {groups.length===0?<section className="adminEmptyState">
      <strong>Nenhum grupo cadastrado.</strong>
      <p>Comece criando uma regra de escolha para o cardápio.</p>
    </section>:<section className="modifierGroupGrid">
      {groups.map(group=><article className="adminListCard modifierGroupCard" key={group.id}>
        <div className="adminListCardHead">
          <div>
            <small>{group.required?"OBRIGATÓRIO":"OPCIONAL"}</small>
            <h3>{group.name}</h3>
            <p>Até {group.maxSelect} escolha(s) por item.</p>
          </div>
          <span className={"adminChip "+(group.required?"warn":"ok")}>
            {group.options.length} opção(ões)
          </span>
        </div>

        <div className="modifierOptionList">
          {group.options.length===0?<div className="adminPageNote">Sem opções cadastradas.</div>:group.options.map(option=><div className="adminStatusLine" key={option.id}>
            <span>{option.name}</span>
            <b>{option.priceCents?"+ "+money(option.priceCents):"SEM ACRÉSCIMO"}</b>
          </div>)}
        </div>

        <div className="modifierProducts">
          <small>PRODUTOS VINCULADOS</small>
          <div className="adminMetaRow">
            {group.products.length
              ?group.products.map(link=><span className="adminChip" key={link.productId}>{link.product.name}</span>)
              :<span className="adminChip warn">Nenhum produto</span>
            }
          </div>
        </div>
      </article>)}
    </section>}
  </main>;
}
