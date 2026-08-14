"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  ItemCarrito,
  agregarItem,
  quitarItem,
  actualizarCantidad,
  calcularSubtotal,
} from "@/lib/cart";

const STORAGE_KEY = "percy-burger-carrito";

interface CartContextValue {
  items: ItemCarrito[];
  subtotal: number;
  agregar: (item: ItemCarrito) => void;
  quitar: (id: string) => void;
  actualizarCantidad: (id: string, cantidad: number) => void;
  vaciar: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time localStorage hydration on mount; lazy initializer not viable due to SSR
      if (guardado) setItems(JSON.parse(guardado));
    } catch {
      // localStorage no disponible (ej. modo privado estricto): el carrito sigue en memoria
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage no disponible: no se persiste, pero la sesión sigue funcionando
    }
  }, [items, hidratado]);

  const value: CartContextValue = {
    items,
    subtotal: calcularSubtotal(items),
    agregar: (item) => setItems((actuales) => agregarItem(actuales, item)),
    quitar: (id) => setItems((actuales) => quitarItem(actuales, id)),
    actualizarCantidad: (id, cantidad) => setItems((actuales) => actualizarCantidad(actuales, id, cantidad)),
    vaciar: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
