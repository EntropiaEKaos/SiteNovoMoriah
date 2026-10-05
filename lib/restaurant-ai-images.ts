import "server-only";
import {prisma} from "./prisma";

const MORIAH_STYLE=[
  "professional Brazilian food photography",
  "realistic appetizing food, faithful to the listed ingredients",
  "single plated serving centered in frame",
  "clean neutral dark restaurant background",
  "soft natural side lighting, subtle shadows",
  "commercial menu photography, high detail",
  "no text, no logos, no watermark, no people"
].join(", ");

export function buildMoriahFoodImagePrompt(product:{name:string;description:string|null;category:{name:string}}){
  const description=(product.description||"").trim();
  return [
    MORIAH_STYLE,
    "dish: "+product.name,
    "menu category: "+product.category.name,
    description?"exact menu description: "+description:"",
    "Do not add ingredients, garnishes, beverages or side dishes that are not stated in the menu description."
  ].filter(Boolean).join(". ");
}

export const MORIAH_FOOD_NEGATIVE_PROMPT=
  "text, typography, logo, watermark, people, hands, duplicate food, invented ingredients, plastic-looking food, illustration, cartoon";

export async function createFoodImageDraft(productId:string){
  const product=await prisma.restaurantProduct.findUnique({where:{id:productId},include:{category:true}});
  if(!product)throw new Error("Produto não encontrado.");
  return prisma.restaurantProductImageCandidate.create({
    data:{
      productId,
      prompt:buildMoriahFoodImagePrompt(product),
      negativePrompt:MORIAH_FOOD_NEGATIVE_PROMPT,
      provider:"PENDING",
      status:"DRAFT"
    }
  });
}
