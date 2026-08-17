"use client";

import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import { usePedidosActivos } from "@/lib/usePedidosActivos";
import { PedidoCardMobile } from "./PedidoCardMobile";
import { BannerNotificaciones } from "./BannerNotificaciones";

export function PedidosAdminMobile({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const { pedidos, avanzar } = usePedidosActivos(pedidosIniciales);

  return (
    <div className="flex flex-col gap-3">
      <BannerNotificaciones />
      {pedidos.length === 0 ? (
        <p className="text-sm text-brand-black/60">No hay pedidos activos.</p>
      ) : (
        pedidos.map((pedido) => (
          <PedidoCardMobile key={pedido.id} pedido={pedido} onAvanzar={() => avanzar(pedido)} />
        ))
      )}
    </div>
  );
}
