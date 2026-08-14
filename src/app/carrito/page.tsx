"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default function CarritoPage() {
  const { items, subtotal, actualizarCantidad, quitar } = useCart();

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
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 border-b border-brand-black/10 pb-4"
          >
            <div>
              <p className="font-semibold text-brand-black">{item.nombre}</p>
              <p className="text-sm text-brand-black/60">{formatearPrecio(item.precioUnitario)} c/u</p>
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
          </li>
        ))}
      </ul>
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
