import Link from "next/link";
import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {createMenuProduct} from "../../../../../lib/restaurant-actions";
import MenuProductForm from "../product-form";

export const dynamic="force-dynamic";

export default async function NewMenuProduct({
  searchParams
}:{
  searchParams:Promise<{category?:string}>
}){
  await requireAdmin();
  const params=await searchParams;

  const [categories,media,modifierGroups,ingredients,stations]=await Promise.all([
    prisma.restaurantCategory.findMany({orderBy:[{sortOrder:"asc"},{name:"asc"}]}),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:250}),
    prisma.restaurantModifierGroup.findMany({
      include:{options:{where:{active:true},orderBy:{name:"asc"}}},
      orderBy:{name:"asc"}
    }),
    prisma.restaurantIngredient.findMany({
      orderBy:[{active:"desc"},{name:"asc"}]
    }),
    prisma.restaurantStation.findMany({
      orderBy:[{active:"desc"},{sortOrder:"asc"},{name:"asc"}]
    })
  ]);

  const initialCategory=categories.some(category=>category.id===params.category)
    ?params.category
    :categories[0]?.id;

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / CARDÁPIO STUDIO</small>
        <h1>Novo produto</h1>
        <p>Monte o item completo: publicação, preço, imagem, agenda, estoque, adicionais e ficha técnica.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/restaurante/cardapio">← Cardápio Studio</Link>
        <Link className="adminSecondaryAction" href="/admin/galeria">Galeria →</Link>
      </div>
    </section>

    {categories.length===0?<section className="adminEmptyState">
      <strong>Crie uma categoria antes do produto.</strong>
      <p>Volte ao Cardápio Studio e cadastre a primeira categoria.</p>
      <Link className="adminPrimaryAction" href="/admin/restaurante/cardapio">Criar categoria</Link>
    </section>:<MenuProductForm
      action={createMenuProduct}
      product={{categoryId:initialCategory}}
      categories={categories}
      media={media}
      modifierGroups={modifierGroups}
      ingredients={ingredients}
      stations={stations}
    />}
  </main>;
}
