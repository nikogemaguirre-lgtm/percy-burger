"use client";

import { useEffect, useState } from "react";
import type { PedidoConItems } from "@/lib/pedidos-mapeo";
import {
  obtenerPedidosActivosCliente,
  obtenerPedidosEntregadosCliente,
  avanzarEstadoPedido,
  suscribirsePedidos,
} from "@/lib/pedidos-admin-cliente";
import { PedidoCard } from "./PedidoCard";

type Vista = "activos" | "historial";

export function PedidosAdmin({ pedidosIniciales }: { pedidosIniciales: PedidoConItems[] }) {
  const [vista, setVista] = useState<Vista>("activos");
  const [pedidos, setPedidos] = useState<PedidoConItems[]>(pedidosIniciales);

  useEffect(() => {
    if (vista === "activos") {
      obtenerPedidosActivosCliente().then(setPedidos);
    } else {
      obtenerPedidosEntregadosCliente().then(setPedidos);
    }
  }, [vista]);

  useEffect(() => {
    if (vista !== "activos") return;
    const cancelar = suscribirsePedidos(() => {
      obtenerPedidosActivosCliente().then(setPedidos);
    });
    return cancelar;
  }, [vista]);

  async function manejarAvanzar(pedido: PedidoConItems) {
    await avanzarEstadoPedido(pedido.id, pedido.estado);
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
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

      {pedidos.length === 0 ? (
        <p className="text-sm text-brand-black/60">
          {vista === "activos" ? "No hay pedidos activos." : "Todavía no hay pedidos entregados."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pedidos.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              onAvanzar={vista === "activos" ? () => manejarAvanzar(pedido) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
