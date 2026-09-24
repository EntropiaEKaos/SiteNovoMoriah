import Link from "next/link";

const links=[
  ["KDS","/admin/restaurante/pedidos"],
  ["Expedição","/admin/restaurante/cozinha/expedicao"],
  ["Estações","/admin/restaurante/cozinha/estacoes"],
  ["Produção","/admin/restaurante/cozinha/producao"],
  ["Disponibilidade","/admin/restaurante/cozinha/disponibilidade"],
  ["Painel","/admin/restaurante/cozinha/painel"],
  ["Auditoria","/admin/restaurante/cozinha/auditoria"]
] as const;

export default function KitchenNav({active}:{active?:string}){
  return <nav className="kitchenNav" aria-label="Moriah Kitchen 4.0">
    {links.map(([label,href])=><Link
      key={href}
      href={href}
      className={active===href?"isActive":undefined}
    >{label}</Link>)}
  </nav>;
}
