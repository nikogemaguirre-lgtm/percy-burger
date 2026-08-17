import type { ItemCarrito } from "./cart";
import type { DatosCheckout } from "./whatsapp";
import { createSupabaseBrowserClient } from "./supabase/client";

export interface PedidoInsert {
  cliente_nombre: string;
  cliente_telefono: string;
  modalidad: "delivery" | "retiro";
  direccion: string | null;
  zona_nombre: string | null;
  a_coordinar: boolean;
  costo_envio: number;
  subtotal: number;
  total: number;
}

export interface PedidoItemInsert {
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  nota: string | null;
}

export function construirFilaPedido(
  items: ItemCarrito[],
  subtotal: number,
  costoEnvio: number,
  datos: DatosCheckout,
): { pedido: PedidoInsert; items: PedidoItemInsert[] } {
  const pedido: PedidoInsert = {
    cliente_nombre: datos.nombre,
    cliente_telefono: datos.telefono,
    modalidad: datos.modalidad,
    direccion: datos.direccion ?? null,
    zona_nombre: datos.zonaNombre ?? null,
    a_coordinar: datos.aCoordinar ?? false,
    costo_envio: costoEnvio,
    subtotal,
    total: subtotal + costoEnvio,
  };

  const itemsInsert: PedidoItemInsert[] = items.map((item) => ({
    nombre: item.nombre,
    precio_unitario: item.precioUnitario,
    cantidad: item.cantidad,
    nota: item.nota ?? null,
  }));

  return { pedido, items: itemsInsert };
}

export async function guardarPedido(
  items: ItemCarrito[],
  subtotal: number,
  costoEnvio: number,
  datos: DatosCheckout,
): Promise<void> {
  try {
    const { pedido, items: itemsInsert } = construirFilaPedido(items, subtotal, costoEnvio, datos);
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.from("pedidos").insert(pedido).select().single();
    if (error || !data) return;

    const { error: errorItems } = await supabase
      .from("pedido_items")
      .insert(itemsInsert.map((item) => ({ ...item, pedido_id: data.id })));
    if (errorItems) return;
  } catch {
    return;
  }
}
