import { formatearPrecio } from "./formato-pedido";

export interface PedidoPushInfo {
  clienteNombre: string;
  total: number;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export function armarPayloadPush(pedido: PedidoPushInfo): PushPayload {
  return {
    title: "Pedido nuevo",
    body: `${pedido.clienteNombre} — ${formatearPrecio(pedido.total)}`,
    url: "/admin/pedidos",
  };
}

export interface ResultadoEnvioPush {
  endpoint: string;
  statusCode: number | null;
}

export function endpointsInvalidos(resultados: ResultadoEnvioPush[]): string[] {
  return resultados
    .filter((resultado) => resultado.statusCode === 404 || resultado.statusCode === 410)
    .map((resultado) => resultado.endpoint);
}
