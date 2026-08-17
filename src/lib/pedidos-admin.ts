import { createSupabaseServerClient } from "./supabase/server";
import { mapRowAPedido, type PedidoConItems, type PedidoRow } from "./pedidos-mapeo";

export async function obtenerPedidosActivos(): Promise<PedidoConItems[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, pedido_items(*)")
    .in("estado", ["nuevo", "en_preparacion", "listo"])
    .order("creado_en", { ascending: true });
  if (error) throw new Error(`No se pudieron obtener los pedidos activos: ${error.message}`);
  return (data as PedidoRow[]).map(mapRowAPedido);
}

export async function obtenerPedidosEntregados(): Promise<PedidoConItems[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, pedido_items(*)")
    .eq("estado", "entregado")
    .order("creado_en", { ascending: false });
  if (error) throw new Error(`No se pudieron obtener los pedidos entregados: ${error.message}`);
  return (data as PedidoRow[]).map(mapRowAPedido);
}
