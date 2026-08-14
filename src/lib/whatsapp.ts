import { ItemCarrito } from "./cart";

export const NUMERO_WHATSAPP_PERCY = "5492616968888";

export interface DatosCheckout {
  nombre: string;
  telefono: string;
  modalidad: "delivery" | "retiro";
  direccion?: string;
  zonaNombre?: string;
  aCoordinar?: boolean;
}

function formatearPrecio(valor: number): string {
  return `$${valor.toLocaleString("es-AR")}`;
}

export function construirTextoPedido(
  items: ItemCarrito[],
  subtotal: number,
  costoEnvio: number,
  datos: DatosCheckout
): string {
  const lineasItems = items
    .map((item) => `- ${item.cantidad}x ${item.nombre} — ${formatearPrecio(item.precioUnitario * item.cantidad)}`)
    .join("\n");

  const lineasEntrega =
    datos.modalidad === "retiro"
      ? "Retiro en el local (Falucho 440, Dorrego, Guaymallén)"
      : [
          `Delivery a: ${datos.direccion}`,
          datos.aCoordinar
            ? "Zona: a coordinar por WhatsApp"
            : `Zona: ${datos.zonaNombre} (envío ${formatearPrecio(costoEnvio)})`,
        ].join("\n");

  const total = subtotal + costoEnvio;

  return [
    "¡Hola Percy Burger! Quiero hacer este pedido:",
    "",
    lineasItems,
    "",
    lineasEntrega,
    "",
    `Subtotal: ${formatearPrecio(subtotal)}`,
    datos.aCoordinar ? "Envío: a coordinar" : `Envío: ${formatearPrecio(costoEnvio)}`,
    `Total: ${formatearPrecio(total)}`,
    "",
    "Forma de pago: pago al recibir",
    "",
    `Nombre: ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
  ].join("\n");
}

export function construirUrlWhatsapp(texto: string): string {
  return `https://wa.me/${NUMERO_WHATSAPP_PERCY}?text=${encodeURIComponent(texto)}`;
}
