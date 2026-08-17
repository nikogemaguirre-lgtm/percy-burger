"use client";

import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import { useEsMobil } from "@/lib/useEsMobil";
import { PedidosAdminDesktop } from "./PedidosAdminDesktop";
import { PedidosAdminMobile } from "./PedidosAdminMobile";

export function PedidosAdmin({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const esMobil = useEsMobil();
  return esMobil ? (
    <PedidosAdminMobile pedidosIniciales={pedidosIniciales} />
  ) : (
    <PedidosAdminDesktop pedidosIniciales={pedidosIniciales} />
  );
}
