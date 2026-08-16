"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ProductoCard } from "@/components/ProductoCard";
import { logoCompletoUrl } from "@/data/logoPiezas";
import { Producto } from "@/data/types";

const SIN_FOTO = "/placeholder.svg";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function CarritoContenido({ productosExtra }: { productosExtra: Producto[] }) {
  const { items, subtotal, actualizarCantidad, actualizarNota, quitar } = useCart();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="mb-4 text-lg text-brand-black/70">Todavía no agregaste nada al carrito.</p>
        <Link href="/" className="rounded-md bg-brand-red px-4 py-2 font-semibold text-white">
          Ver el menú
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-black">Tu carrito</h1>
      <ul className="mb-6 flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id} className="border-b border-brand-black/10 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {item.imagenUrl && item.imagenUrl !== SIN_FOTO ? (
                  <img
                    src={item.imagenUrl}
                    alt=""
                    className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-brand-black">
                    <img src={logoCompletoUrl} alt="" aria-hidden="true" className="h-6 w-auto opacity-90" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-brand-black">{item.nombre}</p>
                  <p className="text-sm text-brand-black/60">{formatearPrecio(item.precioUnitario)} c/u</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                  className="h-8 w-8 rounded-full border border-brand-black/20 text-brand-black"
                  aria-label={`Quitar una unidad de ${item.nombre}`}
                >
                  −
                </button>
                <span className="w-6 text-center">{item.cantidad}</span>
                <button
                  type="button"
                  onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                  className="h-8 w-8 rounded-full border border-brand-black/20 text-brand-black"
                  aria-label={`Agregar una unidad de ${item.nombre}`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => quitar(item.id)}
                  className="ml-2 text-sm text-brand-red underline"
                >
                  Quitar
                </button>
              </div>
            </div>
            <input
              type="text"
              value={item.nota ?? ""}
              onChange={(e) => actualizarNota(item.id, e.target.value)}
              placeholder="Aclaraciones (opcional) — ej. sin cebolla"
              className="mt-2 w-full rounded-md border border-brand-black/20 px-3 py-1 text-sm"
            />
          </li>
        ))}
      </ul>
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-brand-black">¿Querés agregar algo más?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {productosExtra.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} />
          ))}
        </div>
      </section>
      <div className="mb-6 flex items-center justify-between text-lg font-bold text-brand-black">
        <span>Subtotal</span>
        <span>{formatearPrecio(subtotal)}</span>
      </div>
      <Link
        href="/checkout"
        className="block rounded-md bg-brand-red px-4 py-3 text-center font-semibold text-white"
      >
        Continuar
      </Link>
    </main>
  );
}
