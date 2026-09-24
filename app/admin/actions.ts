"use server";import {deleteMediaObject} from "../../lib/media-storage";import {prisma} from "../../lib/prisma";import {revalidatePath} from "next/cache";import {redirect} from "next/navigation";import {requireAdmin} from "../../lib/admin-auth";import {criticalAvailabilityCheck,hasAvailabilityConflict,syncChannelIntegration} from "../../lib/channel-sync";import {quoteAccommodation} from "../../lib/rate-engine";import {createInventoryHold,consumeInventoryHold,releaseInventoryHold} from "../../lib/inventory-holds";
function readAccommodationForm(formData:FormData){
  const text=(name:string,max=500)=>String(formData.get(name)||"").trim().slice(0,max);
  const integer=(name:string,fallback:number,min:number,max:number)=>{
    const raw=String(formData.get(name)||"").trim();
    const value=raw===""?fallback:Number(raw);
    if(!Number.isInteger(value)||value<min||value>max)throw new Error("Valor inválido em "+name+".");
    return value;
  };
  const optionalNumber=(name:string)=>{
    const raw=String(formData.get(name)||"").trim().replace(",",".");
    if(!raw)return null;
    const value=Number(raw);
    if(!Number.isFinite(value)||value<=0)throw new Error("Valor numérico inválido em "+name+".");
    return value;
  };

  const name=text("name",120);
  const description=text("description",4000);
  if(!name||!description)throw new Error("Nome e descrição são obrigatórios.");

  const type=text("type",40)||"QUARTO";
  const capacity=integer("capacity",2,1,50);
  const maxAdults=integer("maxAdults",Math.min(2,capacity),1,50);
  const maxChildren=integer("maxChildren",0,0,30);
  const bathrooms=integer("bathrooms",1,0,10);

  const rawPrice=String(formData.get("price")||"").trim().replace(",",".");
  const priceRaw=rawPrice?Number(rawPrice):null;
  if(priceRaw!==null&&(!Number.isFinite(priceRaw)||priceRaw<0))throw new Error("Preço inválido.");

  const checkInTime=text("checkInTime",5)||"14:00";
  const checkOutTime=text("checkOutTime",5)||"12:00";
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(checkInTime)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(checkOutTime)){
    throw new Error("Horário de check-in/check-out inválido.");
  }

  const internalCode=text("internalCode",40).toUpperCase()||null;
  if(internalCode&&!/^[A-Z0-9._-]+$/.test(internalCode))throw new Error("Código interno inválido.");

  const galleryImages=formData.getAll("galleryImages")
    .map(value=>String(value).trim())
    .filter(value=>/^https?:\/\//i.test(value))
    .slice(0,20);

  const amenities=formData.getAll("amenities")
    .map(value=>String(value).trim().toUpperCase())
    .filter(value=>/^[A-Z0-9_-]{2,40}$/.test(value))
    .slice(0,30);

  return {
    name,
    description,
    type,
    capacity,
    priceCents:priceRaw===null?null:Math.round(priceRaw*100),
    coverImage:text("coverImage",2000)||null,
    galleryImages,
    internalCode,
    roomNumber:text("roomNumber",40)||null,
    floor:text("floor",40)||null,
    maxAdults,
    maxChildren,
    beds:text("beds",300)||null,
    bathrooms,
    areaSqm:optionalNumber("areaSqm"),
    amenities,
    rules:text("rules",3000)||null,
    checkInTime,
    checkOutTime,
    internalNotes:text("internalNotes",3000)||null,
    featured:formData.get("featured")==="on",
    active:formData.get("active")==="on"
  };
}

export async function createAccommodation(formData:FormData){
  await requireAdmin();
  const data=readAccommodationForm(formData);
  await prisma.accommodation.create({data});
  revalidatePath("/admin/hospedagens");
  revalidatePath("/reservar");
  revalidatePath("/");
}
export async function createPromotion(formData:FormData){await requireAdmin();const title=String(formData.get("title")||"").trim();const description=String(formData.get("description")||"").trim();const coupon=String(formData.get("coupon")||"").trim().toUpperCase()||null;const discountType=String(formData.get("discountType")||"").trim()||null;const raw=Number(String(formData.get("discountValue")||"").replace(",","."));const min=Number(formData.get("minNights")||0);const accommodationId=String(formData.get("accommodationId")||"").trim()||null;if(!title)throw new Error("Título obrigatório.");if(discountType&&!["PERCENT","FIXED"].includes(discountType))throw new Error("Tipo de desconto inválido.");if(discountType&&(!Number.isFinite(raw)||raw<=0||(discountType==="PERCENT"&&raw>100)))throw new Error("Valor de desconto inválido.");await prisma.promotion.create({data:{title,description:description||null,coupon,active:true,discountType,discountValue:discountType==="FIXED"?Math.round(raw*100):discountType?Math.round(raw):null,minNights:min>0?Math.floor(min):null,accommodationId,stackable:formData.get("stackable")==="on"}});revalidatePath("/admin/promocoes");revalidatePath("/");}
export async function togglePromotion(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");const row=await prisma.promotion.findUnique({where:{id}});if(row){await prisma.promotion.update({where:{id},data:{active:!row.active}});revalidatePath("/admin/promocoes");revalidatePath("/");}}
export async function deletePromotion(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");if(id){await prisma.promotion.delete({where:{id}});revalidatePath("/admin/promocoes");revalidatePath("/");}}

export async function saveSettings(formData:FormData){await requireAdmin();await prisma.siteSettings.upsert({where:{id:"main"},create:{id:"main",siteName:String(formData.get("siteName")||"Pousada Moriah"),tagline:String(formData.get("tagline")||""),whatsapp:String(formData.get("whatsapp")||"")||null,instagram:String(formData.get("instagram")||"")||null,address:String(formData.get("address")||"")||null},update:{siteName:String(formData.get("siteName")||"Pousada Moriah"),tagline:String(formData.get("tagline")||""),whatsapp:String(formData.get("whatsapp")||"")||null,instagram:String(formData.get("instagram")||"")||null,address:String(formData.get("address")||"")||null}});revalidatePath("/admin/configuracoes");revalidatePath("/");}
export async function createBookingLead(formData:FormData){const publicRequestToken=String(formData.get("publicRequestToken")||"").trim();if(!/^[0-9a-f-]{36}$/i.test(publicRequestToken))throw new Error("Identificador da solicitação inválido.");if(await prisma.bookingLead.findUnique({where:{publicRequestToken},select:{id:true}}))redirect("/reservar/obrigado");const accommodationId=String(formData.get("accommodationId")||"");const room=accommodationId?await prisma.accommodation.findFirst({where:{id:accommodationId,active:true}}):null;if(!room)throw new Error("Selecione uma hospedagem disponível.");const name=String(formData.get("name")||"").trim();const phone=String(formData.get("phone")||"").trim();if(!name||!phone)throw new Error("Nome e WhatsApp são obrigatórios.");const guestsRaw=Number(formData.get("guests")||1);if(!Number.isInteger(guestsRaw)||guestsRaw<1)throw new Error("Número de hóspedes inválido.");const guests=guestsRaw;if(guests>room.capacity)throw new Error("Número de hóspedes excede a capacidade desta hospedagem.");const checkIn=String(formData.get("checkIn")||"");const checkOut=String(formData.get("checkOut")||"");let quote=null as Awaited<ReturnType<typeof quoteAccommodation>>;if(checkIn&&checkOut){const start=new Date(checkIn+"T12:00:00Z"),end=new Date(checkOut+"T12:00:00Z");if(!(start<end))throw new Error("A saída deve ser posterior à entrada.");if(await hasAvailabilityConflict(accommodationId,start,end))redirect("/reservar?indisponivel=1&accommodationId="+encodeURIComponent(accommodationId));quote=await quoteAccommodation(accommodationId,start,end);if(!quote)throw new Error("Não existe tarifa vendável para este período.");const hold=await createInventoryHold(accommodationId,start,end);try{await consumeInventoryHold(hold.token,accommodationId,start,end,tx=>tx.bookingLead.create({data:{publicRequestToken,accommodationId,name,phone,email:String(formData.get("email")||"").trim()||null,checkIn:start,checkOut:end,guests,message:String(formData.get("message")||"").trim()||null,status:"NEW",source:"SITE",quotedTotalCents:quote!.totalCents,quotedCurrency:quote!.currency,quotedRatePlan:quote!.ratePlan,quoteSnapshot:JSON.parse(JSON.stringify(quote)),quotedAt:new Date()}}));}catch(error){await releaseInventoryHold(hold.token);throw error;}}else{throw new Error("Informe entrada e saída.");}revalidatePath("/admin/reservas");redirect("/reservar/obrigado");}
export async function setBookingStatus(formData:FormData){await requireAdmin();const id=String(formData.get("id")||""),status=String(formData.get("status")||"");if(!id||!["NEW","CONTACTED","CONFIRMED","CANCELLED"].includes(status))throw new Error("Status inválido.");if(status==="CONFIRMED"){const pending=await prisma.bookingLead.findUnique({where:{id}});if(!pending?.accommodationId||!pending.checkIn||!pending.checkOut)throw new Error("A reserva precisa ter hospedagem e período antes da confirmação.");if(await criticalAvailabilityCheck(pending.accommodationId,pending.checkIn,pending.checkOut))throw new Error("Conflito de disponibilidade após atualização dos canais.");await prisma.$transaction(async tx=>{const booking=await tx.bookingLead.findUnique({where:{id}});if(!booking?.accommodationId||!booking.checkIn||!booking.checkOut)throw new Error("A reserva precisa ter hospedagem e período antes da confirmação.");await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.accommodationId}))`;const [internal,external,holds,manual]=await Promise.all([
  tx.bookingLead.count({where:{id:{not:id},accommodationId:booking.accommodationId,status:{in:["CONFIRMED","CHECKED_IN"]},checkIn:{lt:booking.checkOut},checkOut:{gt:booking.checkIn}}}),
  tx.channelBlock.count({where:{startsAt:{lt:booking.checkOut},endsAt:{gt:booking.checkIn},integration:{accommodationId:booking.accommodationId,active:true}}}),
  tx.inventoryHold.count({where:{accommodationId:booking.accommodationId,expiresAt:{gt:new Date()},checkIn:{lt:booking.checkOut},checkOut:{gt:booking.checkIn}}}),
  tx.manualInventoryBlock.count({where:{accommodationId:booking.accommodationId,startsAt:{lt:booking.checkOut},endsAt:{gt:booking.checkIn}}})
]);if(internal||external||holds||manual)throw new Error("Conflito de disponibilidade: existe reserva, canal, hold ou bloqueio manual neste período.");await tx.bookingLead.update({where:{id},data:{status:"CONFIRMED"}})});}else{const current=await prisma.bookingLead.findUnique({where:{id},select:{status:true,checkedInAt:true}});if(!current)throw new Error("Reserva não encontrada.");if(current.checkedInAt)throw new Error("Uma hospedagem iniciada deve ser tratada pelo PMS.");await prisma.bookingLead.update({where:{id},data:{status}})}revalidatePath("/admin/reservas");revalidatePath("/reservar");}

export async function toggleAccommodation(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");const item=await prisma.accommodation.findUnique({where:{id}});if(item){await prisma.accommodation.update({where:{id},data:{active:!item.active}});revalidatePath("/admin/hospedagens");revalidatePath("/");}}
export async function deleteAccommodation(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");if(id){await prisma.accommodation.delete({where:{id}});revalidatePath("/admin/hospedagens");revalidatePath("/");}}

export async function updateAccommodation(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)throw new Error("Hospedagem inválida.");
  const data=readAccommodationForm(formData);
  await prisma.accommodation.update({where:{id},data});
  revalidatePath("/admin/hospedagens");
  revalidatePath("/admin/hospedagens/"+id);
  revalidatePath("/reservar");
  revalidatePath("/");
}
export async function addMedia(formData:FormData){
  await requireAdmin();
  const url=String(formData.get("url")||"").trim();
  const alt=String(formData.get("alt")||"").trim().slice(0,300)||null;
  const label=String(formData.get("label")||"").trim().slice(0,160)||null;
  const folder=String(formData.get("folder")||"").trim().slice(0,80)||null;
  if(!/^https?:\/\//i.test(url))throw new Error("URL da imagem inválida.");
  await prisma.media.create({data:{url,alt,label,folder}});
  revalidatePath("/admin/galeria");
  revalidatePath("/admin/midia");
  revalidatePath("/admin/site");
}
export async function deleteMedia(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;

  const row=await prisma.media.findUnique({where:{id}});
  if(!row)return;

  const [
    pageRefs,
    sectionMainRefs,
    sectionGalleryRefs,
    roomCoverRefs,
    roomGalleryRefs,
    blogRefs,
    productRefs,
    categoryRefs,
    menuBannerRefs
  ]=await Promise.all([
    prisma.sitePage.count({where:{ogImage:row.url}}),
    prisma.siteSection.count({where:{imageUrl:row.url}}),
    prisma.siteSection.count({where:{mediaUrls:{has:row.url}}}),
    prisma.accommodation.count({where:{coverImage:row.url}}),
    prisma.accommodation.count({where:{galleryImages:{has:row.url}}}),
    prisma.blogPost.count({where:{coverImage:row.url}}),
    prisma.restaurantProduct.count({where:{imageUrl:row.url}}),
    prisma.restaurantCategory.count({where:{imageUrl:row.url}}),
    prisma.restaurantSettings.count({where:{menuBannerUrl:row.url}})
  ]);

  const references=
    pageRefs+
    sectionMainRefs+
    sectionGalleryRefs+
    roomCoverRefs+
    roomGalleryRefs+
    blogRefs+
    productRefs+
    categoryRefs+
    menuBannerRefs;

  if(references>0){
    throw new Error("Esta imagem está em uso em "+references+" local(is). Troque ou remova a referência antes de excluir o arquivo.");
  }

  if(row.storageKey)await deleteMediaObject(row.storageKey);
  await prisma.media.delete({where:{id}});

  revalidatePath("/admin/galeria");
  revalidatePath("/admin/midia");
  revalidatePath("/admin/site");
  revalidatePath("/");
}

export async function saveFirebaseSettings(formData:FormData){await requireAdmin();const data={firebaseApiKey:String(formData.get("firebaseApiKey")||"").trim()||null,firebaseAuthDomain:String(formData.get("firebaseAuthDomain")||"").trim()||null,firebaseProjectId:String(formData.get("firebaseProjectId")||"").trim()||null,firebaseStorageBucket:String(formData.get("firebaseStorageBucket")||"").trim()||null,firebaseMessagingSenderId:String(formData.get("firebaseMessagingSenderId")||"").trim()||null,firebaseAppId:String(formData.get("firebaseAppId")||"").trim()||null,firebaseVapidKey:String(formData.get("firebaseVapidKey")||"").trim()||null};await prisma.integrationSettings.upsert({where:{id:"main"},update:data,create:{id:"main",...data}});revalidatePath("/admin/integracoes");}

export async function createBlogPost(formData:FormData){await requireAdmin();const title=String(formData.get("title")||"").trim();const slug=String(formData.get("slug")||"").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"");const content=String(formData.get("content")||"").trim();if(!title||!slug||!content)throw new Error("Título, slug e conteúdo são obrigatórios.");const published=formData.get("published")==="on";await prisma.blogPost.create({data:{title,slug,content,excerpt:String(formData.get("excerpt")||"").trim()||null,coverImage:String(formData.get("coverImage")||"").trim()||null,published,publishedAt:published?new Date():null}});revalidatePath("/admin/blog");revalidatePath("/blog");revalidatePath("/");redirect("/admin/blog");}
export async function updateBlogPost(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");const title=String(formData.get("title")||"").trim();const slug=String(formData.get("slug")||"").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"");const content=String(formData.get("content")||"").trim();if(!id||!title||!slug||!content)throw new Error("Título, slug e conteúdo são obrigatórios.");const published=formData.get("published")==="on";const current=await prisma.blogPost.findUnique({where:{id},select:{publishedAt:true}});if(!current)throw new Error("Post não encontrado.");await prisma.blogPost.update({where:{id},data:{title,slug,content,excerpt:String(formData.get("excerpt")||"").trim()||null,coverImage:String(formData.get("coverImage")||"").trim()||null,published,publishedAt:published?(current.publishedAt||new Date()):null}});revalidatePath("/admin/blog");revalidatePath("/blog");revalidatePath("/");redirect("/admin/blog");}
export async function deleteBlogPost(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");if(id){await prisma.blogPost.delete({where:{id}});revalidatePath("/admin/blog");revalidatePath("/blog");}}

export async function createChannelIntegration(formData:FormData){await requireAdmin();const provider=String(formData.get("provider")||"ICAL");const name=String(formData.get("name")||"").trim();const importUrl=String(formData.get("importUrl")||"").trim()||null;const accommodationId=String(formData.get("accommodationId")||"");if(!accommodationId)throw new Error("Selecione a hospedagem do canal.");if(!name)throw new Error("Nome da conexão obrigatório.");if(!["AIRBNB","BOOKING","ICAL"].includes(provider))throw new Error("Canal inválido.");await prisma.channelIntegration.create({data:{provider,integrationType:"ICAL",name,importUrl,accommodationId,exportToken:crypto.randomUUID()}});revalidatePath("/admin/canais");}
export async function toggleChannelIntegration(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");const row=await prisma.channelIntegration.findUnique({where:{id}});if(row){await prisma.channelIntegration.update({where:{id},data:{active:!row.active}});revalidatePath("/admin/canais");}}
export async function deleteChannelIntegration(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");if(id){await prisma.channelBlock.deleteMany({where:{integrationId:id}});await prisma.channelIntegration.delete({where:{id}});revalidatePath("/admin/canais");}}

export async function syncChannelNow(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");if(!id)throw new Error("Canal inválido.");await syncChannelIntegration(id);revalidatePath("/admin/canais");}

export async function saveChatSettings(formData:FormData){await requireAdmin();const temperature=Math.min(1,Math.max(0,Number(formData.get("groqTemperature")||0.2)));const data={chatEnabled:formData.get("chatEnabled")==="on",chatName:String(formData.get("chatName")||"Moriah Assistente").trim().slice(0,80),chatWelcome:String(formData.get("chatWelcome")||"").trim().slice(0,500),chatInstructions:String(formData.get("chatInstructions")||"").trim().slice(0,3000)||null,groqModel:String(formData.get("groqModel")||"llama-3.1-8b-instant").trim().slice(0,100),groqTemperature:Number.isFinite(temperature)?temperature:0.2};await prisma.integrationSettings.upsert({where:{id:"main"},update:data,create:{id:"main",...data}});revalidatePath("/admin/integracoes");revalidatePath("/");}

export async function createRatePlan(formData:FormData){await requireAdmin();const accommodationId=String(formData.get("accommodationId")||"");const name=String(formData.get("name")||"").trim();const price=Number(String(formData.get("basePrice")||"").replace(",","."));const minNights=Number(formData.get("minNights")||1);const maxRaw=Number(formData.get("maxNights")||0);if(!accommodationId||!name||!Number.isFinite(price)||price<0||!Number.isInteger(minNights)||minNights<1||!Number.isInteger(maxRaw)||maxRaw<0||(maxRaw>0&&maxRaw<minNights))throw new Error("Dados da tarifa inválidos.");await prisma.ratePlan.create({data:{accommodationId,name,basePriceCents:Math.round(price*100),minNights,maxNights:maxRaw>0?maxRaw:null}});revalidatePath("/admin/tarifas");}
export async function deleteRatePlan(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");if(id){await prisma.ratePlan.delete({where:{id}});revalidatePath("/admin/tarifas");}}

export async function createRateOverride(formData:FormData){await requireAdmin();const ratePlanId=String(formData.get("ratePlanId")||"");const start=String(formData.get("startsAt")||""),end=String(formData.get("endsAt")||"");const price=Number(String(formData.get("price")||"").replace(",","."));const minRaw=Number(formData.get("minNights")||0);if(!ratePlanId||!start||!end||!Number.isFinite(price)||price<0||!Number.isInteger(minRaw)||minRaw<0)throw new Error("Ajuste tarifário inválido.");const startsAt=new Date(start+"T12:00:00Z"),endsAt=new Date(end+"T12:00:00Z");if(!(startsAt<endsAt))throw new Error("O fim deve ser posterior ao início.");await prisma.rateOverride.create({data:{ratePlanId,startsAt,endsAt,priceCents:Math.round(price*100),minNights:minRaw>0?minRaw:null,closedToArrival:formData.get("closedToArrival")==="on",closedToDeparture:formData.get("closedToDeparture")==="on"}});revalidatePath("/admin/tarifas");}
export async function deleteRateOverride(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");if(id){await prisma.rateOverride.delete({where:{id}});revalidatePath("/admin/tarifas");}}

export async function createRateRule(formData:FormData){await requireAdmin();const accommodationId=String(formData.get("accommodationId")||""),name=String(formData.get("name")||"").trim(),adjustmentType=String(formData.get("adjustmentType")||"PERCENT"),raw=Number(formData.get("adjustmentValue")||0);if(!accommodationId||!name||!["PERCENT","FIXED"].includes(adjustmentType)||!Number.isFinite(raw))throw new Error("Regra dinâmica inválida.");const num=(key:string)=>{const v=String(formData.get(key)||"").trim();if(v==="")return null;const n=Number(v);if(!Number.isFinite(n))throw new Error("Valor numérico inválido.");return n};const minOcc=num("minOccupancyPct"),maxOcc=num("maxOccupancyPct"),minDays=num("daysBeforeMin"),maxDays=num("daysBeforeMax"),priority=num("priority")??100;if((minOcc!=null&&(minOcc<0||minOcc>100))||(maxOcc!=null&&(maxOcc<0||maxOcc>100))||(minOcc!=null&&maxOcc!=null&&minOcc>maxOcc)||(minDays!=null&&minDays<0)||(maxDays!=null&&maxDays<0)||(minDays!=null&&maxDays!=null&&minDays>maxDays))throw new Error("Faixas da regra dinâmica são inválidas.");const starts=String(formData.get("startsAt")||""),ends=String(formData.get("endsAt")||"");const startsAt=starts?new Date(starts+"T00:00:00Z"):null,endsAt=ends?new Date(ends+"T23:59:59Z"):null;if(startsAt&&endsAt&&startsAt>endsAt)throw new Error("Período da regra inválido.");await prisma.rateRule.create({data:{accommodationId,name,adjustmentType,adjustmentValue:adjustmentType==="FIXED"?Math.round(raw*100):Math.round(raw),minOccupancyPct:minOcc==null?null:Math.round(minOcc),maxOccupancyPct:maxOcc==null?null:Math.round(maxOcc),daysBeforeMin:minDays==null?null:Math.round(minDays),daysBeforeMax:maxDays==null?null:Math.round(maxDays),startsAt,endsAt,priority:Math.round(priority)}});revalidatePath("/admin/tarifas");revalidatePath("/admin/preco-dinamico");}
export async function deleteRateRule(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");if(id){await prisma.rateRule.delete({where:{id}});revalidatePath("/admin/tarifas");revalidatePath("/admin/preco-dinamico");}}

function readCheckInFinance(formData:FormData){
  type RawExtra={description?:unknown;amount?:unknown};

  let parsed:unknown=[];
  const rawExtras=String(formData.get("checkInExtras")||"[]");
  try{
    parsed=JSON.parse(rawExtras);
  }catch{
    throw new Error("Adicionais do check-in inválidos.");
  }

  if(!Array.isArray(parsed)||parsed.length>30){
    throw new Error("Quantidade de adicionais inválida.");
  }

  const extras=parsed.flatMap((raw,index)=>{
    if(!raw||typeof raw!=="object")throw new Error("Adicional inválido na posição "+(index+1)+".");
    const item=raw as RawExtra;
    const description=typeof item.description==="string"
      ?item.description.trim().slice(0,160)
      :"";
    const amountRaw=typeof item.amount==="string"||typeof item.amount==="number"
      ?String(item.amount).trim().replace(",",".")
      :"";

    if(!description&&!amountRaw)return [];
    const amount=Number(amountRaw);
    if(!description||!Number.isFinite(amount)||amount<=0||amount>1_000_000){
      throw new Error("Preencha descrição e valor válido para todos os adicionais.");
    }

    return [{
      description,
      amountCents:Math.round(amount*100)
    }];
  });

  const paymentMethod=String(formData.get("paymentMethod")||"PENDING").toUpperCase();
  const allowedMethods=new Set(["PENDING","PIX","CARD","CASH","TRANSFER","EXTERNAL"]);
  if(!allowedMethods.has(paymentMethod))throw new Error("Forma de pagamento inválida.");

  const paymentRaw=String(formData.get("paymentAmount")||"").trim().replace(",",".");
  const paymentValue=paymentRaw?Number(paymentRaw):0;
  if(!Number.isFinite(paymentValue)||paymentValue<0||paymentValue>1_000_000){
    throw new Error("Valor pago inválido.");
  }
  const paymentAmountCents=Math.round(paymentValue*100);

  if(paymentMethod==="PENDING"&&paymentAmountCents>0){
    throw new Error("Escolha uma forma de pagamento para registrar valor recebido.");
  }
  if(paymentMethod==="EXTERNAL"&&paymentAmountCents<=0){
    throw new Error("Informe o valor já pago externamente.");
  }

  const externalReference=String(formData.get("externalReference")||"")
    .trim()
    .slice(0,240)||null;

  return {
    extras,
    extrasTotalCents:extras.reduce((sum,item)=>sum+item.amountCents,0),
    paymentMethod,
    paymentAmountCents,
    externalReference
  };
}

export async function pmsBookingAction(formData:FormData){
  await requireAdmin();
  const id=String(formData.get("id")||"");
  const action=String(formData.get("action")||"");
  if(!id)throw new Error("Reserva inválida.");

  if(action==="CHECK_IN"){
    const finance=readCheckInFinance(formData);

    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;

      const booking=await tx.bookingLead.findUnique({
        where:{id},
        select:{
          id:true,
          name:true,
          phone:true,
          email:true,
          guestId:true,
          status:true,
          checkedInAt:true,
          quotedTotalCents:true
        }
      });
      if(!booking||booking.status!=="CONFIRMED"||booking.checkedInAt){
        throw new Error("Reserva não está disponível para check-in.");
      }

      const existingPaid=await tx.payment.aggregate({
        where:{bookingId:id,status:"PAID"},
        _sum:{amountCents:true}
      });

      const accountTotalCents=
        (booking.quotedTotalCents||0)+
        finance.extrasTotalCents;
      const paidBefore=existingPaid._sum.amountCents||0;
      const dueBeforeCheckIn=Math.max(0,accountTotalCents-paidBefore);

      if(finance.paymentAmountCents>dueBeforeCheckIn){
        throw new Error("O valor recebido no check-in é maior que o saldo da conta.");
      }

      const claimed=await tx.bookingLead.updateMany({
        where:{id,status:"CONFIRMED",checkedInAt:null},
        data:{
          checkedInAt:new Date(),
          status:"CHECKED_IN",
          restaurantAccessToken:crypto.randomUUID()
        }
      });
      if(claimed.count!==1)throw new Error("Reserva não está disponível para check-in.");

      if(finance.extras.length){
        await tx.bookingCharge.createMany({
          data:finance.extras.map(extra=>({
            bookingId:id,
            description:extra.description,
            amountCents:extra.amountCents,
            category:"CHECKIN_EXTRA"
          }))
        });
      }

      if(finance.paymentAmountCents>0){
        await tx.payment.create({
          data:{
            bookingId:id,
            amountCents:finance.paymentAmountCents,
            method:finance.paymentMethod,
            source:finance.paymentMethod==="EXTERNAL"?"EXTERNAL":"CHECK_IN",
            reference:finance.externalReference
          }
        });
      }

      if(!booking.guestId){
        let guest=await tx.guest.findFirst({
          where:{name:booking.name,phone:booking.phone}
        });
        if(!guest){
          guest=await tx.guest.create({
            data:{
              name:booking.name,
              phone:booking.phone,
              email:booking.email||null
            }
          });
        }
        await tx.bookingLead.update({
          where:{id},
          data:{guestId:guest.id}
        });
      }

      await tx.bookingAuditLog.create({
        data:{
          bookingId:id,
          action:"CHECK_IN",
          details:{
            lodgingCents:booking.quotedTotalCents||0,
            extrasTotalCents:finance.extrasTotalCents,
            accountTotalCents,
            paidBeforeCents:paidBefore,
            checkInPaymentCents:finance.paymentAmountCents,
            paymentMethod:finance.paymentMethod,
            paymentSource:finance.paymentMethod==="EXTERNAL"?"EXTERNAL":"CHECK_IN",
            extras:finance.extras
          }
        }
      });
    });
  }else if(action==="CHECK_OUT"){
    await prisma.$transaction(async tx=>{
      const open=await tx.restaurantRoomCharge.count({
        where:{bookingId:id,status:{in:["OPEN","SETTLING"]}}
      });
      if(open>0)throw new Error("Existe consumo do restaurante em aberto. Feche o consumo antes do check-out.");

      const booking=await tx.bookingLead.findUnique({
        where:{id},
        select:{accommodationId:true}
      });
      if(!booking)throw new Error("Reserva não encontrada.");

      const claimed=await tx.bookingLead.updateMany({
        where:{id,status:"CHECKED_IN",checkedOutAt:null},
        data:{checkedOutAt:new Date(),status:"CHECKED_OUT",restaurantAccessToken:null}
      });
      if(claimed.count!==1)throw new Error("Reserva não está disponível para check-out.");

      if(booking.accommodationId){
        await tx.housekeepingTask.create({
          data:{
            accommodationId:booking.accommodationId,
            bookingId:id,
            scheduledFor:new Date(),
            type:"CLEANING"
          }
        });
      }

      await tx.bookingAuditLog.create({
        data:{bookingId:id,action:"CHECK_OUT"}
      });
    });
  }else if(action==="NO_SHOW"){
    await prisma.$transaction(async tx=>{
      const claimed=await tx.bookingLead.updateMany({
        where:{id,status:"CONFIRMED",checkedInAt:null,noShowAt:null},
        data:{noShowAt:new Date(),status:"NO_SHOW",restaurantAccessToken:null}
      });
      if(claimed.count!==1)throw new Error("Reserva não está disponível para no-show.");
      await tx.bookingAuditLog.create({
        data:{bookingId:id,action:"NO_SHOW"}
      });
    });
  }else{
    throw new Error("Ação PMS inválida.");
  }

  revalidatePath("/admin/reservas");
  revalidatePath("/admin/reservas/"+id);
  revalidatePath("/admin/pms");
  revalidatePath("/admin/hospedes");
}

export async function settleRestaurantFolio(formData:FormData){await requireAdmin();const bookingId=String(formData.get("bookingId")||"");const method=String(formData.get("method")||"ROOM_SETTLEMENT");if(!bookingId||!["ROOM_SETTLEMENT","CASH","CARD","PIX","TRANSFER"].includes(method))throw new Error("Liquidação inválida.");await prisma.$transaction(async tx=>{const booking=await tx.bookingLead.findUnique({where:{id:bookingId},select:{id:true}});if(!booking)throw new Error("Hospedagem não encontrada.");const claimed=await tx.restaurantRoomCharge.updateMany({where:{bookingId,status:"OPEN"},data:{status:"SETTLING"}});if(claimed.count===0)return;const charges=await tx.restaurantRoomCharge.findMany({where:{bookingId,status:"SETTLING"}});const total=charges.reduce((s,x)=>s+x.amountCents,0);if(total<=0)throw new Error("Consumo inválido.");await tx.payment.create({data:{bookingId,amountCents:total,method,reference:"RESTAURANT_FOLIO"}});await tx.restaurantRoomCharge.updateMany({where:{bookingId,status:"SETTLING"},data:{status:"SETTLED",settledAt:new Date()}});await tx.restaurantOrder.updateMany({where:{bookingId,paymentMethod:"ROOM",paymentStatus:"ROOM_FOLIO"},data:{paymentStatus:"PAID"}});await tx.bookingAuditLog.create({data:{bookingId,action:"RESTAURANT_FOLIO_SETTLED",details:{amountCents:total,method,charges:claimed.count}}})});revalidatePath("/admin/pms");}
export async function registerPayment(formData:FormData){
  await requireAdmin();

  const bookingId=String(formData.get("bookingId")||"");
  const amount=Number(String(formData.get("amount")||"").replace(",","."));
  const method=String(formData.get("method")||"PIX").toUpperCase();
  const reference=String(formData.get("reference")||"").trim().slice(0,240)||null;
  const allowed=new Set(["PIX","CARD","CASH","TRANSFER","EXTERNAL","ROOM_SETTLEMENT"]);

  if(!bookingId||!Number.isFinite(amount)||amount<=0||!allowed.has(method)){
    throw new Error("Pagamento inválido.");
  }

  const amountCents=Math.round(amount*100);

  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${bookingId}))`;

    const booking=await tx.bookingLead.findUnique({
      where:{id:bookingId},
      select:{
        quotedTotalCents:true,
        charges:{select:{amountCents:true}},
        payments:{where:{status:"PAID"},select:{amountCents:true}}
      }
    });
    if(!booking)throw new Error("Reserva não encontrada.");

    const total=
      (booking.quotedTotalCents||0)+
      booking.charges.reduce((sum,charge)=>sum+charge.amountCents,0);
    const paid=booking.payments.reduce((sum,payment)=>sum+payment.amountCents,0);
    const balance=Math.max(0,total-paid);

    if(amountCents>balance){
      throw new Error("O pagamento informado é maior que o saldo da conta.");
    }

    const source=method==="EXTERNAL"?"EXTERNAL":"MANUAL";
    await tx.payment.create({
      data:{
        bookingId,
        amountCents,
        method,
        source,
        reference
      }
    });
    await tx.bookingAuditLog.create({
      data:{
        bookingId,
        action:"PAYMENT",
        details:{amountCents,method,source,reference}
      }
    });
  });

  revalidatePath("/admin/pms");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/reservas/"+bookingId);
}
export async function updateHousekeeping(formData:FormData){await requireAdmin();const id=String(formData.get("id")||"");const status=String(formData.get("status")||"");if(!["PENDING","IN_PROGRESS","DONE"].includes(status))throw new Error("Status inválido.");await prisma.housekeepingTask.update({where:{id},data:{status}});revalidatePath("/admin/pms");}
