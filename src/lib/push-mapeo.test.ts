import { describe, it, expect } from "vitest";
import { armarPayloadPush, endpointsInvalidos } from "./push-mapeo";
import { formatearPrecio } from "./formato-pedido";

describe("armarPayloadPush", () => {
  it("arma título, cuerpo con nombre y total formateado, y la url del panel", () => {
    const payload = armarPayloadPush({ clienteNombre: "Juan Pérez", total: 8500 });
    expect(payload).toEqual({
      title: "Pedido nuevo",
      body: `Juan Pérez — ${formatearPrecio(8500)}`,
      url: "/admin/pedidos",
    });
  });
});

describe("endpointsInvalidos", () => {
  it("devuelve solo los endpoints con status 404 o 410", () => {
    const resultados = [
      { endpoint: "a", statusCode: 201 },
      { endpoint: "b", statusCode: 410 },
      { endpoint: "c", statusCode: 404 },
      { endpoint: "d", statusCode: null },
    ];
    expect(endpointsInvalidos(resultados)).toEqual(["b", "c"]);
  });

  it("devuelve una lista vacía si ninguna está vencida", () => {
    expect(endpointsInvalidos([{ endpoint: "a", statusCode: 201 }])).toEqual([]);
  });
});
