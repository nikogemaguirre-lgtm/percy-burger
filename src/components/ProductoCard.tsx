"use client";

import { useState } from "react";
import { Producto, Tamaño } from "@/data/types";
import { useCart } from "@/context/CartContext";
import { ImagenProducto } from "./ImagenProducto";

const ETIQUETAS_TAMAÑO: Record<Tamaño, string> = {
  simple: "Simple",
  doble: "Doble",
  triple: "Triple",
};

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function ProductoCard({ producto }: { producto: Producto }) {
  const tamañosDisponibles = Object.keys(producto.precios) as Tamaño[];
  const [tamaño, setTamaño] = useState<Tamaño>(tamañosDisponibles[0]);
  const { agregar } = useCart();

  const precio = producto.precios[tamaño]!;

  return (
    <div className="flex flex-col rounded-lg border border-brand-black/10 bg-white p-4 shadow-sm">
      <ImagenProducto src={producto.imagenUrl} nombre={producto.nombre} />
      <h3 className="text-lg font-semibold text-brand-black">{producto.nombre}</h3>
      <p className="mb-3 flex-1 text-sm text-brand-black/70">{producto.ingredientes}</p>
      {tamañosDisponibles.length > 1 && (
        <div className="mb-3 flex gap-2">
          {tamañosDisponibles.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTamaño(t)}
              className={`rounded-full border px-3 py-1 text-sm ${
                t === tamaño
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-brand-black/20 text-brand-black"
              }`}
            >
              {ETIQUETAS_TAMAÑO[t]}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-brand-orange-burnt">{formatearPrecio(precio)}</span>
        <button
          type="button"
          onClick={() =>
            agregar({
              id: `${producto.id}-${tamaño}`,
              nombre: `${producto.nombre} (${ETIQUETAS_TAMAÑO[tamaño]})`,
              tamaño,
              precioUnitario: precio,
              cantidad: 1,
              imagenUrl: producto.imagenUrl,
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
