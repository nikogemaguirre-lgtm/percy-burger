import { Producto, Combo } from "@/data/types";
import { createSupabaseServerClient } from "./supabase/server";
import { mapRowAProducto, mapRowACombo, type ProductoRow, type ComboRow } from "./catalogo-mapeo";

export { mapRowAProducto, mapRowACombo, type ProductoRow, type ComboRow };

interface ComboProductoRow {
  producto_id: string;
  cantidad: number;
}

export async function obtenerProductos(): Promise<Producto[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("productos").select("*");
  if (error) throw new Error(`No se pudieron obtener los productos: ${error.message}`);
  return (data as ProductoRow[]).map(mapRowAProducto);
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
