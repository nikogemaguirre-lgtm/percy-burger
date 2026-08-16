import { Tamaño } from "@/data/types";

export interface ItemCarrito {
  id: string;
  nombre: string;
  tamaño?: Tamaño;
  precioUnitario: number;
  cantidad: number;
  nota?: string;
  imagenUrl?: string;
}

export function agregarItem(carrito: ItemCarrito[], item: ItemCarrito): ItemCarrito[] {
  const existente = carrito.find((i) => i.id === item.id);
  if (existente) {
    return carrito.map((i) => (i.id === item.id ? { ...i, cantidad: i.cantidad + item.cantidad } : i));
  }
  return [...carrito, item];
}

export function quitarItem(carrito: ItemCarrito[], id: string): ItemCarrito[] {
  return carrito.filter((i) => i.id !== id);
}

export function actualizarCantidad(carrito: ItemCarrito[], id: string, cantidad: number): ItemCarrito[] {
  if (cantidad <= 0) {
    return quitarItem(carrito, id);
  }
  return carrito.map((i) => (i.id === id ? { ...i, cantidad } : i));
}

export function actualizarNota(carrito: ItemCarrito[], id: string, nota: string): ItemCarrito[] {
  return carrito.map((i) => (i.id === id ? { ...i, nota } : i));
}

export function calcularSubtotal(carrito: ItemCarrito[]): number {
  return carrito.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
}
