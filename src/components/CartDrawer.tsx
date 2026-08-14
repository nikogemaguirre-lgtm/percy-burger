"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function formatearPrecio(valor: number): string {
  return valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function CartDrawer() {
  const { items, subtotal } = useCart();
  const cantidadTotal = items.reduce((acc, item) => acc + item.cantidad, 0);

  if (cantidadTotal === 0) return null;

  return (
    <Link
      href="/carrito"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-brand-black px-5 py-3 text-white shadow-lg"
    >
      <span className="font-semibold">
        {cantidadTotal} {cantidadTotal === 1 ? "ítem" : "ítems"}
      </span>
      <span className="font-bold text-brand-yellow">{formatearPrecio(subtotal)}</span>
    </Link>
  );
}
