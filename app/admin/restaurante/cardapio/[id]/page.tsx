import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "../../../../../lib/prisma";
import {requireAdmin} from "../../../../../lib/admin-auth";
import {
  duplicateMenuProduct,
  updateMenuProduct
} from "../../../../../lib/restaurant-actions";
import MenuProductForm from "../product-form";

export const dynamic="force-dynamic";

export default async function EditMenuProduct({
  params
}:{
  params:Promise<{id:string}>
}){
  await requireAdmin();
  const {id}=await params;

  const [product,categories,media,modifierGroups,ingredients]=await Promise.all([
    prisma.restaurantProduct.findUnique({
      where:{id},
      include:{modifierLinks:true,recipes:true}
    }),
    prisma.restaurantCategory.findMany({orderBy:[{sortOrder:"asc"},{name:"asc"}]}),
    prisma.media.findMany({orderBy:{createdAt:"desc"},take:250}),
    prisma.restaurantModifierGroup.findMany({
      include:{options:{where:{active:true},orderBy:{name:"asc"}}},
      orderBy:{name:"asc"}
    }),
    prisma.restaurantIngredient.findMany({
      orderBy:[{active:"desc"},{name:"asc"}]
    })
  ]);

  if(!product)notFound();

  return <main className="adminPage">
    <section className="adminPageHero">
      <div>
        <small>MORIAH FOOD / CARDÁPIO STUDIO</small>
        <h1>Editar produto</h1>
        <p>{product.name} • alterações salvas passam a valer no cardápio e na validação do pedido.</p>
      </div>
      <div className="adminPageHeroActions">
        <Link className="adminSecondaryAction" href="/admin/restaurante/cardapio">← Cardápio Studio</Link>
        <form action={duplicateMenuProduct}>
          <input type="hidden" name="id" value={product.id}/>
          <button className="adminSecondaryAction" style={{border:"1px solid #ccc"}}>Duplicar produto</button>
        </form>
      </div>
    </section>

    <MenuProductForm
      action={updateMenuProduct}
      product={product}
      categories={categories}
      media={media}
      modifierGroups={modifierGroups}
      ingredients={ingredients}
    />
  </main>;
}
