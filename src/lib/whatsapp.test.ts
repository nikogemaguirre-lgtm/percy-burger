import { describe, it, expect } from "vitest";
import { construirTextoPedido, construirUrlWhatsapp } from "./whatsapp";
import { ItemCarrito } from "./cart";

const items: ItemCarrito[] = [
  {
    id: "cheese-burger-simple",
    nombre: "Cheese Burger (Simple)",
    tamaño: "simple",
    precioUnitario: 8500,
    cantidad: 2,
  },
];

describe("construirTextoPedido", () => {
  it("incluye los items, el total y los datos de contacto para delivery", () => {
    const texto = construirTextoPedido(items, 17000, 800, {
      nombre: "Juan",
      telefono: "2611234567",
      modalidad: "delivery",
      direccion: "Calle Falsa 123",
      zonaNombre: "Dorrego",
    });

    expect(texto).toContain("2x Cheese Burger (Simple)");
    expect(texto).toContain("Delivery a: Calle Falsa 123");
    expect(texto).toContain("Zona: Dorrego (envío $800)");
    expect(texto).toContain("Total: $17.800");
    expect(texto).toContain("Nombre: Juan");
    expect(texto).toContain("Teléfono: 2611234567");
  });

  it("marca el envío como a coordinar cuando la zona no matchea", () => {
    const texto = construirTextoPedido(items, 17000, 0, {
      nombre: "Juan",
      telefono: "2611234567",
      modalidad: "delivery",
      direccion: "Calle Falsa 123",
      aCoordinar: true,
    });

    expect(texto).toContain("Zona: a coordinar por WhatsApp");
    expect(texto).toContain("Envío: a coordinar");
  });

  it("usa el texto de retiro en el local cuando la modalidad es retiro", () => {
    const texto = construirTextoPedido(items, 17000, 0, {
      nombre: "Juan",
      telefono: "2611234567",
      modalidad: "retiro",
    });

    expect(texto).toContain("Retiro en el local (Falucho 440, Dorrego, Guaymallén)");
  });
});

describe("construirUrlWhatsapp", () => {
  it("arma la URL de wa.me con el texto codificado", () => {
    const url = construirUrlWhatsapp("Hola");
    expect(url).toBe("https://wa.me/5492616968888?text=Hola");
  });

  it("codifica saltos de línea y espacios", () => {
    const url = construirUrlWhatsapp("Línea 1\nLínea 2");
    expect(url).toContain("text=L%C3%ADnea%201%0AL%C3%ADnea%202");
  });
});
