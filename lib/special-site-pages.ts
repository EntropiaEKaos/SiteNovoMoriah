import {prisma} from "./prisma";

export type SpecialSection={
  type:string; eyebrow:string|null; title:string|null; subtitle:string|null; body:string|null;
  imageUrl:string|null; ctaLabel:string|null; ctaHref:string|null;
  secondaryCtaLabel:string|null; secondaryCtaHref:string|null; anchorId:string|null;
  backgroundColor:string|null; textColor:string|null; theme:string; layout:string;
  sortOrder:number; active:boolean;
};

type PageSeed={slug:string;title:string;description:string;seoTitle:string;seoDescription:string;navLabel:string;showInNav:boolean;sections:SpecialSection[]};

const s=(v:Partial<SpecialSection>&Pick<SpecialSection,"type"|"sortOrder">):SpecialSection=>({
  eyebrow:null,title:null,subtitle:null,body:null,imageUrl:null,ctaLabel:null,ctaHref:null,
  secondaryCtaLabel:null,secondaryCtaHref:null,anchorId:null,backgroundColor:null,textColor:null,
  theme:"LIGHT",layout:"DEFAULT",active:true,...v
});

export const restaurantVisualSeed:PageSeed={
  slug:"restaurante-visual",
  title:"Site do Restaurante Moriah",
  description:"Identidade e conteúdo visual do restaurante standalone.",
  seoTitle:"Restaurante Moriah | Peça online",
  seoDescription:"Cardápio, pedidos e atendimento do Restaurante Moriah.",
  navLabel:"Restaurante",showInNav:false,
  sections:[
    s({type:"HERO",sortOrder:10,anchorId:"inicio",theme:"DARK",layout:"SPLIT",eyebrow:"RESTAURANTE MORIAH • PEDIDOS ONLINE",title:"Comida de verdade. Pedido fácil.",subtitle:"Um restaurante independente na experiência, conectado ao mesmo motor de cozinha, estoque e atendimento da Moriah.",body:"Escolha seus favoritos, personalize o pedido e envie direto para nossa cozinha.",ctaLabel:"Ver cardápio",ctaHref:"#cardapio",secondaryCtaLabel:"Falar no WhatsApp",secondaryCtaHref:"https://wa.me/5511978492432"}),
    s({type:"FEATURES",sortOrder:20,anchorId:"diferenciais",theme:"SOFT",layout:"CARDS",eyebrow:"DO PEDIDO À COZINHA",title:"Rápido, simples e conectado.",body:"Pedido online | Escolha, personalize e envie em poucos passos.\nCozinha integrada | O pedido entra no mesmo KDS usado pela operação.\nEstoque em tempo real | Itens e adicionais respeitam disponibilidade.\nPagamento flexível | PIX, cartão ou dinheiro."}),
    s({type:"CTA",sortOrder:30,anchorId:"final",theme:"YELLOW",layout:"CENTERED",eyebrow:"RESTAURANTE MORIAH",title:"Seu próximo pedido começa aqui.",subtitle:"Cardápio atualizado, adicionais e disponibilidade conectados à nossa operação.",ctaLabel:"Voltar ao cardápio",ctaHref:"#cardapio"})
  ]
};

export const corporateSeed:PageSeed={
  slug:"corporativo",
  title:"Moriah Corporativo",
  description:"Café da manhã corporativo entregue diretamente em obras e equipes.",
  seoTitle:"Café da manhã para sua obra | Restaurante Moriah",
  seoDescription:"Café da manhã corporativo com entrega, atendimento, suco e recolhimento para equipes e obras.",
  navLabel:"Corporativo",showInNav:false,
  sections:[
    s({type:"HERO",sortOrder:10,anchorId:"inicio",theme:"DARK",layout:"SPLIT",eyebrow:"RESTAURANTE MORIAH • CORPORATIVO",title:"Café da manhã para sua obra.",subtitle:"Mais produtividade, energia e valorização para sua equipe.",body:"Quem começa o dia bem, produz melhor. A Moriah cuida da alimentação para sua equipe começar o expediente com energia e organização.",ctaLabel:"Solicitar proposta",ctaHref:"https://wa.me/5511978492432"}),
    s({type:"FEATURES",sortOrder:20,anchorId:"como-funciona",theme:"LIGHT",layout:"CARDS",eyebrow:"PRATICIDADE DO INÍCIO AO FIM",title:"Você cuida da obra. A gente cuida do café.",subtitle:"Entrega, serviço e recolhimento com pontualidade, higiene e organização.",body:"01 • Entrega na obra | Chegamos no horário combinado, diretamente no canteiro, com tudo organizado e pronto para servir.\n02 • Café da manhã fresquinho | Pão com manteiga e mortadela de qualidade, preparados com cuidado.\n03 • Atendimento para toda a equipe | Serviço ágil para atender os colaboradores sem atrasar o início das atividades.\n04 • Suco gelado para todos | Uma entrega completa e um gesto de valorização que faz diferença."}),
    s({type:"STATS",sortOrder:30,anchorId:"beneficios",theme:"SOFT",layout:"WIDE",eyebrow:"RESULTADO PARA A OPERAÇÃO",title:"Mais motivação e rendimento.",body:"Equipe valorizada | Mais disposição e comprometimento.\nEconomia de tempo | Sem deslocamento para buscar alimentação.\nOrganização | Serviço estruturado e recolhimento das embalagens.\nCusto-benefício | Solução completa com preço por pessoa.\nValorização | Benefício tangível para os colaboradores.\nAgilidade | Processo que se adapta à rotina da obra."}),
    s({type:"TESTIMONIALS",sortOrder:40,anchorId:"mensagem",theme:"DARK",layout:"CENTERED",eyebrow:"MORIAH CORPORATIVO",title:"Equipe valorizada trabalha com mais produtividade.",body:"O café da manhã na obra não é apenas uma refeição: é uma forma prática de melhorar a experiência da equipe logo no início do expediente."}),
    s({type:"CTA",sortOrder:50,anchorId:"proposta",theme:"YELLOW",layout:"SPLIT",eyebrow:"PLANO CORPORATIVO",title:"Leve essa experiência para sua obra.",subtitle:"R$ 11,80 por pessoa",body:"Café da manhã entregue | Diretamente na obra, no horário combinado.\nPão com manteiga e mortadela | Preparados fresquinhos.\nRecolhimento | Retiramos as embalagens após o serviço.\nSuco gelado | Para toda a equipe.",ctaLabel:"Falar no WhatsApp",ctaHref:"https://wa.me/5511978492432"})
  ]
};

export async function ensureSpecialPage(seed:PageSeed){
  const existing=await prisma.sitePage.findUnique({where:{slug:seed.slug},include:{sections:true}});
  if(existing)return existing;
  return prisma.sitePage.create({
    data:{
      slug:seed.slug,title:seed.title,description:seed.description,seoTitle:seed.seoTitle,seoDescription:seed.seoDescription,
      navLabel:seed.navLabel,showInNav:seed.showInNav,published:true,
      sections:{create:seed.sections.map(item=>({
        type:item.type,eyebrow:item.eyebrow,title:item.title,subtitle:item.subtitle,body:item.body,imageUrl:item.imageUrl,
        ctaLabel:item.ctaLabel,ctaHref:item.ctaHref,secondaryCtaLabel:item.secondaryCtaLabel,secondaryCtaHref:item.secondaryCtaHref,
        anchorId:item.anchorId,backgroundColor:item.backgroundColor,textColor:item.textColor,theme:item.theme,layout:item.layout,
        sortOrder:item.sortOrder,active:item.active
      }))}
    },
    include:{sections:true}
  });
}

export async function loadSpecialSections(slug:string,fallback:SpecialSection[]){
  const page=await prisma.sitePage.findUnique({
    where:{slug},
    include:{sections:{where:{active:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}}
  });
  return {page,sections:page?.sections?.length?page.sections:fallback};
}
