import { describe, it, expect } from "vitest";
import { siguienteEstado } from "./pedidos-mapeo";

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
