import { createSupabaseBrowserClient } from "./supabase/client";
import { mapRowAPedido, siguienteEstado, type EstadoPedido, type PedidoConItems, type PedidoRow } from "./pedidos-mapeo";

export async function obtenerPedidosActivosCliente(): Promise<PedidoConItems[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, pedido_items(*)")
    .in("estado", ["nuevo", "en_preparacion", "listo"])
    .order("creado_en", { ascending: true });
  if (error) throw new Error(`No se pudieron obtener los pedidos activos: ${error.message}`);
  return (data as PedidoRow[]).map(mapRowAPedido);
}

export async function obtenerPedidosEntregadosCliente(): Promise<PedidoConItems[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, pedido_items(*)")
    .eq("estado", "entregado")
    .order("creado_en", { ascending: false });
  if (error) throw new Error(`No se pudieron obtener los pedidos entregados: ${error.message}`);
  return (data as PedidoRow[]).map(mapRowAPedido);
}

export async function avanzarEstadoPedido(id: string, estadoActual: EstadoPedido): Promise<EstadoPedido> {
  const nuevo = siguienteEstado(estadoActual);
  if (!nuevo) throw new Error("El pedido ya está en el último estado.");

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("pedidos").update({ estado: nuevo }).eq("id", id);
  if (error) throw new Error(error.message);

  return nuevo;
}

export function suscribirsePedidos(alCambiar: () => void): () => void {
  const supabase = createSupabaseBrowserClient();
  const canal = supabase
    .channel("pedidos-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
      alCambiar();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}
