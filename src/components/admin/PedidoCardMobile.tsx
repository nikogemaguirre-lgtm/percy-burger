"use client";

import { useState } from "react";
import { COLOR_ESTADO, ETIQUETAS_ESTADO, PedidoConItems, siguienteEstado } from "@/lib/pedidos-mapeo";
import { formatearPrecio, formatearHora } from "@/lib/formato-pedido";

export function PedidoCardMobile({
  pedido,
  onAvanzar,
}: {
  pedido: PedidoConItems;
  onAvanzar: () => Promise<void>;
}) {
  const [avanzando, setAvanzando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proximoEstado = siguienteEstado(pedido.estado);

  async function manejarAvanzar() {
    setAvanzando(true);
    setError(null);
    try {
      await onAvanzar();
    } catch {
      setError("No pudimos actualizar el estado. Probá de nuevo.");
    } finally {
      setAvanzando(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-black/10 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold text-brand-black">{pedido.clienteNombre}</p>
          <p className="text-base text-brand-black/60">{pedido.clienteTelefono}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${COLOR_ESTADO[pedido.estado]}`}>
          {ETIQUETAS_ESTADO[pedido.estado]}
        </span>
      </div>

      <p className="mb-3 text-base text-brand-black/70">
        {pedido.modalidad === "retiro"
          ? "Retiro en el local"
          : pedido.aCoordinar
            ? `Delivery a coordinar — ${pedido.direccion}`
            : `Delivery a ${pedido.direccion} (${pedido.zonaNombre})`}
      </p>

      <ul className="mb-3 flex flex-col gap-1.5 text-base">
        {pedido.items.map((item, indice) => (
          <li key={indice}>
            {item.cantidad}x {item.nombre} — {formatearPrecio(item.precioUnitario * item.cantidad)}
            {item.nota && <span className="text-brand-black/60"> ({item.nota})</span>}
          </li>
        ))}
      </ul>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-brand-black/60">{formatearHora(pedido.creadoEn)}</span>
        <span className="text-lg font-bold text-brand-orange-burnt">{formatearPrecio(pedido.total)}</span>
      </div>

      {error && <p className="mb-2 text-sm text-brand-red">{error}</p>}

      {proximoEstado && (
        <button
          type="button"
          onClick={manejarAvanzar}
          disabled={avanzando}
          className="w-full rounded-lg bg-brand-red px-4 py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          Siguiente: {ETIQUETAS_ESTADO[proximoEstado]}
        </button>
      )}
    </div>
  );
}
