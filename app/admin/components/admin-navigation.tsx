"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {
  BarChart3,
  BedDouble,
  Bell,
  BookOpen,
  CalendarDays,
  ChefHat,
  Gauge,
  Image,
  Images,
  LayoutDashboard,
  Megaphone,
  Plug,
  ReceiptText,
  Settings,
  Sparkles,
  Tags,
  Users,
  UtensilsCrossed,
  WalletCards
} from "lucide-react";

const sections=[
  {
    label:"OPERAÇÃO",
    items:[
      ["Visão geral","/admin",LayoutDashboard],
      ["Reservas","/admin/reservas",CalendarDays],
      ["Hóspedes","/admin/hospedes",Users],
      ["PMS / Front Desk","/admin/pms",BedDouble],
      ["Mapa de Reservas","/admin/canais/calendario",CalendarDays],
      ["Hospedagens","/admin/hospedagens",BedDouble],
      ["Canais","/admin/canais",Plug]
    ]
  },
  {
    label:"RECEITA",
    items:[
      ["Tarifas","/admin/tarifas",WalletCards],
      ["Preço dinâmico","/admin/preco-dinamico",Gauge],
      ["Promoções","/admin/promocoes",Megaphone]
    ]
  },
  {
    label:"MORIAH FOOD",
    items:[
      ["Restaurante","/admin/restaurante",UtensilsCrossed],
      ["Cardápio Studio","/admin/restaurante/cardapio",BookOpen],
      ["Pedidos / Cozinha","/admin/restaurante/pedidos",ChefHat],
      ["Adicionais","/admin/restaurante/adicionais",Tags],
      ["Insumos / CMV","/admin/restaurante/insumos",ReceiptText],
      ["Inteligência","/admin/restaurante/inteligencia",BarChart3]
    ]
  },
  {
    label:"CONTEÚDO",
    items:[
      ["Editor do site","/admin/site",LayoutDashboard],
      ["Galeria","/admin/galeria",Images],
      ["Mídia","/admin/midia",Image],
      ["Blog","/admin/blog",BookOpen]
    ]
  },
  {
    label:"SISTEMA",
    items:[
      ["Integrações","/admin/integracoes",Plug],
      ["Configurações","/admin/configuracoes",Settings],
      ["Notificações","/admin/notificacoes",Bell]
    ]
  }
] as const;

function active(pathname:string,href:string){
  if(href==="/admin") return pathname==="/admin";
  return pathname===href || pathname.startsWith(href+"/");
}

export default function AdminNavigation({superAdmin}:{superAdmin:boolean}){
  const pathname=usePathname();
  return <nav className="adminNav" aria-label="Navegação administrativa">
    {sections.map(section=><div className="adminNavSection" key={section.label}>
      <div className="adminNavLabel">{section.label}</div>
      <div className="adminNavItems">
        {section.items.map(([label,href,Icon])=><Link
          key={href}
          href={href}
          className={"adminNavLink"+(active(pathname,href)?" isActive":"")}
          aria-current={active(pathname,href)?"page":undefined}
        >
          <Icon size={15} strokeWidth={1.8}/>
          <span>{label}</span>
          <b>↗</b>
        </Link>)}
      </div>
    </div>)}
    {superAdmin&&<div className="adminNavSection adminNavSuperSection">
      <div className="adminNavLabel">ACESSO</div>
      <Link href="/admin/usuarios" className={"adminNavLink adminSuper"+(active(pathname,"/admin/usuarios")?" isActive":"")}>
        <Users size={15} strokeWidth={1.8}/>
        <span>Super Admin</span>
        <Sparkles size={13}/>
      </Link>
    </div>}
  </nav>;
}
