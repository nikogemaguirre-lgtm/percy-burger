import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: mockFrom }),
}));

import { siguienteEstado, obtenerPedidosActivos, obtenerPedidosEntregados } from "./pedidos-admin";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("siguienteEstado", () => {
  it("avanza nuevo a en_preparacion", () => {
    expect(siguienteEstado("nuevo")).toBe("en_preparacion");
  });

  it("avanza en_preparacion a listo", () => {
    expect(siguienteEstado("en_preparacion")).toBe("listo");
  });

  it("avanza listo a entregado", () => {
    expect(siguienteEstado("listo")).toBe("entregado");
  });

  it("devuelve null si ya está entregado", () => {
    expect(siguienteEstado("entregado")).toBeNull();
  });
});

const filaPedido = {
  id: "pedido-1",
  estado: "nuevo",
  cliente_nombre: "Juan Pérez",
  cliente_telefono: "2611234567",
  modalidad: "retiro",
  direccion: null,
  zona_nombre: null,
  a_coordinar: false,
  costo_envio: 0,
  subtotal: 8500,
  total: 8500,
  creado_en: "2026-08-17T12:00:00.000Z",
  pedido_items: [{ nombre: "Cheese Burger (Simple)", precio_unitario: 8500, cantidad: 1, nota: null }],
};

describe("obtenerPedidosActivos", () => {
  it("trae los pedidos activos ordenados por fecha ascendente y los mapea", async () => {
    const order = vi.fn().mockResolvedValue({ data: [filaPedido], error: null });
    const in_ = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ in: in_ }));
    mockFrom.mockReturnValue({ select });

    const resultado = await obtenerPedidosActivos();

    expect(mockFrom).toHaveBeenCalledWith("pedidos");
    expect(select).toHaveBeenCalledWith("*, pedido_items(*)");
    expect(in_).toHaveBeenCalledWith("estado", ["nuevo", "en_preparacion", "listo"]);
    expect(order).toHaveBeenCalledWith("creado_en", { ascending: true });
    expect(resultado).toEqual([
      {
        id: "pedido-1",
        estado: "nuevo",
        clienteNombre: "Juan Pérez",
        clienteTelefono: "2611234567",
        modalidad: "retiro",
        direccion: null,
        zonaNombre: null,
        aCoordinar: false,
        costoEnvio: 0,
        subtotal: 8500,
        total: 8500,
        creadoEn: "2026-08-17T12:00:00.000Z",
        items: [{ nombre: "Cheese Burger (Simple)", precioUnitario: 8500, cantidad: 1, nota: null }],
      },
    ]);
  });
});

describe("obtenerPedidosEntregados", () => {
  it("trae los pedidos entregados ordenados por fecha descendente", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ ...filaPedido, estado: "entregado" }], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const resultado = await obtenerPedidosEntregados();

    expect(eq).toHaveBeenCalledWith("estado", "entregado");
    expect(order).toHaveBeenCalledWith("creado_en", { ascending: false });
    expect(resultado[0].estado).toBe("entregado");
  });
});
