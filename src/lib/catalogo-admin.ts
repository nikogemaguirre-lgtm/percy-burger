import type { Producto, Combo, ComboItem } from "@/data/types";

export interface ProductoInput {
  categoria: Producto["categoria"];
  nombre: string;
  ingredientes: string;
  precios: Producto["precios"];
  imagenUrl: string;
}

export interface ComboInput {
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  activo: boolean;
  productos: ComboItem[];
}

export function combosQueUsanProducto(combos: Combo[], productoId: string): Combo[] {
  return combos.filter((combo) => combo.productos.some((item) => item.productoId === productoId));
}

export function validarProducto(input: ProductoInput): string | null {
  if (!input.nombre.trim()) return "El nombre es obligatorio.";
  if (!input.precios.simple || input.precios.simple <= 0) return "El precio simple debe ser mayor a 0.";
  return null;
}

export function validarCombo(input: ComboInput): string | null {
  if (!input.nombre.trim()) return "El nombre es obligatorio.";
  if (!input.precio || input.precio <= 0) return "El precio debe ser mayor a 0.";
  return null;
}

const TIPOS_IMAGEN_ACEPTADOS = ["image/jpeg", "image/png", "image/webp"];
const TAMAÑO_MAXIMO_IMAGEN = 5 * 1024 * 1024;

export function validarImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN_ACEPTADOS.includes(archivo.type)) return "La imagen debe ser JPG, PNG o WEBP.";
  if (archivo.size > TAMAÑO_MAXIMO_IMAGEN) return "La imagen no puede pesar más de 5MB.";
  return null;
}
