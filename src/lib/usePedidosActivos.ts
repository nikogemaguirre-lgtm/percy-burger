import { useEffect, useState } from "react";
import type { PedidoConItems } from "./pedidos-mapeo";
import { obtenerPedidosActivosCliente, avanzarEstadoPedido } from "./pedidos-admin-cliente";

const INTERVALO_REFRESCO_MS = 15000;

export function usePedidosActivos(pedidosIniciales: PedidoConItems[], activo: boolean = true) {
  const [pedidos, setPedidos] = useState<PedidoConItems[]>(pedidosIniciales);

  useEffect(() => {
    if (!activo) return;
    obtenerPedidosActivosCliente().then(setPedidos);
    const intervalo = setInterval(() => {
      obtenerPedidosActivosCliente().then(setPedidos);
    }, INTERVALO_REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [activo]);

  async function avanzar(pedido: PedidoConItems) {
    await avanzarEstadoPedido(pedido.id, pedido.estado);
    const actualizados = await obtenerPedidosActivosCliente();
    setPedidos(actualizados);
  }

  return { pedidos, avanzar };
}
