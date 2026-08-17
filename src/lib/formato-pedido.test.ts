import { describe, it, expect } from "vitest";
import { formatearPrecio, formatearHora } from "./formato-pedido";

describe("formatearPrecio", () => {
  it("formatea un número como moneda argentina sin decimales", () => {
    expect(formatearPrecio(8500)).toMatch(/^\$\s?8\.500$/);
  });
});

describe("formatearHora", () => {
  it("formatea una fecha ISO como día/mes, hora:minuto", () => {
    expect(formatearHora("2026-08-17T15:30:00.000Z")).toMatch(/^\d{1,2}\/\d{1,2}, \d{2}:\d{2}/);
  });
});
