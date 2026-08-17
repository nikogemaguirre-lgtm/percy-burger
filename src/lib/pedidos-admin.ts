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
