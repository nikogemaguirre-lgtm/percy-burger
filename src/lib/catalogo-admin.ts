import type { Producto, Combo, ComboItem } from "@/data/types";
import { createSupabaseBrowserClient } from "./supabase/client";
import { mapRowAProducto, mapRowACombo, type ProductoRow, type ComboRow } from "./catalogo";

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

export async function crearProducto(input: ProductoInput): Promise<Producto> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("productos")
    .insert({
      categoria: input.categoria,
      nombre: input.nombre,
      ingredientes: input.ingredientes,
      precio_simple: input.precios.simple,
      precio_doble: input.precios.doble ?? null,
      precio_triple: input.precios.triple ?? null,
      imagen_url: input.imagenUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRowAProducto(data as ProductoRow);
}

export async function actualizarProducto(id: string, input: ProductoInput): Promise<Producto> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("productos")
    .update({
      categoria: input.categoria,
      nombre: input.nombre,
      ingredientes: input.ingredientes,
      precio_simple: input.precios.simple,
      precio_doble: input.precios.doble ?? null,
      precio_triple: input.precios.triple ?? null,
      imagen_url: input.imagenUrl,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRowAProducto(data as ProductoRow);
}

export async function borrarProducto(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function crearCombo(input: ComboInput): Promise<Combo> {
  const supabase = createSupabaseBrowserClient();
  const { data: comboData, error: comboError } = await supabase
    .from("combos")
    .insert({
      nombre: input.nombre,
      descripcion: input.descripcion,
      precio: input.precio,
      imagen_url: input.imagenUrl,
      activo: input.activo,
    })
    .select()
    .single();

  if (comboError) throw new Error(comboError.message);
  const combo = comboData as ComboRow;

  if (input.productos.length > 0) {
    const { error: itemsError } = await supabase.from("combo_productos").insert(
      input.productos.map((item) => ({
        combo_id: combo.id,
        producto_id: item.productoId,
        cantidad: item.cantidad,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  return mapRowACombo(combo, input.productos);
}

export async function actualizarCombo(id: string, input: ComboInput): Promise<Combo> {
  const supabase = createSupabaseBrowserClient();
  const { data: comboData, error: comboError } = await supabase
    .from("combos")
    .update({
      nombre: input.nombre,
      descripcion: input.descripcion,
      precio: input.precio,
      imagen_url: input.imagenUrl,
      activo: input.activo,
    })
    .eq("id", id)
    .select()
    .single();

  if (comboError) throw new Error(comboError.message);

  const { error: borrarError } = await supabase.from("combo_productos").delete().eq("combo_id", id);
  if (borrarError) throw new Error(borrarError.message);

  if (input.productos.length > 0) {
    const { error: itemsError } = await supabase.from("combo_productos").insert(
      input.productos.map((item) => ({
        combo_id: id,
        producto_id: item.productoId,
        cantidad: item.cantidad,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  return mapRowACombo(comboData as ComboRow, input.productos);
}

export async function borrarCombo(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("combos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
