"use client";

import { Combo } from "@/data/types";
import { useCart } from "@/context/CartContext";
import { ImagenProducto } from "./ImagenProducto";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function ComboCard({ combo }: { combo: Combo }) {
  const { agregar } = useCart();

  return (
    <div className="flex flex-col rounded-lg border border-brand-yellow bg-brand-yellow/10 p-4 shadow-sm">
      <ImagenProducto src={combo.imagenUrl} nombre={combo.nombre} />
      <h3 className="text-lg font-semibold text-brand-black">{combo.nombre}</h3>
      <p className="mb-3 flex-1 text-sm text-brand-black/70">{combo.descripcion}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-brand-orange-burnt">{formatearPrecio(combo.precio)}</span>
        <button
          type="button"
          onClick={() =>
            agregar({
              id: `combo-${combo.id}`,
              nombre: combo.nombre,
              precioUnitario: combo.precio,
              cantidad: 1,
            })
          }
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
