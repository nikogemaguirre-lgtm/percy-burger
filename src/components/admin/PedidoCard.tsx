"use client";

import { useState } from "react";
import { EstadoPedido, ETIQUETAS_ESTADO, PedidoConItems, siguienteEstado } from "@/lib/pedidos-mapeo";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function formatearHora(creadoEn: string): string {
  return new Date(creadoEn).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  nuevo: "bg-brand-red text-white",
  en_preparacion: "bg-brand-orange text-white",
  listo: "bg-brand-yellow text-brand-black",
  entregado: "bg-brand-black/10 text-brand-black/70",
};

export function PedidoCard({
  pedido,
  onAvanzar,
}: {
  pedido: PedidoConItems;
  onAvanzar?: () => Promise<void>;
}) {
  const [avanzando, setAvanzando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proximoEstado = siguienteEstado(pedido.estado);

  async function manejarAvanzar() {
    if (!onAvanzar) return;
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
    <div className="rounded-lg border border-brand-black/10 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-semibold text-brand-black">{pedido.clienteNombre}</p>
          <p className="text-sm text-brand-black/60">{pedido.clienteTelefono}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COLOR_ESTADO[pedido.estado]}`}>
          {ETIQUETAS_ESTADO[pedido.estado]}
        </span>
      </div>

      <p className="mb-2 text-sm text-brand-black/70">
        {pedido.modalidad === "retiro"
          ? "Retiro en el local"
          : pedido.aCoordinar
            ? `Delivery a coordinar — ${pedido.direccion}`
            : `Delivery a ${pedido.direccion} (${pedido.zonaNombre})`}
      </p>

      <ul className="mb-2 flex flex-col gap-1 text-sm">
        {pedido.items.map((item, indice) => (
          <li key={indice}>
            {item.cantidad}x {item.nombre} — {formatearPrecio(item.precioUnitario * item.cantidad)}
            {item.nota && <span className="text-brand-black/60"> ({item.nota})</span>}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <span className="text-sm text-brand-black/60">{formatearHora(pedido.creadoEn)}</span>
        <span className="font-bold text-brand-orange-burnt">{formatearPrecio(pedido.total)}</span>
      </div>

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}

      {onAvanzar && proximoEstado && (
        <button
          type="button"
          onClick={manejarAvanzar}
          disabled={avanzando}
          className="mt-3 w-full rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Siguiente: {ETIQUETAS_ESTADO[proximoEstado]}
        </button>
      )}
    </div>
  );
}
