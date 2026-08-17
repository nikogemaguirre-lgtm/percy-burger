import { createSupabaseServerClient } from "./supabase/server";

export type EstadoPedido = "nuevo" | "en_preparacion" | "listo" | "entregado";

export const ORDEN_ESTADOS: EstadoPedido[] = ["nuevo", "en_preparacion", "listo", "entregado"];

export const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  nuevo: "Nuevo",
  en_preparacion: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
};

export function siguienteEstado(estado: EstadoPedido): EstadoPedido | null {
  const indice = ORDEN_ESTADOS.indexOf(estado);
  return indice === ORDEN_ESTADOS.length - 1 ? null : ORDEN_ESTADOS[indice + 1];
}

export interface PedidoConItems {
  id: string;
  estado: EstadoPedido;
  clienteNombre: string;
  clienteTelefono: string;
  modalidad: "delivery" | "retiro";
  direccion: string | null;
  zonaNombre: string | null;
  aCoordinar: boolean;
  costoEnvio: number;
  subtotal: number;
  total: number;
  creadoEn: string;
  items: { nombre: string; precioUnitario: number; cantidad: number; nota: string | null }[];
}

interface PedidoRow {
  id: string;
  estado: EstadoPedido;
  cliente_nombre: string;
  cliente_telefono: string;
  modalidad: "delivery" | "retiro";
  direccion: string | null;
  zona_nombre: string | null;
  a_coordinar: boolean;
  costo_envio: number;
  subtotal: number;
  total: number;
  creado_en: string;
  pedido_items: { nombre: string; precio_unitario: number; cantidad: number; nota: string | null }[];
}

function mapRowAPedido(row: PedidoRow): PedidoConItems {
  return {
    id: row.id,
    estado: row.estado,
    clienteNombre: row.cliente_nombre,
    clienteTelefono: row.cliente_telefono,
    modalidad: row.modalidad,
    direccion: row.direccion,
    zonaNombre: row.zona_nombre,
    aCoordinar: row.a_coordinar,
    costoEnvio: row.costo_envio,
    subtotal: row.subtotal,
    total: row.total,
    creadoEn: row.creado_en,
    items: row.pedido_items.map((item) => ({
      nombre: item.nombre,
      precioUnitario: item.precio_unitario,
      cantidad: item.cantidad,
      nota: item.nota,
    })),
  };
}

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
