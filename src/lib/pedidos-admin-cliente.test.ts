import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFromCliente } = vi.hoisted(() => ({ mockFromCliente: vi.fn() }));

vi.mock("./supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ from: mockFromCliente }),
}));

import {
  obtenerPedidosActivosCliente,
  obtenerPedidosEntregadosCliente,
  avanzarEstadoPedido,
} from "./pedidos-admin-cliente";

beforeEach(() => {
  mockFromCliente.mockReset();
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

describe("obtenerPedidosActivosCliente", () => {
  it("trae los pedidos activos ordenados por fecha ascendente y los mapea", async () => {
    const order = vi.fn().mockResolvedValue({ data: [filaPedido], error: null });
    const in_ = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ in: in_ }));
    mockFromCliente.mockReturnValue({ select });

    const resultado = await obtenerPedidosActivosCliente();

    expect(mockFromCliente).toHaveBeenCalledWith("pedidos");
    expect(select).toHaveBeenCalledWith("*, pedido_items(*)");
    expect(in_).toHaveBeenCalledWith("estado", ["nuevo", "en_preparacion", "listo"]);
    expect(order).toHaveBeenCalledWith("creado_en", { ascending: true });
    expect(resultado[0].clienteNombre).toBe("Juan Pérez");
  });
});

describe("obtenerPedidosEntregadosCliente", () => {
  it("trae los pedidos entregados ordenados por fecha descendente", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ ...filaPedido, estado: "entregado" }], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    mockFromCliente.mockReturnValue({ select });

    const resultado = await obtenerPedidosEntregadosCliente();

    expect(eq).toHaveBeenCalledWith("estado", "entregado");
    expect(order).toHaveBeenCalledWith("creado_en", { ascending: false });
    expect(resultado[0].estado).toBe("entregado");
  });
});

describe("avanzarEstadoPedido", () => {
  it("actualiza el estado al siguiente y lo devuelve", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    mockFromCliente.mockReturnValue({ update });

    const resultado = await avanzarEstadoPedido("pedido-1", "nuevo");

    expect(mockFromCliente).toHaveBeenCalledWith("pedidos");
    expect(update).toHaveBeenCalledWith({ estado: "en_preparacion" });
    expect(eq).toHaveBeenCalledWith("id", "pedido-1");
    expect(resultado).toBe("en_preparacion");
  });

  it("lanza un error si Supabase rechaza la actualización", async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: "fallo" } });
    const update = vi.fn(() => ({ eq }));
    mockFromCliente.mockReturnValue({ update });

    await expect(avanzarEstadoPedido("pedido-1", "nuevo")).rejects.toThrow("fallo");
  });

  it("lanza un error si el pedido ya está entregado", async () => {
    await expect(avanzarEstadoPedido("pedido-1", "entregado")).rejects.toThrow(
      "El pedido ya está en el último estado.",
    );
    expect(mockFromCliente).not.toHaveBeenCalled();
  });
});
