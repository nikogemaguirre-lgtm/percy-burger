import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ from: mockFrom }),
}));

import { construirFilaPedido, guardarPedido } from "./pedidos";
import type { ItemCarrito } from "./cart";
import type { DatosCheckout } from "./whatsapp";

beforeEach(() => {
  mockFrom.mockReset();
});

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

describe("guardarPedido", () => {
  const datos: DatosCheckout = {
    nombre: "Juan Pérez",
    telefono: "2611234567",
    modalidad: "retiro",
  };

  it("inserta el pedido y sus items en orden", async () => {
    const singlePedido = vi.fn().mockResolvedValue({ data: { id: "pedido-1" }, error: null });
    const selectPedido = vi.fn(() => ({ single: singlePedido }));
    const insertPedido = vi.fn(() => ({ select: selectPedido }));
    const insertItems = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "pedidos") return { insert: insertPedido };
      if (tabla === "pedido_items") return { insert: insertItems };
      throw new Error(`tabla inesperada: ${tabla}`);
    });

    await guardarPedido(items, 20500, 0, datos);

    expect(insertPedido).toHaveBeenCalledWith(
      expect.objectContaining({ cliente_nombre: "Juan Pérez", modalidad: "retiro" }),
    );
    expect(insertItems).toHaveBeenCalledWith([
      { pedido_id: "pedido-1", nombre: "Cheese Burger (Simple)", precio_unitario: 8500, cantidad: 2, nota: "sin cebolla" },
      { pedido_id: "pedido-1", nombre: "Papas", precio_unitario: 3500, cantidad: 1, nota: null },
    ]);
  });

  it("no lanza si falla el insert de pedidos", async () => {
    const singlePedido = vi.fn().mockResolvedValue({ data: null, error: { message: "fallo" } });
    const selectPedido = vi.fn(() => ({ single: singlePedido }));
    const insertPedido = vi.fn(() => ({ select: selectPedido }));
    mockFrom.mockReturnValue({ insert: insertPedido });

    await expect(guardarPedido(items, 20500, 0, datos)).resolves.toBeUndefined();
  });

  it("no lanza si falla el insert de pedido_items", async () => {
    const singlePedido = vi.fn().mockResolvedValue({ data: { id: "pedido-1" }, error: null });
    const selectPedido = vi.fn(() => ({ single: singlePedido }));
    const insertPedido = vi.fn(() => ({ select: selectPedido }));
    const insertItems = vi.fn().mockResolvedValue({ error: { message: "fallo" } });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "pedidos") return { insert: insertPedido };
      if (tabla === "pedido_items") return { insert: insertItems };
      throw new Error(`tabla inesperada: ${tabla}`);
    });

    await expect(guardarPedido(items, 20500, 0, datos)).resolves.toBeUndefined();
  });
});
