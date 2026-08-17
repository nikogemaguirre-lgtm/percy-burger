import { describe, it, expect } from "vitest";
import { construirFilaPedido } from "./pedidos";
import type { ItemCarrito } from "./cart";
import type { DatosCheckout } from "./whatsapp";

const items: ItemCarrito[] = [
  { id: "cheese-burger-simple", nombre: "Cheese Burger (Simple)", precioUnitario: 8500, cantidad: 2, nota: "sin cebolla" },
  { id: "papas", nombre: "Papas", precioUnitario: 3500, cantidad: 1 },
];

describe("construirFilaPedido", () => {
  it("arma la fila de pedido y los items para delivery con zona", () => {
    const datos: DatosCheckout = {
      nombre: "Juan Pérez",
      telefono: "2611234567",
      modalidad: "delivery",
      direccion: "Falucho 123",
      zonaNombre: "Dorrego",
      aCoordinar: false,
    };

    const resultado = construirFilaPedido(items, 20500, 1500, datos);

    expect(resultado.pedido).toEqual({
      cliente_nombre: "Juan Pérez",
      cliente_telefono: "2611234567",
      modalidad: "delivery",
      direccion: "Falucho 123",
      zona_nombre: "Dorrego",
      a_coordinar: false,
      costo_envio: 1500,
      subtotal: 20500,
      total: 22000,
    });
    expect(resultado.items).toEqual([
      { nombre: "Cheese Burger (Simple)", precio_unitario: 8500, cantidad: 2, nota: "sin cebolla" },
      { nombre: "Papas", precio_unitario: 3500, cantidad: 1, nota: null },
    ]);
  });

  it("arma la fila de pedido para delivery a coordinar (sin zona)", () => {
    const datos: DatosCheckout = {
      nombre: "Ana Gómez",
      telefono: "2617654321",
      modalidad: "delivery",
      direccion: "Ruta 40 km 12",
      aCoordinar: true,
    };

    const resultado = construirFilaPedido(items, 20500, 0, datos);

    expect(resultado.pedido).toEqual({
      cliente_nombre: "Ana Gómez",
      cliente_telefono: "2617654321",
      modalidad: "delivery",
      direccion: "Ruta 40 km 12",
      zona_nombre: null,
      a_coordinar: true,
      costo_envio: 0,
      subtotal: 20500,
      total: 20500,
    });
  });

  it("arma la fila de pedido para retiro en el local (sin dirección ni zona)", () => {
    const datos: DatosCheckout = {
      nombre: "Marcos Díaz",
      telefono: "2619988776",
      modalidad: "retiro",
    };

    const resultado = construirFilaPedido(items, 20500, 0, datos);

    expect(resultado.pedido).toEqual({
      cliente_nombre: "Marcos Díaz",
      cliente_telefono: "2619988776",
      modalidad: "retiro",
      direccion: null,
      zona_nombre: null,
      a_coordinar: false,
      costo_envio: 0,
      subtotal: 20500,
      total: 20500,
    });
  });
});
