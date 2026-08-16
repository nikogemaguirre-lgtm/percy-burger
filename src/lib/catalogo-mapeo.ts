import { Producto, Combo, ComboItem } from "@/data/types";

export interface ProductoRow {
  id: string;
  categoria: Producto["categoria"];
  nombre: string;
  ingredientes: string;
  precio_simple: number;
  precio_doble: number | null;
  precio_triple: number | null;
  imagen_url: string;
}

export interface ComboRow {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
  activo: boolean;
}

export function mapRowAProducto(row: ProductoRow): Producto {
  const precios: Producto["precios"] = { simple: row.precio_simple };
  if (row.precio_doble != null) precios.doble = row.precio_doble;
  if (row.precio_triple != null) precios.triple = row.precio_triple;

  return {
    id: row.id,
    categoria: row.categoria,
    nombre: row.nombre,
    ingredientes: row.ingredientes,
    precios,
    imagenUrl: row.imagen_url,
  };
}

export function mapRowACombo(row: ComboRow, productos: ComboItem[] = []): Combo {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: row.precio,
    imagenUrl: row.imagen_url,
    activo: row.activo,
    productos,
  };
}
