import { Producto, Combo, ComboItem } from "@/data/types";
import { createSupabaseServerClient } from "./supabase/server";

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

export async function obtenerProductos(): Promise<Producto[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("productos").select("*");
  if (error) throw new Error(`No se pudieron obtener los productos: ${error.message}`);
  return (data as ProductoRow[]).map(mapRowAProducto);
}

interface ComboProductoRow {
  producto_id: string;
  cantidad: number;
}

export async function obtenerCombos(): Promise<Combo[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("combos").select("*, combo_productos(producto_id, cantidad)");
  if (error) throw new Error(`No se pudieron obtener los combos: ${error.message}`);
  return (data as (ComboRow & { combo_productos: ComboProductoRow[] })[]).map((row) =>
    mapRowACombo(
      row,
      row.combo_productos.map((item) => ({ productoId: item.producto_id, cantidad: item.cantidad })),
    ),
  );
}
