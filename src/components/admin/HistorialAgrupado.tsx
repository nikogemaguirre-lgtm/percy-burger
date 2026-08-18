import type { ReactNode } from "react";
import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import type { GrupoHistorial } from "@/lib/historial-mapeo";
import { formatearPrecio } from "@/lib/formato-pedido";

export function HistorialAgrupado({
  grupos,
  renderPedido,
}: {
  grupos: GrupoHistorial[];
  renderPedido: (pedido: PedidoConItems) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <div key={grupo.etiqueta} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between border-b border-brand-black/10 pb-1">
            <h3 className="text-sm font-semibold text-brand-black/70">{grupo.etiqueta}</h3>
            <span className="text-sm font-semibold text-brand-black/70">{formatearPrecio(grupo.total)}</span>
          </div>
          <div className="flex flex-col gap-3">{grupo.pedidos.map(renderPedido)}</div>
        </div>
      ))}
    </div>
  );
}
