"use client";

import { useEffect, useState } from "react";
import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import { obtenerPedidosEntregadosCliente } from "@/lib/pedidos-admin-cliente";
import { usePedidosActivos } from "@/lib/usePedidosActivos";
import { agruparHistorial } from "@/lib/historial-mapeo";
import { PedidoCardMobile } from "./PedidoCardMobile";
import { BannerNotificaciones } from "./BannerNotificaciones";
import { HistorialAgrupado } from "./HistorialAgrupado";

type Vista = "activos" | "historial";

export function PedidosAdminMobile({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const [vista, setVista] = useState<Vista>("activos");
  const { pedidos: activos, avanzar } = usePedidosActivos(pedidosIniciales, vista === "activos");
  const [historial, setHistorial] = useState<PedidoConItems[]>([]);

  useEffect(() => {
    if (vista === "historial") {
      obtenerPedidosEntregadosCliente().then(setHistorial);
    }
  }, [vista]);

  return (
    <div className="flex flex-col gap-3">
      <BannerNotificaciones />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setVista("activos")}
          className={`rounded-md px-3 py-1 text-sm font-semibold ${
            vista === "activos" ? "bg-brand-orange text-white" : "text-brand-black/70"
          }`}
        >
          Activos
        </button>
        <button
          type="button"
          onClick={() => setVista("historial")}
          className={`rounded-md px-3 py-1 text-sm font-semibold ${
            vista === "historial" ? "bg-brand-orange text-white" : "text-brand-black/70"
          }`}
        >
          Historial
        </button>
      </div>

      {vista === "activos" ? (
        activos.length === 0 ? (
          <p className="text-sm text-brand-black/60">No hay pedidos activos.</p>
        ) : (
          activos.map((pedido) => (
            <PedidoCardMobile key={pedido.id} pedido={pedido} onAvanzar={() => avanzar(pedido)} />
          ))
        )
      ) : historial.length === 0 ? (
        <p className="text-sm text-brand-black/60">Todavía no hay pedidos entregados.</p>
      ) : (
        <HistorialAgrupado
          grupos={agruparHistorial(historial)}
          renderPedido={(pedido) => <PedidoCardMobile key={pedido.id} pedido={pedido} />}
        />
      )}
    </div>
  );
}
